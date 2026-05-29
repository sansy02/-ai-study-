"""
认证 API — 注册、登录、JWT、用户信息、统计
"""
import os
import datetime
import bcrypt
import jwt
from fastapi import APIRouter, Depends, HTTPException, Header
from sqlalchemy.orm import Session
from pydantic import BaseModel
from database import get_db
from models.models import User, Vocabulary, WrongBook, StudySession, Exercise

router = APIRouter(prefix="/api", tags=["auth"])

JWT_SECRET = os.getenv("JWT_SECRET", "aixue-secret-change-in-production")
JWT_EXPIRE_DAYS = 7


# ---- 请求模型 ----

class RegisterRequest(BaseModel):
    email: str
    password: str
    confirm_password: str
    grade: str = ""
    major: str = ""
    subject: str = ""


class LoginRequest(BaseModel):
    email: str
    password: str


class UpdateProfileRequest(BaseModel):
    grade: str = ""
    major: str = ""
    subject: str = ""


class ChangePasswordRequest(BaseModel):
    old_password: str
    new_password: str


# ---- 工具 ----

def hash_password(pw: str) -> str:
    return bcrypt.hashpw(pw.encode(), bcrypt.gensalt()).decode()

def verify_password(pw: str, hashed: str) -> bool:
    return bcrypt.checkpw(pw.encode(), hashed.encode())

def create_token(user_id: int, email: str) -> str:
    return jwt.encode({
        "user_id": user_id, "email": email,
        "exp": datetime.datetime.utcnow() + datetime.timedelta(days=JWT_EXPIRE_DAYS),
    }, JWT_SECRET, algorithm="HS256")

def get_current_user(authorization: str = Header(default="")) -> int:
    """从 Bearer Token 提取当前用户 ID"""
    if not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="请先登录")
    token = authorization[7:]
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=["HS256"])
        return payload["user_id"]
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="登录已过期，请重新登录")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="无效的登录凭证")


# ---- 注册 ----

@router.post("/auth/register")
async def register(req: RegisterRequest, db: Session = Depends(get_db)):
    if not req.email or "@" not in req.email:
        raise HTTPException(status_code=400, detail="请输入有效的邮箱地址")
    if len(req.password) < 6:
        raise HTTPException(status_code=400, detail="密码至少需要 6 位")
    if req.password != req.confirm_password:
        raise HTTPException(status_code=400, detail="两次输入的密码不一致")

    email = req.email.strip().lower()
    if db.query(User).filter(User.email == email).first():
        raise HTTPException(status_code=400, detail="该邮箱已注册")

    user = User(email=email, password_hash=hash_password(req.password),
                grade=req.grade, major=req.major, subject=req.subject)
    db.add(user)
    db.commit()
    db.refresh(user)

    token = create_token(user.id, user.email)
    return {"token": token, "user": {"id": user.id, "email": user.email,
            "grade": user.grade, "major": user.major, "subject": user.subject}}


# ---- 登录 ----

@router.post("/auth/login")
async def login(req: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == req.email.strip().lower()).first()
    if not user:
        raise HTTPException(status_code=401, detail="邮箱或密码错误")

    if user.locked_until and user.locked_until > datetime.datetime.utcnow():
        remaining = (user.locked_until - datetime.datetime.utcnow()).seconds // 60
        raise HTTPException(status_code=403, detail=f"账户已锁定，请 {remaining} 分钟后重试")

    if not verify_password(req.password, user.password_hash):
        user.login_attempts = (user.login_attempts or 0) + 1
        if user.login_attempts >= 5:
            user.locked_until = datetime.datetime.utcnow() + datetime.timedelta(minutes=15)
            user.login_attempts = 0
        db.commit()
        raise HTTPException(status_code=401, detail="邮箱或密码错误")

    user.login_attempts = 0
    user.locked_until = None
    user.last_login_at = datetime.datetime.utcnow()
    db.commit()

    token = create_token(user.id, user.email)
    return {"token": token, "user": {"id": user.id, "email": user.email,
            "grade": user.grade, "major": user.major, "subject": user.subject}}


# ---- 当前用户信息 ----

@router.get("/auth/me")
async def get_me(user_id: int = Depends(get_current_user), db: Session = Depends(get_db)):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="用户不存在")
    return {"id": user.id, "email": user.email, "grade": user.grade,
            "major": user.major, "subject": user.subject, "is_admin": user.is_admin}


@router.put("/auth/me")
async def update_me(req: UpdateProfileRequest, user_id: int = Depends(get_current_user), db: Session = Depends(get_db)):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="用户不存在")
    if req.grade: user.grade = req.grade
    if req.major: user.major = req.major
    if req.subject: user.subject = req.subject
    db.commit()
    return {"status": "ok"}


# ---- 修改密码 ----

@router.put("/auth/password")
async def change_password(req: ChangePasswordRequest, user_id: int = Depends(get_current_user), db: Session = Depends(get_db)):
    user = db.query(User).filter(User.id == user_id).first()
    if not verify_password(req.old_password, user.password_hash):
        raise HTTPException(status_code=400, detail="原密码错误")
    if len(req.new_password) < 6:
        raise HTTPException(status_code=400, detail="新密码至少需要 6 位")
    user.password_hash = hash_password(req.new_password)
    db.commit()
    return {"status": "ok"}


# ---- 用户统计 ----

@router.get("/user/stats")
async def get_stats(user_id: int = Depends(get_current_user), db: Session = Depends(get_db)):
    sessions = db.query(StudySession).filter(StudySession.user_id == user_id).count()
    # 通过 session_id 字符串连接 Exercise 和 StudySession
    total_ex = db.query(Exercise).filter(
        Exercise.session_id.in_(
            db.query(StudySession.session_id).filter(StudySession.user_id == user_id)
        )
    ).count()
    wrongs = db.query(WrongBook).filter(WrongBook.user_id == user_id).count()
    vocab = db.query(Vocabulary).filter(Vocabulary.user_id == user_id, Vocabulary.favorited == True).count()

    accuracy = round((1 - wrongs / max(total_ex, 1)) * 100, 1)

    return {"sessions": sessions, "total_exercises": total_ex, "wrong_count": wrongs,
            "accuracy": accuracy, "favorite_vocab": vocab}


# ---- 词汇收藏 ----

@router.get("/user/vocabulary")
async def get_user_vocab(user_id: int = Depends(get_current_user), db: Session = Depends(get_db)):
    words = db.query(Vocabulary).filter(Vocabulary.user_id == user_id, Vocabulary.favorited == True).all()
    return {"words": [{"id": w.id, "word": w.word, "translation": w.translation,
            "example": w.example} for w in words]}


@router.post("/user/vocabulary/{vocab_id}/favorite")
async def toggle_favorite(vocab_id: int, user_id: int = Depends(get_current_user), db: Session = Depends(get_db)):
    word = db.query(Vocabulary).filter(Vocabulary.id == vocab_id).first()
    if not word:
        raise HTTPException(status_code=404, detail="词汇不存在")
    # 记录收藏者
    if not word.user_id:
        word.user_id = user_id
    word.favorited = not word.favorited
    db.commit()
    return {"vocab_id": vocab_id, "favorited": word.favorited}
