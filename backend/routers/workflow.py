"""
工作流管理API
"""
import os
import uuid
import json
from datetime import datetime
from fastapi import APIRouter, HTTPException
from fastapi.responses import FileResponse
from pydantic import BaseModel
from typing import Dict, List, Any, Optional
from services.workflow_engine import workflow_engine
from services.excel_service import ExcelService
from config import UPLOAD_DIR, DATA_DIR

router = APIRouter()
excel_service = ExcelService()


class WorkflowSaveRequest(BaseModel):
    """保存工作流请求"""
    name: str
    description: Optional[str] = ""
    config: Dict[str, Any]


class WorkflowExecuteRequest(BaseModel):
    """执行工作流请求"""
    workflow_config: Dict[str, Any]
    file_mapping: Dict[str, str]  # file_id -> file_id（用于查找实际路径）


@router.post("/save")
async def save_workflow(request: WorkflowSaveRequest):
    """保存工作流"""
    workflow_id = str(uuid.uuid4())
    
    await workflow_engine.save_workflow(
        workflow_id=workflow_id,
        name=request.name,
        description=request.description,
        config=request.config
    )
    
    return {
        "workflow_id": workflow_id,
        "message": "工作流保存成功"
    }


@router.put("/{workflow_id}")
async def update_workflow(workflow_id: str, request: WorkflowSaveRequest):
    """更新工作流"""
    existing = await workflow_engine.get_workflow(workflow_id)
    if not existing:
        raise HTTPException(status_code=404, detail="工作流不存在")
    
    await workflow_engine.save_workflow(
        workflow_id=workflow_id,
        name=request.name,
        description=request.description,
        config=request.config
    )
    
    return {"message": "工作流更新成功"}


@router.get("/list")
async def list_workflows():
    """获取所有工作流"""
    workflows = await workflow_engine.get_all_workflows()
    return {"workflows": workflows}


@router.get("/{workflow_id}")
async def get_workflow(workflow_id: str):
    """获取单个工作流"""
    workflow = await workflow_engine.get_workflow(workflow_id)
    if not workflow:
        raise HTTPException(status_code=404, detail="工作流不存在")
    return workflow


@router.post("/execute")
async def execute_workflow(request: WorkflowExecuteRequest):
    """
    执行工作流
    
    Args:
        request: 包含工作流配置和文件映射
    """
    try:
        # 执行工作流 (使用新的引擎API)
        result = await workflow_engine.execute_workflow(
            request.workflow_config,
            request.file_mapping
        )
        
        if result.get("success"):
            return result
        else:
            raise HTTPException(status_code=400, detail=result.get("error", "执行失败"))
            
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"执行失败: {str(e)}")


@router.get("/history/list")
async def get_execution_history(limit: int = 50):
    """获取执行历史"""
    history = await workflow_engine.get_execution_history(limit)
    return {"history": history}


@router.get("/download/{filename}")
async def download_result(filename: str):
    """下载结果文件"""
    file_path = os.path.join(UPLOAD_DIR, filename)
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="文件不存在")
    
    return FileResponse(
        path=file_path,
        filename=filename,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    )
