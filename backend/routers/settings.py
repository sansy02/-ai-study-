"""
系统设置 API — API Key 管理等
每人可设置自己的 API Key；管理员 Key 存环境变量 AI_API_KEY
"""
import os
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from pydantic import BaseModel
from database import get_db, SessionLocal
from models.models import User
from routers.auth import get_current_user

router = APIRouter(prefix="/api/settings", tags=["settings"])


class ApiKeyRequest(BaseModel):
    api_key: str


@router.post("/api-key")
async def set_api_key(req: ApiKeyRequest, user_id: int = Depends(get_current_user), db: Session = Depends(get_db)):
    """设置当前用户的 API Key"""
    user = db.query(User).filter(User.id == user_id).first()
    if user:
        user.api_key = req.api_key.strip()
        db.commit()
    return {"status": "ok", "message": "API Key 已保存到你的账号"}


@router.get("/api-key/status")
async def check_api_key(user_id: int = Depends(get_current_user), db: Session = Depends(get_db)):
    """检查用户是否配置了 API Key（自己的或管理员的）"""
    user = db.query(User).filter(User.id == user_id).first()
    has_own_key = bool(user and user.api_key)
    env_key = os.getenv("AI_API_KEY", "")
    has_admin_key = bool(env_key and env_key != "your-api-key-here")
    return {
        "configured": has_own_key or has_admin_key,
        "source": "user" if has_own_key else ("admin" if has_admin_key else "none"),
    }


def get_api_key(user_id: int | None = None) -> str:
    """
    获取 API Key 优先级：
    1. 用户自己设置的 Key（存在 User 表里）
    2. 管理员 Key（环境变量 AI_API_KEY）
    3. 报错
    """
    # 先查用户自己的 Key
    if user_id:
        db = SessionLocal()
        try:
            user = db.query(User).filter(User.id == user_id).first()
            if user and user.api_key:
                return user.api_key
        finally:
            db.close()

    # 再查管理员 Key
    env_key = os.getenv("AI_API_KEY", "")
    if env_key and env_key != "your-api-key-here":
        return env_key

    return "your-api-key-here"
