import io
import time

from core.config import settings
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


class ComicTranslator:
    def __init__(
        self,
        default_fill_hex: str = "#FFFFFF",
        default_font_hex: str = "#000000",
        font: Font = Font.COOLVETICA,
    ):
        self.default_fill_hex = default_fill_hex
        self.default_font_hex = default_font_hex
        self.font_path = FONT_PATHS[font]
        self.ocr = OCR(model=settings.OCR_MODEL, api_key=settings.LLM_API_KEY)
        self.text_detector = ComicTextDetector(
            hf_token=settings.HF_TOKEN,
            model_id=settings.BUBBLE_DETECTION_MODEL_ID,
            font_path=self.font_path,
        )
        self.translator = Translator(
            model=settings.TRANSLATION_MODEL, api_key=settings.LLM_API_KEY
        )

    def translate_image(self, image: Image.Image, target_language: str) -> Image.Image:
        """Translates a comic/manga/webtoon page image to a target language"""
        # Text Box Detection
        text_boxes = self.text_detector.detect_image_text_boxes(image)

        # OCR
        extracted_text: list[ExtractedTextBox] = []
        for text_box in text_boxes:
            box_image = self.text_detector.copy_text_box_section(
                image,
                ImageTextBox(
                    score=text_box.score, label=text_box.label, box=text_box.box
                ),
            )
            box_image_io = io.BytesIO()
            box_image.save(box_image_io, format="JPEG")
            text = self.ocr.get_image_text(box_image_io.getvalue())
            extracted_text_box = ExtractedTextBox(
                score=text_box.score,
                label=text_box.label,
                box=text_box.box,
                text=text,
            )
            extracted_text.append(extracted_text_box)

        # Translation
        text_list = [text_box.text for text_box in extracted_text]
        translated_text_list = self.translator.translate_text_list(
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
            for text_box, translated_text in zip(extracted_text, translated_text_list)
        ]

        # Replace Text Boxes
        boxes = [
            ImageTextBox(score=box.score, label=box.label, box=box.box)
            for box in translated_text_boxes
        ]
        new_text = [box.translated_text for box in translated_text_boxes]
        new_image = self.text_detector.replace_text_boxes_v3(
            image,
            boxes,
            new_text,
            # fill_color_hex=self.default_fill_hex,
            text_color_hex=self.default_font_hex,
        )
        return new_image
