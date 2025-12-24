"""
配置文件
"""
import os
from pathlib import Path

from dotenv import load_dotenv

# Load .env from repo root so env vars are available at import time.
BASE_DIR = Path(__file__).resolve().parents[1]
load_dotenv(BASE_DIR / ".env")

# 豆包AI配置
# ⚠️ 不要在代码仓库中硬编码真实 Key，请通过环境变量 ARK_API_KEY 注入。
ARK_API_KEY = os.getenv("ARK_API_KEY")
ARK_BASE_URL = os.getenv("ARK_BASE_URL", "https://ark.cn-beijing.volces.com/api/v3")
ARK_MODEL_NAME = os.getenv("ARK_MODEL_NAME", "doubao-seed-1-6-251015")

# 文件存储配置
UPLOAD_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "uploads")
DATA_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "data")

# 确保目录存在
os.makedirs(UPLOAD_DIR, exist_ok=True)
os.makedirs(DATA_DIR, exist_ok=True)

# 数据库配置
DATABASE_URL = f"sqlite:///{os.path.join(DATA_DIR, 'app.db')}"
