from enum import Enum
from pathlib import Path

FONTS_DIR = Path(__file__).resolve().parent.parent / "fonts"

print(FONTS_DIR)


class Font(Enum):
    ATKINSON_HYPERLEGIBLE_MONO = "Atkinson Hyperlegible Mono Regular"
    ATKINSON_HYPERLEGIBLE_NEXT = "Atkinson Hyperlegible Next Regular"
    COOLVETICA = "Coolvetica Regular"
    NOTO_SANS = "Noto Sans Regular"
    ATKINSON_HYPERLEGIBLE = "Atkinson Hyperlegible Regular"


FONT_PATHS = {
    Font.ATKINSON_HYPERLEGIBLE_MONO: str(
        FONTS_DIR / "AtkinsonHyperlegibleMono-Regular.otf"
    ),
    Font.ATKINSON_HYPERLEGIBLE_NEXT: str(
        FONTS_DIR / "AtkinsonHyperlegibleNext-Regular.otf"
    ),
    Font.COOLVETICA: str(FONTS_DIR / "Coolvetica Rg.otf"),
    Font.NOTO_SANS: str(FONTS_DIR / "NotoSans-Regular.ttf"),
    Font.ATKINSON_HYPERLEGIBLE: str(
        FONTS_DIR / "Atkinson-Hyperlegible-Regular-102.otf"
    ),
}
