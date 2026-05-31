"""
学生画像 & 功能偏好 API
"""
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from pydantic import BaseModel
from database import get_db
from models.models import StudentProfile, FeaturePreference, User
from routers.auth import get_current_user

router = APIRouter(prefix="/api", tags=["profile"])


# ---- 请求模型 ----

class ProfileRequest(BaseModel):
    grade: str = ""          # 大一~大四/研一~研三/其他
    major: str = ""          # 专业名称
    subject: str = ""        # 想学的学科方向


class PreferenceRequest(BaseModel):
    show_english: bool = True
    show_practice: bool = True
    show_wrong_book: bool = True


# ---- 学生画像 ----

@router.post("/profile")
async def save_profile(req: ProfileRequest, user_id: int = Depends(get_current_user), db: Session = Depends(get_db)):
    """保存学生画像（同步更新 User 表 + 创建快照）"""
    # 同步到 User 表
    user = db.query(User).filter(User.id == user_id).first()
    if user:
        if req.grade: user.grade = req.grade
        if req.major: user.major = req.major
        if req.subject: user.subject = req.subject
    # 同时创建 StudentProfile 快照
    profile = StudentProfile(
        grade=req.grade,
        major=req.major,
        subject=req.subject,
        user_id=user_id,
    )
    db.add(profile)
    db.commit()
    db.refresh(profile)
    return {"id": profile.id, "grade": profile.grade, "major": profile.major, "subject": profile.subject}


@router.get("/profile/latest")
async def get_latest_profile(user_id: int = Depends(get_current_user), db: Session = Depends(get_db)):
    """获取当前用户最近一次保存的学生画像（优先快照，回退到 User 表）"""
    profile = db.query(StudentProfile).filter(StudentProfile.user_id == user_id).order_by(StudentProfile.id.desc()).first()
    if profile:
        return {"id": profile.id, "grade": profile.grade, "major": profile.major, "subject": profile.subject}
    user = db.query(User).filter(User.id == user_id).first()
    if user:
        return {"id": None, "grade": user.grade or "", "major": user.major or "", "subject": user.subject or ""}
    return {"id": None, "grade": "", "major": "", "subject": ""}


# ---- 功能偏好 ----

@router.post("/preferences")
async def save_preferences(req: PreferenceRequest, user_id: int = Depends(get_current_user), db: Session = Depends(get_db)):
    """保存功能偏好"""
    pref = FeaturePreference(
        show_english=req.show_english,
        show_practice=req.show_practice,
        show_wrong_book=req.show_wrong_book,
        user_id=user_id,
    )
    db.add(pref)
    db.commit()
    db.refresh(pref)
    return {"id": pref.id, "show_english": pref.show_english, "show_practice": pref.show_practice, "show_wrong_book": pref.show_wrong_book}


@router.get("/preferences/latest")
async def get_latest_preferences(user_id: int = Depends(get_current_user), db: Session = Depends(get_db)):
    """获取当前用户最近一次保存的偏好"""
    pref = db.query(FeaturePreference).filter(FeaturePreference.user_id == user_id).order_by(FeaturePreference.id.desc()).first()
    if not pref:
        return {"id": None, "show_english": True, "show_practice": True, "show_wrong_book": True}
    return {"id": pref.id, "show_english": pref.show_english, "show_practice": pref.show_practice, "show_wrong_book": pref.show_wrong_book}
