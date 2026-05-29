"""
学生画像 & 功能偏好 API
"""
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from pydantic import BaseModel
from database import get_db
from models.models import StudentProfile, FeaturePreference

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
async def save_profile(req: ProfileRequest, db: Session = Depends(get_db)):
    """保存学生画像"""
    profile = StudentProfile(
        grade=req.grade,
        major=req.major,
        subject=req.subject,
    )
    db.add(profile)
    db.commit()
    db.refresh(profile)
    return {"id": profile.id, "grade": profile.grade, "major": profile.major, "subject": profile.subject}


@router.get("/profile/latest")
async def get_latest_profile(db: Session = Depends(get_db)):
    """获取最近一次保存的学生画像"""
    profile = db.query(StudentProfile).order_by(StudentProfile.id.desc()).first()
    if not profile:
        return {"id": None, "grade": "", "major": "", "subject": ""}
    return {"id": profile.id, "grade": profile.grade, "major": profile.major, "subject": profile.subject}


# ---- 功能偏好 ----

@router.post("/preferences")
async def save_preferences(req: PreferenceRequest, db: Session = Depends(get_db)):
    """保存功能偏好"""
    pref = FeaturePreference(
        show_english=req.show_english,
        show_practice=req.show_practice,
        show_wrong_book=req.show_wrong_book,
    )
    db.add(pref)
    db.commit()
    db.refresh(pref)
    return {"id": pref.id, "show_english": pref.show_english, "show_practice": pref.show_practice, "show_wrong_book": pref.show_wrong_book}


@router.get("/preferences/latest")
async def get_latest_preferences(db: Session = Depends(get_db)):
    """获取最近一次保存的偏好"""
    pref = db.query(FeaturePreference).order_by(FeaturePreference.id.desc()).first()
    if not pref:
        return {"id": None, "show_english": True, "show_practice": True, "show_wrong_book": True}
    return {"id": pref.id, "show_english": pref.show_english, "show_practice": pref.show_practice, "show_wrong_book": pref.show_wrong_book}
