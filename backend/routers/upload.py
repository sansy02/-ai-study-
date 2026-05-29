"""
文件上传 & 文本解析 API
"""
from fastapi import APIRouter, UploadFile, File, HTTPException
from services.parser_service import parse_file

router = APIRouter(prefix="/api", tags=["upload"])

MAX_FILE_SIZE = 20 * 1024 * 1024  # 20MB


@router.post("/upload")
async def upload_file(file: UploadFile = File(...)):
    """上传 PPTX/PDF 文件，返回提取的文本内容"""
    # 检查文件扩展名
    filename = (file.filename or "").lower()
    if not (filename.endswith(".pptx") or filename.endswith(".pdf")):
        raise HTTPException(
            status_code=400,
            detail="仅支持 PPTX 和 PDF 文件。旧版 .ppt 格式请用 PowerPoint 另存为 .pptx 后重试。"
        )
    # 检查文件大小
    contents = await file.read()
    if len(contents) > MAX_FILE_SIZE:
        raise HTTPException(status_code=400, detail="文件大小超过 20MB 限制")

    if len(contents) == 0:
        raise HTTPException(status_code=400, detail="文件为空")

    # 解析文件
    try:
        text, file_type = parse_file(file.filename or "unknown", contents)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"文件解析失败: {str(e)}")

    if not text.strip():
        raise HTTPException(status_code=400, detail="未能从文件中提取到文字内容，请确认文件包含文本而非纯图片。")

    if len(text.strip()) < 10:
        raise HTTPException(status_code=400, detail="文件内容过短，请上传有实质内容的PPT/PDF。")

    # 截取预览（前2000字符）
    preview = text[:2000]

    return {
        "filename": file.filename,
        "file_type": file_type,
        "text": text,
        "preview": preview,
        "char_count": len(text),
    }
