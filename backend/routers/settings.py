"""
系统设置 API — API Key 管理等
持久化到数据库，服务重启不丢失
"""
import os
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from pydantic import BaseModel
from database import get_db
from models.models import AppSetting

router = APIRouter(prefix="/api/settings", tags=["settings"])


class ApiKeyRequest(BaseModel):
    api_key: str


@router.post("/api-key")
async def set_api_key(req: ApiKeyRequest, db: Session = Depends(get_db)):
    """设置 API Key（持久化到数据库）"""
    setting = db.query(AppSetting).filter(AppSetting.key == "ai_api_key").first()
    if setting:
        setting.value = req.api_key.strip()
    else:
        setting = AppSetting(key="ai_api_key", value=req.api_key.strip())
        db.add(setting)
    db.commit()
    return {"status": "ok", "message": "API Key 已保存"}


@router.get("/api-key/status")
async def check_api_key(db: Session = Depends(get_db)):
    """检查 API Key 是否已配置"""
    env_key = os.getenv("AI_API_KEY", "")
    db_setting = db.query(AppSetting).filter(AppSetting.key == "ai_api_key").first()
    db_key = db_setting.value if db_setting else ""
    has_key = bool(env_key and env_key != "your-api-key-here") or bool(db_key)
    source = "env" if (env_key and env_key != "your-api-key-here") else ("database" if db_key else "none")
    return {"configured": has_key, "source": source}


def get_api_key() -> str:
    """获取当前有效的 API Key（优先环境变量，其次数据库）"""
    env_key = os.getenv("AI_API_KEY", "")
    if env_key and env_key != "your-api-key-here":
        return env_key
    # 从数据库读取（需要手动创建 session）
    from database import SessionLocal
    db = SessionLocal()
    try:
        setting = db.query(AppSetting).filter(AppSetting.key == "ai_api_key").first()
        if setting and setting.value:
            return setting.value
    finally:
        db.close()
    return "your-api-key-here"
