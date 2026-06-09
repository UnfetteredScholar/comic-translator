import base64
import io
import os
import shutil
import zipfile
from logging import getLogger
from pathlib import Path
from tempfile import NamedTemporaryFile, TemporaryDirectory
from typing import Annotated

import cv2
import onnxruntime as ort
from core.config import settings
from fastapi import (
    APIRouter,
    BackgroundTasks,
    Body,
    File,
    Form,
    HTTPException,
    UploadFile,
    status,
)
from fastapi.responses import FileResponse
from image_translator.image_clean import erase_text, load_session
from image_translator.ocr import OCR
from image_translator.pipeline import ComicTranslator
from image_translator.text_detector import ComicTextDetector, ImageTextBox
from image_translator.translate import Translator
from mpmath.calculus.optimization import str2solver
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
        logger.exception(e)
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
        text_boxes = text_detector.detect_image_text_boxes(
            image, allowed_labels=["text_bubble"]
        )
        return text_boxes
    except Exception as e:
        logger.exception(e)
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
        logger.exception(e)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e)
        )


@router.post("/mask-image")
async def mask_image(
    background_tasks: BackgroundTasks,
    image_data: Annotated[str, Body(embed=True)],
    text_boxes: Annotated[list[DetectedTextBox], Body(embed=True)],
):
    """Mask the image"""
    try:
        model_path = Path(settings.MODELS_DIR) / settings.MASK_MODEL
        session = load_session(model_path, "ROCm")

        image = Image.open(io.BytesIO(base64.b64decode(image_data)))
        bboxes = [text_box.box for text_box in text_boxes]
        masked_image = erase_text(session, image, boxes=bboxes)

        with NamedTemporaryFile(delete=False, suffix=".jpg") as temp_file:
            masked_image.save(temp_file.name, format="JPEG")
            background_tasks.add_task(delete_file, temp_file.name)
            return FileResponse(temp_file.name, media_type="image/jpeg")
    except Exception as e:
        logger.exception(e)
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
        logger.exception(e)
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
        new_image = text_detector.replace_text_boxes_v3(
            image,
            boxes,
            new_text,
            # fill_color_hex=default_fill_hex,
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


@router.post("/translate-image")
async def translate_image(
    background_tasks: BackgroundTasks,
    image_file: Annotated[UploadFile, File()],
    target_language: Annotated[str, Form()],
    default_fill_hex: Annotated[str, Form()] = "#FFFFFF",
    default_font_hex: Annotated[str, Form()] = "#000000",
    font: Annotated[Font, Form()] = Font.COOLVETICA,
):
    """Performs OCR, text detection, and translation on a set of images in a single step"""
    try:
        image = Image.open(io.BytesIO(await image_file.read()))
        comic_translator = ComicTranslator(
            default_fill_hex=default_fill_hex,
            default_font_hex=default_font_hex,
            font=font,
        )

        # Run pipeline
        new_image = comic_translator.translate_image(
            image,
            target_language,
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


def delete_folder(folder_path: str):
    shutil.rmtree(folder_path)


@router.post("/translate-image-set")
async def translate_image_set(
    background_tasks: BackgroundTasks,
    comic_archive: Annotated[UploadFile, File()],
    target_language: Annotated[str, Body()] = "english",
    default_fill_hex: Annotated[str, Body()] = "#FFFFFF",
    default_font_hex: Annotated[str, Body()] = "#000000",
    font: Annotated[Font, Body()] = Font.COOLVETICA,
):
    """Performs OCR, text detection, and translation on an image in a single step"""
    try:
        text_boxes_dict: dict[str, list[ImageTextBox]] = {}
        extracted_text_dict: dict[str, list[ExtractedTextBox]] = {}
        translated_text_dict: dict[str, list[TranslatedTextBox]] = {}

        text_detector = ComicTextDetector(
            hf_token=settings.HF_TOKEN,
            model_id=settings.BUBBLE_DETECTION_MODEL_ID,
            font_path=FONT_PATHS[font],
        )
        ocr = OCR(model=settings.OCR_MODEL, api_key=settings.LLM_API_KEY)
        translator = Translator(
            model=settings.TRANSLATION_MODEL, api_key=settings.LLM_API_KEY
        )

        # Extract the comic archive to a temporary directory
        with TemporaryDirectory(delete=False) as temp_dir:
            # Write all images in the zip file to the temporary directory
            temp_dir_path = temp_dir
            with zipfile.ZipFile(comic_archive.file, "r") as zip_file:
                zip_file.extractall(temp_dir)

            background_tasks.add_task(delete_folder, temp_dir)

        print("Saved comic archive to temporary directory")

        # Get all image files in the comic archive
        image_extensions = [".jpg", ".jpeg", ".png", ".gif", ".bmp", ".webp"]
        archive_image_files = [
            name
            for name in os.listdir(temp_dir_path)
            if name.endswith(tuple(image_extensions))
        ]

        # Detect text boxes for each image in the temporary directory and store them in the text_boxes_dict
        for file_name in archive_image_files:
            file_path = os.path.join(temp_dir, file_name)
            image = Image.open(file_path)

            text_boxes = text_detector.detect_image_text_boxes(image)
            text_boxes_dict[file_name] = text_boxes

        print("Detected text boxes for each image in the temporary directory")

        # Extract text for each image in the temporary directory and store them in the extracted_text_dict
        for file_name in archive_image_files:
            file_path = os.path.join(temp_dir, file_name)
            image = Image.open(file_path)
            text_boxes = text_boxes_dict[file_name]
            extracted_text: list[ExtractedTextBox] = []
            for text_box in text_boxes:
                box_image = text_detector.copy_text_box_section(
                    image,
                    text_box,
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
            extracted_text_dict[file_name] = extracted_text

        print("Extracted text for each image in the temporary directory")

        # Translate the text for each image in the temporary directory and store them in the translated_text_dict
        for file_name in archive_image_files:
            extracted_text_boxes = extracted_text_dict[file_name]
            text_list = [text_box.text for text_box in extracted_text_boxes]
            translated_text_list = translator.translate_text_list(
                text_list, target_language
            )
            translated_text_boxes = [
                TranslatedTextBox(
                    score=text_box.score,
                    label=text_box.label,
                    box=text_box.box,
                    text=text_box.text,
                    translated_text=translated_text,
                )
                for text_box, translated_text in zip(
                    extracted_text_boxes, translated_text_list
                )
            ]
            translated_text_dict[file_name] = translated_text_boxes

        print("Translated text for each image in the temporary directory")

        # Replace the text in the images with the translated text and save the images to a new zip file
        with NamedTemporaryFile(delete=False, suffix=".zip") as temp_file:
            background_tasks.add_task(delete_file, temp_file.name)
            with zipfile.ZipFile(temp_file.name, "w") as zip_file:
                for file_name in archive_image_files:
                    image = Image.open(os.path.join(temp_dir, file_name))
                    text_boxes = text_boxes_dict[file_name]
                    translated_text_boxes = translated_text_dict[file_name]
                    new_text = [box.translated_text for box in translated_text_boxes]
                    new_image = text_detector.replace_text_boxes_v3(
                        image,
                        text_boxes,
                        new_text,
                        # fill_color_hex=default_fill_hex,
                        text_color_hex=default_font_hex,
                    )
                    with NamedTemporaryFile(
                        delete=True, suffix=".jpg"
                    ) as temp_image_file:
                        new_image.save(temp_image_file.name, format="JPEG")
                        zip_file.write(temp_image_file.name, file_name)

        print(
            "Replaced text in the images with the translated text and saved the images to a new zip file"
        )

        return FileResponse(
            temp_file.name,
            media_type="application/zip",
            filename=f"[MTL] {comic_archive.filename}",
        )
    except Exception as e:
        logger.exception(e)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e)
        )
