"""
Excel文件上传和解析API
"""
import os
import uuid
import json
from fastapi import APIRouter, UploadFile, File, HTTPException
from fastapi.responses import FileResponse
from typing import List
from services.excel_service import ExcelService
from config import UPLOAD_DIR

router = APIRouter()
excel_service = ExcelService()


@router.post("/upload")
async def upload_excel(file: UploadFile = File(...)):
    """
    上传Excel文件
    
    Returns:
        {
            "file_id": "xxx",
            "filename": "原文件名.xlsx",
            "sheets": [...]
        }
    """
    # 验证文件类型
    if not file.filename.endswith(('.xlsx', '.xls')):
        raise HTTPException(status_code=400, detail="只支持Excel文件 (.xlsx, .xls)")
    
    # 生成唯一文件ID
    file_id = str(uuid.uuid4())
    saved_filename = f"{file_id}_{file.filename}"
    file_path = os.path.join(UPLOAD_DIR, saved_filename)
    
    # 保存文件
    content = await file.read()
    with open(file_path, "wb") as f:
        f.write(content)
    
    # 解析Excel获取Sheet信息
    try:
        parsed_info = excel_service.parse_excel(file_path)
    except Exception as e:
        os.remove(file_path)
        raise HTTPException(status_code=400, detail=f"解析Excel失败: {str(e)}")
    
    # 保存文件记录
    await excel_service.save_file_record(
        file_id=file_id,
        filename=saved_filename,
        original_name=file.filename,
        file_path=file_path,
        sheets=parsed_info["sheets"]
    )
    
    return {
        "file_id": file_id,
        "filename": file.filename,
        "sheets": parsed_info["sheets"]
    }


@router.get("/files")
async def get_uploaded_files():
    """获取所有已上传的文件列表"""
    files = await excel_service.get_all_files()
    result = []
    for f in files:
        result.append({
            "file_id": f["id"],
            "filename": f["original_name"],
            "sheets": json.loads(f["sheets"]) if f["sheets"] else [],
            "created_at": f["created_at"]
        })
    return {"files": result}


@router.get("/file/{file_id}")
async def get_file_info(file_id: str):
    """获取单个文件的详细信息"""
    file_record = await excel_service.get_file_record(file_id)
    if not file_record:
        raise HTTPException(status_code=404, detail="文件不存在")
    
    return {
        "file_id": file_record["id"],
        "filename": file_record["original_name"],
        "sheets": json.loads(file_record["sheets"]) if file_record["sheets"] else [],
        "created_at": file_record["created_at"]
    }


@router.get("/file/{file_id}/sheet/{sheet_name}/preview")
async def preview_sheet(file_id: str, sheet_name: str, rows: int = 10):
    """
    预览Sheet数据
    
    Args:
        file_id: 文件ID
        sheet_name: Sheet名称
        rows: 预览行数，默认10行
    """
    file_record = await excel_service.get_file_record(file_id)
    if not file_record:
        raise HTTPException(status_code=404, detail="文件不存在")
    
    try:
        df = excel_service.read_sheet_as_dataframe(file_record["file_path"], sheet_name)
        preview_df = df.head(rows)
        
        return {
            "columns": list(df.columns),
            "data": preview_df.fillna("").to_dict(orient="records"),
            "total_rows": len(df)
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"读取Sheet失败: {str(e)}")


@router.delete("/file/{file_id}")
async def delete_file(file_id: str):
    """删除上传的文件"""
    file_record = await excel_service.get_file_record(file_id)
    if not file_record:
        raise HTTPException(status_code=404, detail="文件不存在")
    
    # 删除物理文件
    if os.path.exists(file_record["file_path"]):
        os.remove(file_record["file_path"])
    
    # 从数据库删除记录
    await excel_service.delete_file_record(file_id)
    
    return {"message": "文件已删除"}
