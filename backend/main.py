"""
FastAPI 应用入口
"""
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

from routers import excel, workflow, ai
from routers import vision
from database import init_db, migrate_legacy_owner
from utils.anon_id import COOKIE_NAME, COOKIE_MAX_AGE, get_or_create


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


@app.middleware("http")
async def anon_owner_middleware(request: Request, call_next):
    owner_id, cookie_value = get_or_create(request.cookies.get(COOKIE_NAME))
    request.state.owner_id = owner_id
    if cookie_value:
        await migrate_legacy_owner(owner_id)
    response = await call_next(request)
    if cookie_value:
        response.set_cookie(
            key=COOKIE_NAME,
            value=cookie_value,
            max_age=COOKIE_MAX_AGE,
            httponly=True,
            samesite="lax",
            secure=request.url.scheme == "https",
            path="/",
        )
    return response

# 注册路由
app.include_router(excel.router, prefix="/api/excel", tags=["Excel"])
app.include_router(workflow.router, prefix="/api/workflow", tags=["Workflow"])
app.include_router(ai.router, prefix="/api/ai", tags=["AI"])
app.include_router(vision.router, prefix="/api/vision", tags=["Vision"])


@app.get("/")
async def root():
    return {"message": "Excel工作流处理系统 API", "version": "1.0.0"}


@app.get("/health")
async def health():
    return {"status": "healthy"}
