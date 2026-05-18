import base64
import io
from logging import getLogger
from typing import Annotated

from core.config import settings
from fastapi import APIRouter, Body, File, HTTPException, UploadFile, status
from image_translator.ocr import OCR
from image_translator.text_detector import ComicTextDetector, ImageTextBox
from PIL import Image
from schema.image import DetectedTextBox, ExtractedTextBox

router = APIRouter(prefix="/image")
logger = getLogger(__name__)


@router.post("/extract-text-regions")
async def extract_text_regions(
    image: Annotated[str, Body(embed=True)],
) -> list[DetectedTextBox]:
    """Extract text regions from an image"""
    try:
        text_detector = ComicTextDetector(
            hf_token=settings.HF_TOKEN, model_id=settings.BUBBLE_DETECTION_MODEL_ID
        )
        image_data = base64.b64decode(image)
        image = Image.open(io.BytesIO(image_data))
        text_boxes = text_detector.detect_image_text_boxes(image)
        return text_boxes
    except Exception as e:
        logger.error(f"Error extracting text regions: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e)
        )


@router.post("/extract-text")
async def extract_text(
    image_data: Annotated[str, Body(embed=True)],
    text_boxes: Annotated[list[DetectedTextBox], Body(embed=True)],
) -> list[ExtractedTextBox]:
    """Extract text from an image"""
    try:
        ocr = OCR(model=settings.OCR_MODEL, api_key=settings.LLM_API_KEY)
        text_detector = ComicTextDetector(
            hf_token=settings.HF_TOKEN, model_id=settings.BUBBLE_DETECTION_MODEL_ID
        )
        image = Image.open(io.BytesIO(base64.b64decode(image_data)))
        extracted_text: list[ExtractedTextBox] = []
        for text_box in text_boxes:
            box_image = text_detector.copy_text_box_section(
                image,
                ImageTextBox(
                    score=text_box.score, label=text_box.label, box=text_box.box
                ),
            )
            box_image_io = io.BytesIO()
            box_image.save(box_image_io, format="JPEG")
            text = ocr.get_image_text(box_image_io.getvalue())
            extracted_text.append(ExtractedTextBox(*text_box.model_dump(), text=text))
        return extracted_text
    except Exception as e:
        logger.error(f"Error extracting text: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e)
        )
