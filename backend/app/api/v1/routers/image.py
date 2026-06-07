import base64
import io
import os
from logging import getLogger
from tempfile import NamedTemporaryFile
from typing import Annotated

from core.config import settings
from fastapi import (
    APIRouter,
    BackgroundTasks,
    Body,
    File,
    HTTPException,
    UploadFile,
    status,
)
from fastapi.responses import FileResponse, StreamingResponse
from image_translator.ocr import OCR
from image_translator.text_detector import ComicTextDetector, ImageTextBox
from image_translator.translate import Translator
from PIL import Image
from schema.font import FONT_PATHS, Font
from schema.image import (
    DetectedTextBox,
    ExtractedTextBox,
    FillTextBox,
    TranslatedTextBox,
)

router = APIRouter(prefix="/image")
logger = getLogger(__name__)


@router.post("/util/convert-to-base64")
async def convert_to_base64(
    image: Annotated[UploadFile, File()],
) -> dict[str, str]:
    """Convert an image to base64"""
    try:
        return {
            "image": base64.b64encode(await image.read()).decode(),
        }
    except Exception as e:
        logger.error(f"Error converting image to base64: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e)
        )


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
            extracted_text_box = ExtractedTextBox(
                score=text_box.score,
                label=text_box.label,
                box=text_box.box,
                text=text,
            )
            extracted_text.append(extracted_text_box)
        return extracted_text
    except Exception as e:
        logger.error(f"Error extracting text: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e)
        )


@router.post("/translate-text-list")
async def translate_text(
    text_boxes: Annotated[list[ExtractedTextBox], Body(embed=True)],
    target_language: Annotated[str, Body(embed=True)],
) -> list[TranslatedTextBox]:
    """Translate text"""
    try:
        translator = Translator(
            model=settings.TRANSLATION_MODEL, api_key=settings.LLM_API_KEY
        )
        text_list = [text_box.text for text_box in text_boxes]
        translated_text_list = translator.translate_text_list(
            text_list, target_language
        )
        return [
            TranslatedTextBox(
                score=text_box.score,
                label=text_box.label,
                box=text_box.box,
                text=text_box.text,
                translated_text=translated_text,
            )
            for text_box, translated_text in zip(text_boxes, translated_text_list)
        ]
    except Exception as e:
        logger.error(f"Error translating text: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e)
        )


def delete_file(file_path: str):
    os.remove(file_path)


@router.post("/replace-image-text")
async def replace_image_text(
    background_tasks: BackgroundTasks,
    image_data: Annotated[str, Body()],
    text_boxes: list[FillTextBox],
    default_fill_hex: Annotated[str, Body()] = "#FFFFFF",
    default_font_hex: Annotated[str, Body()] = "#000000",
    font: Annotated[Font, Body()] = Font.COOLVETICA,
):
    """Replaces the text in the input boxes with the provided text"""
    try:
        text_detector = ComicTextDetector(
            hf_token=settings.HF_TOKEN,
            model_id=settings.BUBBLE_DETECTION_MODEL_ID,
            font_path=FONT_PATHS[font],
        )
        image = Image.open(io.BytesIO(base64.b64decode(image_data)))
        boxes = []
        new_text = []
        for box in text_boxes:
            boxes.append(ImageTextBox(score=box.score, label=box.label, box=box.box))
            new_text.append(box.translated_text)
        new_image = text_detector.replace_text_boxes_v2(
            image,
            boxes,
            new_text,
            fill_color_hex=default_fill_hex,
            text_color_hex=default_font_hex,
        )

        with NamedTemporaryFile(delete=False, suffix=".jpg") as temp_file:
            new_image.save(temp_file.name, format="JPEG")
            background_tasks.add_task(delete_file, temp_file.name)

        return FileResponse(temp_file.name, media_type="image/jpeg")
    except Exception as e:
        logger.exception(e)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e)
        )
