"""
数据库初始化和操作
"""
import aiosqlite
import os
from config import DATA_DIR

DATABASE_PATH = os.path.join(DATA_DIR, "app.db")


async def _ensure_column(db: aiosqlite.Connection, table: str, column: str, column_def: str) -> None:
    cursor = await db.execute(f"PRAGMA table_info({table})")
    rows = await cursor.fetchall()
    await cursor.close()
    existing = {row[1] for row in rows}
    if column not in existing:
        await db.execute(f"ALTER TABLE {table} ADD COLUMN {column_def}")


async def init_db():
    """初始化数据库表"""
    async with aiosqlite.connect(DATABASE_PATH) as db:
        # 工作流表
        await db.execute("""
            CREATE TABLE IF NOT EXISTS workflows (
                id TEXT PRIMARY KEY,
                owner_id TEXT,
                name TEXT NOT NULL,
                description TEXT,
                config TEXT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)
        
        # 执行历史表
        await db.execute("""
            CREATE TABLE IF NOT EXISTS execution_history (
                id TEXT PRIMARY KEY,
                owner_id TEXT,
                workflow_id TEXT,
                input_files TEXT,
                output_file TEXT,
                status TEXT,
                result_summary TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (workflow_id) REFERENCES workflows (id)
            )
        """)
        
        # 上传文件记录表
        await db.execute("""
            CREATE TABLE IF NOT EXISTS uploaded_files (
                id TEXT PRIMARY KEY,
                owner_id TEXT,
                filename TEXT NOT NULL,
                original_name TEXT NOT NULL,
                file_path TEXT NOT NULL,
                sheets TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)

        # 兼容老库：补充 owner_id 列
        await _ensure_column(db, "workflows", "owner_id", "owner_id TEXT")
        await _ensure_column(db, "execution_history", "owner_id", "owner_id TEXT")
        await _ensure_column(db, "uploaded_files", "owner_id", "owner_id TEXT")
        
        await db.commit()


async def get_db():
    """获取数据库连接"""
    return aiosqlite.connect(DATABASE_PATH)


async def migrate_legacy_owner(owner_id: str) -> None:
    """将旧数据（owner_id为空）迁移到当前用户"""
    if not owner_id:
        return
    async with aiosqlite.connect(DATABASE_PATH) as db:
        await db.execute(
            "UPDATE uploaded_files SET owner_id = ? WHERE owner_id IS NULL OR owner_id = ''",
            (owner_id,)
        )
        await db.execute(
            "UPDATE workflows SET owner_id = ? WHERE owner_id IS NULL OR owner_id = ''",
            (owner_id,)
        )
        await db.execute(
            "UPDATE execution_history SET owner_id = ? WHERE owner_id IS NULL OR owner_id = ''",
            (owner_id,)
        )
        await db.commit()
