"""
数据库连接和会话管理
"""
import os
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker, DeclarativeBase


DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./aixue.db")

if DATABASE_URL.startswith("postgresql"):
    engine = create_engine(DATABASE_URL, connect_args={
        "connect_timeout": 10,
        "sslmode": "require",
    })
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
    try:
        with engine.connect() as conn:
            if DATABASE_URL.startswith("postgresql"):
                conn.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS api_key VARCHAR(200)"))
            else:
                conn.execute(text("ALTER TABLE users ADD COLUMN api_key VARCHAR(200)"))
            conn.commit()
    except Exception:
        pass
