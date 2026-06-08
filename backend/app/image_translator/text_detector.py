import os
import textwrap
from dataclasses import dataclass
from pathlib import Path
from typing import Literal

import torch
from core.config import settings
from dotenv import load_dotenv
from image_translator.image_clean import erase_text, load_session
from PIL import Image, ImageDraw, ImageFont
from schema.font import FONT_PATHS, Font
from transformers import RTDetrForObjectDetection, RTDetrImageProcessor


@dataclass
class ImageTextBox:
    score: float
    label: Literal["bubble", "text_bubble", "text_free"]
    box: list[float]  # [x0, y0, x1, y1]


class ComicTextDetector:
    def __init__(
        self, hf_token: str, model_id: str, font_path: str = FONT_PATHS[Font.COOLVETICA]
    ):
        self.image_processor = RTDetrImageProcessor.from_pretrained(
            model_id, token=hf_token
        )
        self.image_model = RTDetrForObjectDetection.from_pretrained(
            model_id, token=hf_token
        )
        self.device = "cuda" if torch.cuda.is_available() else "cpu"
        self.image_model.to(self.device)
        self.font_path = font_path

    def _get_text_size(
        self, text: str, font: ImageFont.FreeTypeFont, draw: ImageDraw.ImageDraw
    ) -> tuple[int, int]:
        bbox = draw.multiline_textbbox((0, 0), text, font=font)
        return bbox[2] - bbox[0], bbox[3] - bbox[1]

    def _wrap_text(
        self,
        text: str,
        font: ImageFont.FreeTypeFont,
        draw: ImageDraw.ImageDraw,
        max_width: int,
    ) -> str:
        words = text.split()
        lines = []
        current_line = ""

        for word in words:
            test_line = f"{current_line} {word}".strip()
            w, _ = self._get_text_size(test_line, font, draw)

            if w <= max_width:
                current_line = test_line
            else:
                lines.append(current_line)
                current_line = word

        if current_line:
            lines.append(current_line)

        return "\n".join(lines)

    def _fit_text_to_box(
        self,
        text: str,
        box: list[float],
        font_path: str,
        draw: ImageDraw.ImageDraw,
        max_font: int = 40,
        min_font: int = 10,
    ) -> tuple[str, ImageFont]:
        x1, y1, x2, y2 = box
        box_w = x2 - x1
        box_h = y2 - y1

        for size in range(max_font, min_font - 1, -1):
            font = ImageFont.truetype(font_path, size)
            wrapped = self._wrap_text(text, font, draw, box_w)
            w, h = self._get_text_size(wrapped, font, draw)

            if w <= box_w and h <= box_h:
                return wrapped, font

        # fallback
        font = ImageFont.truetype(font_path, min_font)
        return self._wrap_text(text, font, draw, box_w), font

    def draw_text_in_box(
        self,
        draw: ImageDraw.ImageDraw,
        text: str,
        box: list[float],
        font: ImageFont.FreeTypeFont,
        font_color: str = "#000000",
    ):
        x1, y1, x2, y2 = box

        w, h = draw.multiline_textbbox((0, 0), text, font=font)[2:]

        x = x1 + (x2 - x1 - w) / 2
        y = y1 + (y2 - y1 - h) / 2

        draw.multiline_text((x, y), text, font=font, fill=font_color, align="center")

    def detect_image_text_boxes(
        self,
        image: Image.Image,
        score_threshold: float = 0.5,
        allowed_labels: list[str] = ["text_bubble"],
    ) -> list[ImageTextBox]:
        """
        Detects text regions in a given comic/manga/webtoon page

        Returns:
        A list of ImageTextBox determining the type and location of the text found
        """

        image = image.convert("RGB")

        inputs = self.image_processor(images=image, return_tensors="pt")
        inputs = {k: v.to(self.device) for k, v in inputs.items()}

        # Process image with model
        with torch.no_grad():
            outputs = self.image_model(**inputs)

        # Resize and filter output from model to match image
        target_sizes = torch.tensor([[image.height, image.width]]).to(self.device)

        results = self.image_processor.post_process_object_detection(
            outputs, threshold=score_threshold, target_sizes=target_sizes
        )[0]

        text_boxes: list[ImageTextBox] = []

        for score, label, box in zip(
            results["scores"], results["labels"], results["boxes"]
        ):
            box = [round(i, 2) for i in box.tolist()]
            label_name = self.image_model.config.id2label[label.item()]

            text_box = ImageTextBox(score=score.item(), label=label_name, box=box)

            # print(text_box.label, text_box.score, text_box.box)

            text_boxes.append(text_box)

        # Create a labelled image with the text boxes
        labelled_image = image.copy()
        draw = ImageDraw.Draw(labelled_image)
        for text_box in text_boxes:
            draw.rectangle(text_box.box, fill=None, outline="#000000", width=2)
            draw.text(
                (text_box.box[0], text_box.box[1]),
                text_box.label,
                fill="#000000",
                font=ImageFont.truetype(self.font_path, 10),
            )

        return [text_box for text_box in text_boxes if text_box.label in allowed_labels]

    def copy_text_box_section(
        self,
        input_image: Image.Image,
        text_box: ImageTextBox,
    ) -> Image.Image:
        """
        Copies the text box section from the input image to the new image
        """
        cropped_image = input_image.crop(text_box.box)
        return cropped_image

    def replace_text_boxes(
        self,
        input_image: Image.Image,
        text_boxes: list[ImageTextBox],
        new_text: list[str],
        fill_color_hex: str = "#FFFFFF",
        text_color_hex: str = "#000000",
    ) -> Image.Image:
        """
        Replaces the text boxes in the image with the new text
        """
        if len(text_boxes) != len(new_text):
            raise ValueError("The number of text boxes and new text must be the same")
        image = input_image.copy()
        draw = ImageDraw.Draw(image)
        for text_box, new_text in zip(text_boxes, new_text):
            draw.rectangle(text_box.box, fill=fill_color_hex)
            draw.text(
                (text_box.box[0], text_box.box[1]),
                new_text,
                fill=text_color_hex,
            )
        return image

    def replace_text_boxes_v2(
        self,
        input_image: Image.Image,
        text_boxes: list[ImageTextBox],
        new_text: list[str],
        fill_color_hex: str = "#FFFFFF",
        text_color_hex: str = "#000000",
    ) -> Image.Image:
        """
        Replaces the text boxes in the image with the new text
        """
        if len(text_boxes) != len(new_text):
            raise ValueError("The number of text boxes and new text must be the same")
        image = input_image.copy()
        draw = ImageDraw.Draw(image)
        for text_box, new_text in zip(text_boxes, new_text):
            draw.rectangle(text_box.box, fill=fill_color_hex)
            wrapped_text, font = self._fit_text_to_box(
                new_text, text_box.box, self.font_path, draw
            )
            self.draw_text_in_box(
                draw, wrapped_text, text_box.box, font, text_color_hex
            )
        return image

    def replace_text_boxes_v3(
        self,
        input_image: Image.Image,
        text_boxes: list[ImageTextBox],
        new_text: list[str],
        text_color_hex: str = "#000000",
    ) -> Image.Image:
        """
        Replaces the text boxes in the image with the new text
        using the Lama Manga Dynamic Model to mask the text boxes
        """
        if len(new_text) < len(text_boxes):
            # Add buffer text boxes to the new text list
            new_text = new_text + [""] * (len(text_boxes) - len(new_text))
        elif len(new_text) > len(text_boxes):
            # Add extra items to the last item of the new text list
            trimmed_text = new_text[: len(text_boxes) - 1]
            combined_text = " ".join(new_text[len(text_boxes) :])
            trimmed_text.append(combined_text)
            new_text = trimmed_text

        # Mask image with Lama Manga Dynamic Model
        model_path = Path(settings.MODELS_DIR) / settings.MASK_MODEL
        # session = load_session(model_path, "ROCm")
        session = load_session(model_path, "CPU")

        image = input_image.copy()
        bboxes = [text_box.box for text_box in text_boxes]
        masked_image = erase_text(session, image, boxes=bboxes)

        draw = ImageDraw.Draw(masked_image)
        for text_box, new_text in zip(text_boxes, new_text):
            wrapped_text, font = self._fit_text_to_box(
                new_text, text_box.box, self.font_path, draw
            )
            self.draw_text_in_box(
                draw, wrapped_text, text_box.box, font, text_color_hex
            )
        return masked_image
