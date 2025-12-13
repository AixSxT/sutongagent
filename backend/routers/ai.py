"""
AI对话API - 将自然语言转换为工作流
"""
import json
import logging
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Dict, List, Any, Optional
from services.ai_service import ai_service
from services.ai_chat_service import ai_chat_service
from services.excel_service import ExcelService

router = APIRouter()
excel_service = ExcelService()
logger = logging.getLogger(__name__)


class GenerateWorkflowRequest(BaseModel):
    """生成工作流请求"""
    user_input: str
    file_ids: Optional[List[str]] = []


class ExplainWorkflowRequest(BaseModel):
    """解释工作流请求"""
    workflow_config: Dict[str, Any]


# ============ 新增：AI对话模式 ============

class ChatStartRequest(BaseModel):
    """开始对话请求"""
    selected_files: List[dict]  # [{"file_id": "xxx", "sheet_name": "Sheet1"}, ...]


class ChatMessageRequest(BaseModel):
    """发送消息请求"""
    session_id: str
    message: str


class ChatGenerateRequest(BaseModel):
    """确认生成请求"""
    session_id: str


@router.post("/chat/start")
async def chat_start(request: ChatStartRequest):
    """
    开始AI对话会话
    用户选择表后调用，AI会看到表结构
    """
    logger.info(f"[AI-Chat] 开始对话，选择的文件: {request.selected_files}")
    
    if not request.selected_files:
        raise HTTPException(status_code=400, detail="请至少选择一个数据表")
    
    # 获取文件元数据（列名、样例数据）
    file_metadata = []
    for selection in request.selected_files:
        file_id = selection.get("file_id")
        sheet_name = selection.get("sheet_name")
        
        logger.debug(f"[AI-Chat] 获取文件元数据: file_id={file_id}, sheet={sheet_name}")
        
        try:
            file_record = await excel_service.get_file_record(file_id)
            if file_record:
                sheets = file_record.get("sheets", "[]")
                if isinstance(sheets, str):
                    sheets = json.loads(sheets)
                
                # 找到指定sheet的信息
                sheet_info = next((s for s in sheets if s.get("name") == sheet_name), None)
                
                if sheet_info:
                    file_metadata.append({
                        "file_id": file_id,
                        "filename": file_record["original_name"],
                        "sheet_name": sheet_name,
                        "columns": sheet_info.get("columns", []),
                        "row_count": sheet_info.get("row_count", 0),
                        "sample_data": sheet_info.get("sample_data", [])[:3]
                    })
                    logger.debug(f"[AI-Chat] 获取成功: {file_record['original_name']}/{sheet_name}, {len(sheet_info.get('columns', []))}列")
        except Exception as e:
            logger.error(f"[AI-Chat] 获取文件元数据失败: {e}")
    
    if not file_metadata:
        raise HTTPException(status_code=400, detail="无法获取所选表的信息")
    
    # 启动对话
    result = ai_chat_service.start_session(request.selected_files, file_metadata)
    logger.info(f"[AI-Chat] 对话已开始: session_id={result.get('session_id')}")
    
    return result


@router.post("/chat/message")
async def chat_message(request: ChatMessageRequest):
    """
    发送消息到AI对话
    """
    logger.info(f"[AI-Chat] 收到消息: session={request.session_id}, msg={request.message[:50]}...")
    
    if not request.message.strip():
        raise HTTPException(status_code=400, detail="消息不能为空")
    
    result = ai_chat_service.send_message(request.session_id, request.message)
    
    if result.get("status") == "error":
        raise HTTPException(status_code=400, detail=result.get("error", "发送失败"))
    
    logger.info(f"[AI-Chat] AI回复状态: {result.get('status')}")
    return result


@router.post("/chat/generate")
async def chat_generate(request: ChatGenerateRequest):
    """
    确认生成工作流
    """
    logger.info(f"[AI-Chat] 确认生成: session={request.session_id}")
    
    result = ai_chat_service.generate_workflow(request.session_id)
    
    if result.get("status") == "error":
        raise HTTPException(status_code=400, detail=result.get("error", "生成失败"))
    
    logger.info(f"[AI-Chat] 工作流生成完成")
    return result


# ============ 原有API ============

@router.post("/generate-workflow")
async def generate_workflow(request: GenerateWorkflowRequest):
    """
    根据自然语言描述生成工作流（一次性模式）
    """
    import traceback
    
    logger.info(f"收到AI生成请求: user_input={request.user_input[:50]}..., file_ids={request.file_ids}")
    
    if not request.user_input.strip():
        raise HTTPException(status_code=400, detail="请输入处理描述")
    
    # 获取文件信息
    files_info = []
    try:
        for file_id in request.file_ids:
            logger.info(f"正在获取文件信息: {file_id}")
            file_record = await excel_service.get_file_record(file_id)
            if file_record:
                sheets = file_record.get("sheets", "[]")
                if isinstance(sheets, str):
                    sheets = json.loads(sheets)
                files_info.append({
                    "file_id": file_id,
                    "filename": file_record["original_name"],
                    "sheets": sheets
                })
        logger.info(f"获取到 {len(files_info)} 个文件信息")
    except Exception as e:
        logger.error(f"获取文件信息失败: {e}")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"获取文件信息失败: {str(e)}")
    
    try:
        logger.info("开始调用AI服务...")
        workflow_config = await ai_service.generate_workflow(
            user_input=request.user_input,
            files_info=files_info
        )
        logger.info(f"AI生成成功，节点数: {len(workflow_config.get('nodes', []))}")
        
        return {
            "success": True,
            "workflow": workflow_config
        }
    except Exception as e:
        logger.error(f"AI服务调用失败: {e}")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"AI服务调用失败: {str(e)}")


@router.post("/explain-workflow")
async def explain_workflow(request: ExplainWorkflowRequest):
    """
    生成工作流的自然语言解释
    """
    try:
        explanation = await ai_service.explain_workflow(request.workflow_config)
        return {
            "explanation": explanation
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"生成解释失败: {str(e)}")
