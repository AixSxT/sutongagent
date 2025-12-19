"""
Vision API - 识图提取（多模态大模型）
"""

import asyncio
import base64
import json
import time
import uuid
from dataclasses import dataclass
from typing import Any, Optional

from fastapi import APIRouter, File, Form, HTTPException, Request, UploadFile
from fastapi.responses import StreamingResponse

from config import ARK_API_KEY, ARK_BASE_URL, ARK_MODEL_NAME
from openai import AsyncOpenAI  # type: ignore

router = APIRouter()


def _to_data_url(image_bytes: bytes, content_type: Optional[str]) -> str:
    mime = (content_type or "").strip() or "image/jpeg"
    b64 = base64.b64encode(image_bytes).decode("ascii")
    return f"data:{mime};base64,{b64}"


def _sse(event: str, data: Any) -> str:
    payload = json.dumps(data, ensure_ascii=False)
    return f"event: {event}\ndata: {payload}\n\n"


@dataclass
class _Job:
    id: str
    created_at: float
    queue: "asyncio.Queue[dict]"
    task: Optional[asyncio.Task]
    cancelled: bool = False
    seq: int = 0
    text_acc: str = ""
    stage: str = "idle"


_JOBS: dict[str, _Job] = {}


def _require_key() -> None:
    if not ARK_API_KEY:
        raise HTTPException(status_code=500, detail="ARK_API_KEY 未配置")


def _validate_image_upload(file: UploadFile, image_bytes: bytes) -> None:
    if not file.content_type or not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="仅支持上传图片文件")
    if not image_bytes:
        raise HTTPException(status_code=400, detail="图片为空")
    if len(image_bytes) > 8 * 1024 * 1024:
        raise HTTPException(status_code=413, detail="图片过大（请小于 8MB）")


def _get_openai_client():
    try:
        return AsyncOpenAI(api_key=ARK_API_KEY, base_url=ARK_BASE_URL, timeout=60.0)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"缺少 openai 依赖: {e}")


async def _emit(job: _Job, event: str, data: dict) -> None:
    job.seq += 1
    payload = dict(data or {})
    payload["seq"] = job.seq
    await job.queue.put({"event": event, "data": payload, "ts": time.time()})


async def _run_job(job: _Job, image_bytes: bytes, content_type: Optional[str], prompt: str) -> None:
    await _emit(job, "stage", {"stage": "upload_received"})
    job.stage = "upload_received"

    client = _get_openai_client()
    data_url = _to_data_url(image_bytes, content_type)
    safe_prompt = (prompt or "").strip() or "请提取图片中的所有文字，按原顺序输出。只输出文字，不要添加解释。"

    await _emit(job, "stage", {"stage": "model_request_started"})
    job.stage = "model_request_started"

    text_acc = ""
    try:
        # Prefer real token streaming if available.
        try:
            stream = await client.chat.completions.create(
                model=ARK_MODEL_NAME,
                messages=[
                    {
                        "role": "user",
                        "content": [
                            {"type": "image_url", "image_url": {"url": data_url}},
                            {"type": "text", "text": safe_prompt},
                        ],
                    }
                ],
                temperature=0.1,
                stream=True,
            )

            await _emit(job, "stage", {"stage": "generating"})
            job.stage = "generating"
            async for chunk in stream:
                if job.cancelled:
                    raise asyncio.CancelledError()
                delta = ""
                try:
                    delta = chunk.choices[0].delta.content or ""
                except Exception:
                    delta = ""
                if delta:
                    text_acc += delta
                    job.text_acc = text_acc
                    await _emit(job, "delta", {"text": delta})
            job.text_acc = text_acc
            job.stage = "done"
            await _emit(job, "done", {"text": text_acc})
            return
        except Exception:
            # Fallback to non-streaming response (still returns stages, but no token deltas).
            await _emit(job, "stage", {"stage": "generating"})
            job.stage = "generating"
            response = await client.chat.completions.create(
                model=ARK_MODEL_NAME,
                messages=[
                    {
                        "role": "user",
                        "content": [
                            {"type": "image_url", "image_url": {"url": data_url}},
                            {"type": "text", "text": safe_prompt},
                        ],
                    }
                ],
                temperature=0.1,
                stream=False,
            )
            text_acc = response.choices[0].message.content or ""
            job.text_acc = text_acc
            job.stage = "done"
            await _emit(job, "done", {"text": text_acc})
            return
    except asyncio.CancelledError:
        job.stage = "cancelled"
        await _emit(job, "cancelled", {"message": "已取消"})
        return
    except Exception as e:
        job.stage = "job_error"
        await _emit(job, "job_error", {"message": f"识图提取失败: {e}"})
        return
    finally:
        job.text_acc = text_acc
        # allow SSE generator to finish, then cleanup
        await asyncio.sleep(0.1)


def _cleanup_job_later(job_id: str, delay_s: float = 1800.0) -> None:
    async def _cleanup():
        await asyncio.sleep(delay_s)
        job = _JOBS.get(job_id)
        if job and job.stage not in {"done", "job_error", "cancelled"}:
            return
        _JOBS.pop(job_id, None)

    try:
        asyncio.create_task(_cleanup())
    except Exception:
        _JOBS.pop(job_id, None)


# -------------------------
# Legacy endpoint (kept)
# -------------------------
@router.post("/extract-text")
async def extract_text(file: UploadFile = File(...), prompt: str = Form("请提取图片中的所有文字，按原顺序输出。只输出文字，不要添加解释。")):
    """
    兼容旧版调用：一次性返回结果（无真实进度）
    """
    _require_key()
    image_bytes = await file.read()
    _validate_image_upload(file, image_bytes)

    client = _get_openai_client()
    data_url = _to_data_url(image_bytes, file.content_type)
    safe_prompt = (prompt or "").strip() or "请提取图片中的所有文字，按原顺序输出。只输出文字，不要添加解释。"

    try:
        response = client.chat.completions.create(
            model=ARK_MODEL_NAME,
            messages=[
                {
                    "role": "user",
                    "content": [
                        {"type": "image_url", "image_url": {"url": data_url}},
                        {"type": "text", "text": safe_prompt},
                    ],
                }
            ],
            temperature=0.1,
        )
        text = response.choices[0].message.content or ""
        return {"status": "success", "text": text}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"识图提取失败: {e}")


# -------------------------
# Job + SSE endpoints
# -------------------------
@router.post("/extract-text/start")
async def extract_text_start(
    file: UploadFile = File(...),
    prompt: str = Form("请提取图片中的所有文字，按原顺序输出。只输出文字，不要添加解释。"),
):
    """
    启动识图任务，返回 job_id；前端可用 SSE 订阅真实阶段与流式输出。
    """
    _require_key()
    image_bytes = await file.read()
    _validate_image_upload(file, image_bytes)

    job_id = uuid.uuid4().hex[:10]
    q: "asyncio.Queue[dict]" = asyncio.Queue()
    job = _Job(id=job_id, created_at=time.time(), queue=q, task=None)
    _JOBS[job_id] = job

    job.task = asyncio.create_task(_run_job(job, image_bytes, file.content_type, prompt))
    _cleanup_job_later(job_id)
    return {"status": "success", "job_id": job_id}


@router.get("/extract-text/events/{job_id}")
async def extract_text_events(job_id: str, request: Request, after: int = 0):
    """
    SSE 事件流：stage/delta/done/job_error/cancelled
    after：可选，续传序号，大于 0 时先推送一次 snapshot
    """
    job = _JOBS.get(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="任务不存在或已过期")

    async def gen():
        yield _sse("stage", {"stage": "connected"})
        if after and job.seq >= after:
            yield _sse(
                "snapshot",
                {
                    "stage": job.stage,
                    "text": job.text_acc,
                    "seq": job.seq,
                    "done": job.stage == "done",
                    "cancelled": job.stage == "cancelled",
                },
            )
        while True:
            if await request.is_disconnected():
                break
            try:
                item = await asyncio.wait_for(job.queue.get(), timeout=5.0)
            except asyncio.TimeoutError:
                yield _sse("ping", {"ts": time.time()})
                continue

            event = item.get("event", "message")
            data = item.get("data", {})
            yield _sse(event, data)

            if event in {"done", "job_error", "cancelled"}:
                break

    return StreamingResponse(gen(), media_type="text/event-stream")


@router.post("/extract-text/cancel/{job_id}")
async def extract_text_cancel(job_id: str):
    job = _JOBS.get(job_id)
    if not job:
        return {"status": "success", "message": "任务不存在或已结束"}

    job.cancelled = True
    job.stage = "cancelled"
    if job.task and not job.task.done():
        job.task.cancel()
    try:
        await _emit(job, "cancelled", {"message": "已取消"})
    except Exception:
        pass
    return {"status": "success", "message": "cancelled"}
