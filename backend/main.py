"""
FastAPI 应用入口
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

from routers import excel, workflow, ai
from database import init_db


@asynccontextmanager
async def lifespan(app: FastAPI):
    """应用生命周期管理"""
    await init_db()
    yield


app = FastAPI(
    title="Excel工作流处理系统",
    description="支持自然语言描述的Excel财务核算工作流系统",
    version="1.0.0",
    lifespan=lifespan
)

# 配置CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 注册路由
app.include_router(excel.router, prefix="/api/excel", tags=["Excel"])
app.include_router(workflow.router, prefix="/api/workflow", tags=["Workflow"])
app.include_router(ai.router, prefix="/api/ai", tags=["AI"])


@app.get("/")
async def root():
    return {"message": "Excel工作流处理系统 API", "version": "1.0.0"}


@app.get("/health")
async def health():
    return {"status": "healthy"}
