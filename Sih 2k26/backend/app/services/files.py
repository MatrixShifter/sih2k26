"""Authorised local file storage for bid artefacts."""

from pathlib import Path
from uuid import uuid4

from app.core.config import get_settings
from app.core.errors import raise_api

ALLOWED_TYPES = {
    "application/pdf",
    "image/jpeg",
    "image/png",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
}
ALLOWED_EXT = {".pdf", ".jpg", ".jpeg", ".png", ".docx"}


def validate_upload(filename: str | None, content_type: str | None, size: int) -> str:
    settings = get_settings()
    name = filename or "upload.bin"
    suffix = Path(name).suffix.lower()
    if suffix not in ALLOWED_EXT:
        raise_api(400, "INVALID_FILE_TYPE", "Only PDF, JPEG, PNG, or DOCX files are accepted.")
    if content_type not in ALLOWED_TYPES:
        raise_api(400, "INVALID_MIME_TYPE", "The file MIME type is not allowed.")
    max_bytes = settings.max_upload_mb * 1024 * 1024
    if size > max_bytes:
        raise_api(400, "FILE_TOO_LARGE", f"File exceeds {settings.max_upload_mb} MB limit.")
    if ".." in name or "/" in name.replace("\\", "/") or "\\" in name:
        raise_api(400, "INVALID_FILENAME", "Filename contains unsafe path characters.")
    return suffix


def store_bytes(bidder_id: int, bid_id: int, document_id: int, original_name: str, data: bytes) -> str:
    settings = get_settings()
    suffix = Path(original_name).suffix.lower() or ".bin"
    folder = Path(settings.upload_dir) / str(bidder_id) / str(bid_id) / str(document_id)
    folder.mkdir(parents=True, exist_ok=True)
    stored_name = f"{uuid4().hex}{suffix}"
    path = folder / stored_name
    path.write_bytes(data)
    return str(path)
