"""
配置文件
"""
import os

# 豆包AI配置
ARK_API_KEY = os.getenv("ARK_API_KEY", "18e37744-5a95-4f3e-9892-3aed71e45841")
ARK_BASE_URL = os.getenv("ARK_BASE_URL", "https://ark.cn-beijing.volces.com/api/v3")
ARK_MODEL_NAME = os.getenv("ARK_MODEL_NAME", "doubao-seed-1-6-thinking-250715")

# 文件存储配置
UPLOAD_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "uploads")
DATA_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "data")

# 确保目录存在
os.makedirs(UPLOAD_DIR, exist_ok=True)
os.makedirs(DATA_DIR, exist_ok=True)

# 数据库配置
DATABASE_URL = f"sqlite:///{os.path.join(DATA_DIR, 'app.db')}"
