@echo off
echo ========================================
echo   Excel 工作流处理系统 - 启动脚本
echo ========================================
echo.

REM 检查Python虚拟环境
if not exist "backend\venv" (
    echo [1/4] 创建Python虚拟环境...
    cd backend
    python -m venv venv
    cd ..
)

REM 激活虚拟环境并安装依赖
echo [2/4] 安装后端依赖...
cd backend
call venv\Scripts\activate.bat
pip install -r requirements.txt -q
cd ..

REM 检查node_modules
if not exist "frontend\node_modules" (
    echo [3/4] 安装前端依赖...
    cd frontend
    npm install
    cd ..
) else (
    echo [3/4] 前端依赖已安装
)

echo [4/4] 启动服务...
echo.
echo 后端服务: http://localhost:8000
echo 前端服务: http://localhost:3000
echo.
echo 按 Ctrl+C 停止服务
echo ========================================

REM 启动后端
start "Excel Workflow Backend" cmd /k "cd backend && venv\Scripts\activate.bat && python -m uvicorn main:app --reload --host 0.0.0.0 --port 8000"

REM 等待后端启动
timeout /t 3 /nobreak > nul

REM 启动前端
cd frontend
npm run dev
