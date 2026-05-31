"""
AI 服务 — 调用 DeepSeek / OpenAI 兼容 API
"""
import json
import os
import httpx
from routers.settings import get_api_key

# 默认使用 DeepSeek API（可通过环境变量覆盖）
AI_BASE_URL = os.getenv("AI_BASE_URL", "https://api.deepseek.com")
AI_MODEL = os.getenv("AI_MODEL", "deepseek-chat")

# 中文 JSON 模板 — 指示 AI 返回结构化的教学数据
OUTLINE_CONTENT_PROMPT = """你是一位资深的大学课程教学设计专家。你需要根据提供的学习材料，生成一套结构化的教学内容。

## 学生背景
- 年级：{grade}
- 专业：{major}
- 专业课程：{subject}

## 原始材料
{source_text}

## 任务要求

请生成一份完整、详细的教学内容，包含以下部分。严格按 JSON 格式返回，不要包含任何 JSON 之外的内容。

### 1. 教学大纲 (outline)
将内容组织为 4-6 个章节，每个章节包含：
- title: 章节标题
- summary: 一句话概括本章内容

### 2. 教学内容 (chapters)
对每个章节展开详细讲解，每个章节需包含：
- title: 章节标题（与大纲一致）
- sections: 本章的知识点小节（每章 2-4 节），每一节包含：
  - heading: 小标题
  - body: 详细讲解内容（500-1200字），深入浅出，结合概念、原理、应用场景，使用通俗易懂的语言，根据学生年级调整深度
  - example: 具体案例或举例说明（必填，不能省略，帮助学生理解抽象概念）

### 语言风格
- 如果学生是大一大二：多用比喻、生活案例，语言亲切通俗
- 如果学生是大三大四/研究生：可以深入原理，使用专业术语
- 结合学生的专业背景和专业课程方向，选择与之紧密相关的案例和知识点
- 教学内容应围绕学生的年级、专业、专业课程三者生成，确保内容的相关性和实用性

## 返回示例格式
```json
{{
  "topic": "主题名称",
  "outline": [
    {{"title": "第一章 xxx", "summary": "一句话概括"}}
  ],
  "chapters": [
    {{
      "title": "第一章 xxx",
      "sections": [
        {{"heading": "1.1 概念介绍", "body": "详细讲解...", "example": "举个例子..."}}
      ]
    }}
  ]
}}
```

请直接返回 JSON，不要包含 ```json 标记。"""


async def call_ai(prompt: str, system_prompt: str = "你是一个专业的教学助手。", user_id: int | None = None) -> dict:
    """调用 AI API，返回解析后的 JSON 结果。user_id 用于获取该用户的 API Key"""
    api_key = get_api_key(user_id)
    if api_key == "your-api-key-here":
        raise ValueError(
            "AI API Key 未配置。请在环境变量中设置 AI_API_KEY，"
            "或在前端设置页面中填入你的 API Key。\n"
            "获取 Key: https://platform.deepseek.com"
        )

    async with httpx.AsyncClient(timeout=120.0) as client:
        response = await client.post(
            f"{AI_BASE_URL}/v1/chat/completions",
            headers={
                "Authorization": f"Bearer {api_key}",
                "Content-Type": "application/json",
            },
            json={
                "model": AI_MODEL,
                "messages": [
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": prompt},
                ],
                "temperature": 0.7,
                "max_tokens": 16384,
            },
        )
        response.raise_for_status()
        data = response.json()

    # 提取 AI 回复的文本
    content = data["choices"][0]["message"]["content"]
    # 清理可能的 markdown 代码块标记
    content = content.strip()
    if content.startswith("```"):
        # 移除 ```json 和结尾的 ```
        content = content.split("\n", 1)[-1]
        if content.endswith("```"):
            content = content[:-3]
    content = content.strip()

    return json.loads(content)


async def generate_teaching_content(
    source_text: str,
    grade: str = "",
    major: str = "",
    subject: str = "",
    user_id: int | None = None,
) -> dict:
    """
    根据原始材料生成结构化教学内容
    返回: { topic, outline, chapters }
    """
    prompt = OUTLINE_CONTENT_PROMPT.format(
        grade=grade or "未指定",
        major=major or "未指定",
        subject=subject or "未指定",
        source_text=source_text,
    )
    return await call_ai(prompt, user_id=user_id)


# ---- 英语词汇 ----

VOCABULARY_PROMPT = """你是一位英语教学专家。请根据以下教学内容，提取其中的专业英语高频词汇。

## 教学内容
{content_text}

## 任务
提取 15-25 个专业相关的英语词汇或术语。覆盖本章所有核心概念。为学生画像调整词汇难度：
- 大一大二：提取基础专业词汇
- 大三大四/研究生：可以包括学术性更强的词汇

## 返回格式
严格按 JSON 数组返回：
[
  {{"word": "algorithm", "translation": "算法", "example": "This algorithm can sort data efficiently."}},
  ...
]

请直接返回 JSON 数组，不要包含 \`\`\`json 标记。"""


async def generate_vocabulary(
    content_text: str,
    grade: str = "",
    user_id: int | None = None,
) -> list[dict]:
    """根据教学内容生成英语高频词汇"""
    prompt = VOCABULARY_PROMPT.format(
        content_text=content_text,
    )
    system = "你是一位英语教学专家，擅长提取专业术语并给出准确的中文翻译和例句。"
    return await call_ai(prompt, system_prompt=system, user_id=user_id)


# ---- 练习题 ----

PRACTICE_PROMPT = """你是一位大学课程出题专家。请根据以下教学内容，生成练习题。

## 教学内容
{content_text}

## 学生背景
- 年级：{grade}
- 专业：{major}

## 任务
生成以下三种题型的练习题：

1. **选择题** (choice)：4 道，考察概念理解，每题 4 个选项
2. **填空题** (blank)：3 道，考察关键词记忆
3. **简答题** (short_answer)：2 道，考察深度理解

难度匹配学生年级：
- 大一：基础概念题
- 大三/研究生：分析应用题

## 返回格式
严格按 JSON 返回：
{{
  "exercises": [
    {{"type": "choice", "question": "题目", "options": ["A. ...", "B. ...", "C. ...", "D. ..."], "answer": "A", "explanation": "解析"}},
    {{"type": "blank", "question": "题目（用 ___ 标记填空处）", "answer": "答案", "explanation": "解析"}},
    {{"type": "short_answer", "question": "题目", "answer": "参考答案要点", "explanation": "评分要点"}}
  ]
}}

请直接返回 JSON，不要包含 \`\`\`json 标记。"""


async def generate_exercises(
    content_text: str,
    grade: str = "",
    major: str = "",
    user_id: int | None = None,
) -> list[dict]:
    """根据教学内容生成练习题"""
    prompt = PRACTICE_PROMPT.format(
        content_text=content_text,
        grade=grade or "未指定",
        major=major or "未指定",
    )
    system = "你是一位严谨的大学课程出题专家，出的题目难度适中、考察知识点准确。"
    result = await call_ai(prompt, system_prompt=system, user_id=user_id)
    return result.get("exercises", [])


# ---- AI 语义批改 ----

GRADING_PROMPT = """你是一位大学课程评分老师。请判断学生答案是否基本正确。

题目: {question}
正确答案: {correct_answer}
学生答案: {user_answer}
题型: {question_type}

评分规则:
- 填空题：学生答案的关键词与正确答案匹配即可认为正确，允许表述有细微差异
- 简答题：学生答案涵盖了正确答案的核心要点即可认为正确，不需要逐字匹配
- 如果学生答案明显偏离或空白，标记为错误

请仅返回 JSON（不要其他内容）:
{{"is_correct": true, "explanation": "简要说明为什么对/错（1-2句话）"}}"""


async def grade_answer(question: str, correct_answer: str, user_answer: str, question_type: str, user_id: int | None = None) -> dict:
    """使用 AI 语义评判学生答案。返回 {is_correct: bool, explanation: str}"""
    prompt = GRADING_PROMPT.format(
        question=question,
        correct_answer=correct_answer,
        user_answer=user_answer,
        question_type="填空题" if question_type == "blank" else "简答题",
    )
    try:
        return await call_ai(prompt, system_prompt="你是一位严谨的大学课程评分老师。", user_id=user_id)
    except Exception:
        # AI 评分失败时回退到精确匹配
        return {"is_correct": False, "explanation": ""}
