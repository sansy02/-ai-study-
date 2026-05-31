"""
数据库连接和会话管理
"""
import os
import socket
from urllib.parse import urlparse, urlunparse
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker, DeclarativeBase


DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./aixue.db")

# PostgreSQL 强制使用 IPv4（Render 免费版不支持 IPv6 出站连接）
if DATABASE_URL.startswith("postgresql"):
    pg_connect_args = {}
    parsed = urlparse(DATABASE_URL)
    try:
        # 解析主机名到 IPv4
        addrs = socket.getaddrinfo(parsed.hostname, parsed.port or 5432, socket.AF_INET)
        ipv4 = addrs[0][4][0]
        pg_connect_args["hostaddr"] = ipv4
    except Exception:
        pass  # 解析失败则用默认行为
    engine = create_engine(DATABASE_URL, connect_args=pg_connect_args if pg_connect_args else {})
else:
    engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


class Base(DeclarativeBase):
    pass


def get_db():
    """获取数据库会话（依赖注入用）"""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_db():
    """初始化数据库，创建所有表 + 执行迁移"""
    Base.metadata.create_all(bind=engine)
    # 迁移：为已有 users 表添加 api_key 列（若不存在）
    try:
        with engine.connect() as conn:
            if DATABASE_URL.startswith("postgresql"):
                conn.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS api_key VARCHAR(200)"))
            else:
                conn.execute(text("ALTER TABLE users ADD COLUMN api_key VARCHAR(200)"))
            conn.commit()
    except Exception:
        pass  # SQLite 中列已存在则忽略
