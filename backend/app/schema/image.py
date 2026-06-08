from typing import Literal

from pydantic import BaseModel
from schema.font import Font


class DetectedTextBox(BaseModel):
    score: float
    label: Literal["bubble", "text_bubble", "text_free"]
    box: list[float]  # [x0, y0, x1, y1]


class ExtractedTextBox(DetectedTextBox):
    text: str


class TranslatedTextBox(ExtractedTextBox):
    translated_text: str


class FillTextBox(TranslatedTextBox):
    fill_color_hex: str | None = None
    font_color_hex: str | None = None
