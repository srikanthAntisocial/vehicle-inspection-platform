"""Server-side image validation - mirrors front-end checks as a safety net."""
from __future__ import annotations

import io
import logging
from typing import Optional

from PIL import Image

from app.core.config import settings

logger = logging.getLogger(__name__)

ALLOWED_CONTENT_TYPES = {"image/jpeg", "image/jpg", "image/png"}
MIN_WIDTH = 1920
MIN_HEIGHT = 1080


def validate_image(content: bytes, content_type: str) -> tuple[Optional[int], Optional[int], Optional[str]]:
    """Returns (width, height, error_message). error_message is None if OK."""
    if content_type.lower() not in ALLOWED_CONTENT_TYPES:
        return None, None, f"Unsupported content type: {content_type}"

    if len(content) > settings.MAX_UPLOAD_SIZE_MB * 1024 * 1024:
        return None, None, f"File exceeds {settings.MAX_UPLOAD_SIZE_MB}MB limit"

    try:
        with Image.open(io.BytesIO(content)) as img:
            width, height = img.size
    except Exception as exc:
        logger.warning("Image could not be opened: %s", exc)
        return None, None, "Image is corrupt or unreadable"

    # Landscape + Full HD enforcement. We allow rotated images that exceed thresholds
    # on either axis but warn if it appears to be portrait.
    if width < height:
        return width, height, "Image must be in landscape orientation"
    if width < MIN_WIDTH or height < MIN_HEIGHT:
        return width, height, f"Image must be at least {MIN_WIDTH}x{MIN_HEIGHT}"

    return width, height, None
