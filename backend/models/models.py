"""
数据模型定义
"""
from datetime import datetime
from sqlalchemy import Column, Integer, String, Text, DateTime, Boolean, ForeignKey, JSON
from database import Base


class ContentCache(Base):
    """内容缓存 — 相同输入直接返回缓存，省 Token"""
    __tablename__ = "content_cache"

    id = Column(Integer, primary_key=True, autoincrement=True)
    content_hash = Column(String(64), unique=True, nullable=False, index=True)  # SHA256
    topic = Column(String(500), default="")
    outline = Column(Text, default="")    # JSON
    content = Column(Text, default="")    # JSON
    hit_count = Column(Integer, default=0)
    created_at = Column(DateTime, default=datetime.utcnow)


class AppSetting(Base):
    """应用配置（API Key 等）"""
    __tablename__ = "app_settings"

    id = Column(Integer, primary_key=True, autoincrement=True)
    key = Column(String(100), unique=True, nullable=False)
    value = Column(Text, default="")
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class StudentProfile(Base):
    """学生画像 — 年级、专业、学科"""
    __tablename__ = "student_profiles"

    id = Column(Integer, primary_key=True, autoincrement=True)
    grade = Column(String(20), default="")
    major = Column(String(100), default="")
    subject = Column(String(100), default="")
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)


class FeaturePreference(Base):
    """功能偏好设置"""
    __tablename__ = "feature_preferences"

    id = Column(Integer, primary_key=True, autoincrement=True)
    show_english = Column(Boolean, default=True)
    show_practice = Column(Boolean, default=True)
    show_wrong_book = Column(Boolean, default=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)


class StudySession(Base):
    """学习记录"""
    __tablename__ = "study_sessions"

    id = Column(Integer, primary_key=True, autoincrement=True)
    session_id = Column(String(36), unique=True, nullable=False)
    topic = Column(String(500), nullable=False)
    source_type = Column(String(20), default="topic")  # "topic" 或 "file"
    source_text = Column(Text, default="")              # 原始文本内容
    outline = Column(Text, default="")                  # JSON: 教学大纲
    content = Column(Text, default="")                  # JSON: 教学内容
    profile_id = Column(Integer, ForeignKey("student_profiles.id"), nullable=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)


class Vocabulary(Base):
    """英语词汇"""
    __tablename__ = "vocabularies"

    id = Column(Integer, primary_key=True, autoincrement=True)
    session_id = Column(String(36), nullable=False)
    chapter_index = Column(Integer, default=0)
    word = Column(String(200), nullable=False)
    translation = Column(String(500), default="")
    example = Column(String(1000), default="")
    favorited = Column(Boolean, default=False)       # 用户是否收藏
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)


class Exercise(Base):
    """练习题"""
    __tablename__ = "exercises"

    id = Column(Integer, primary_key=True, autoincrement=True)
    session_id = Column(String(36), nullable=False)
    chapter_index = Column(Integer, default=0)
    question_type = Column(String(20), nullable=False)  # choice / blank / short_answer
    question = Column(Text, nullable=False)
    options = Column(Text, default="")           # JSON: 选择题选项
    correct_answer = Column(Text, default="")
    explanation = Column(Text, default="")
    created_at = Column(DateTime, default=datetime.utcnow)


class User(Base):
    """用户表"""
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, autoincrement=True)
    email = Column(String(200), unique=True, nullable=False, index=True)
    password_hash = Column(String(200), nullable=False)
    grade = Column(String(20), default="")
    major = Column(String(100), default="")
    subject = Column(String(100), default="")
    is_admin = Column(Boolean, default=False)
    api_key = Column(String(200), nullable=True)          # 用户自己的 API Key
    login_attempts = Column(Integer, default=0)        # 登录失败次数
    locked_until = Column(DateTime, nullable=True)      # 锁定到期时间
    created_at = Column(DateTime, default=datetime.utcnow)
    last_login_at = Column(DateTime, nullable=True)


class WrongBook(Base):
    """错题本"""
    __tablename__ = "wrong_book"

    id = Column(Integer, primary_key=True, autoincrement=True)
    exercise_id = Column(Integer, ForeignKey("exercises.id"), nullable=False)
    user_answer = Column(Text, default="")
    is_correct = Column(Boolean, default=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
