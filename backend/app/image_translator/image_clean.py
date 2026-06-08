"""
manga_masker.py
===============
Inpaints (erases) text from manga images using the
ogkalu/lama-manga-onnx-dynamic model, given pre-computed text locations.

Accepts bounding boxes or a pre-built binary mask.

Install:
    pip install onnxruntime-rocm      # AMD ROCm / Linux  (9070 XT)
    pip install onnxruntime-directml  # DirectML / Windows
    pip install onnxruntime           # CPU fallback
    pip install Pillow numpy

Download model (once):
    from huggingface_hub import hf_hub_download
    hf_hub_download("ogkalu/lama-manga-onnx-dynamic",
                    "lama_manga.onnx", local_dir="./models")
"""

from pathlib import Path
from typing import Literal, Sequence

import numpy as np
import onnxruntime as ort
from PIL import Image, ImageDraw

# ---------------------------------------------------------------------------
# Types
# ---------------------------------------------------------------------------

# (x1, y1, x2, y2) in pixels, or (x, y, w, h) – see `box_format` parameter
BBox = tuple[int, int, int, int]

Provider = Literal["ROCm", "DirectML", "CUDA", "CPU", "auto"]

_PROVIDER_MAP: dict[str, list] = {
    "ROCm": [("ROCMExecutionProvider", {"device_id": 0}), "CPUExecutionProvider"],
    "DirectML": [("DmlExecutionProvider", {"device_id": 0}), "CPUExecutionProvider"],
    "CUDA": [("CUDAExecutionProvider", {"device_id": 0}), "CPUExecutionProvider"],
    "CPU": ["CPUExecutionProvider"],
}


# ---------------------------------------------------------------------------
# Session loader
# ---------------------------------------------------------------------------


def load_session(
    model_path: str | Path,
    provider: Provider = "auto",
) -> ort.InferenceSession:
    """
    Load lama_manga.onnx into an ONNX Runtime session.

    Parameters
    ----------
    model_path : path to lama_manga.onnx
    provider   : "auto" picks the best available backend automatically.
    """
    model_path = Path(model_path)
    if not model_path.exists():
        raise FileNotFoundError(
            f"Model not found: {model_path}\n"
            "  from huggingface_hub import hf_hub_download\n"
            '  hf_hub_download("ogkalu/lama-manga-onnx-dynamic",\n'
            '                  "lama_manga.onnx", local_dir="./models")'
        )

    if provider == "auto":
        available = set(ort.get_available_providers())
        print(f"[manga_masker] available: {available}")
        providers = next(
            (
                p
                for name, p in _PROVIDER_MAP.items()
                if (p[0][0] if isinstance(p[0], tuple) else p[0]) in available
            ),
            ["CPUExecutionProvider"],
        )
    else:
        providers = _PROVIDER_MAP[provider]

    opts = ort.SessionOptions()
    opts.graph_optimization_level = ort.GraphOptimizationLevel.ORT_ENABLE_ALL
    session = ort.InferenceSession(
        str(model_path), sess_options=opts, providers=providers
    )
    print(f"[manga_masker] providers: {session.get_providers()}")
    return session


# ---------------------------------------------------------------------------
# Internal helpers
# ---------------------------------------------------------------------------


def _boxes_to_mask(
    image_size: tuple[int, int],
    boxes: Sequence[BBox],
    box_format: Literal["xyxy", "xywh"] = "xyxy",
    dilation: int = 4,
) -> Image.Image:
    """Render bounding boxes onto a black mask (white = erase)."""
    mask = Image.new("L", image_size, 0)
    draw = ImageDraw.Draw(mask)
    for box in boxes:
        if box_format == "xywh":
            x, y, w, h = box
            box = (x, y, x + w, y + h)
        x1, y1, x2, y2 = box
        draw.rectangle(
            [x1 - dilation, y1 - dilation, x2 + dilation, y2 + dilation],
            fill=255,
        )
    return mask


def _pad_to_multiple(
    arr: np.ndarray, multiple: int = 8
) -> tuple[np.ndarray, tuple[int, int]]:
    _, _, h, w = arr.shape
    pad_h = (multiple - h % multiple) % multiple
    pad_w = (multiple - w % multiple) % multiple
    if pad_h or pad_w:
        arr = np.pad(arr, ((0, 0), (0, 0), (0, pad_h), (0, pad_w)), mode="reflect")
    return arr, (pad_h, pad_w)


def _to_image(src: Image.Image | np.ndarray) -> Image.Image:
    if isinstance(src, np.ndarray):
        return Image.fromarray(src)
    return src


def _inpaint(
    session: ort.InferenceSession,
    image: Image.Image,
    mask: Image.Image,
) -> Image.Image:
    """Core inpainting call – both inputs must already be PIL Images."""
    orig_w, orig_h = image.size

    # image → float32 NCHW [0,1]
    img_arr = np.array(image.convert("RGB"), dtype=np.float32) / 255.0
    img_t = img_arr.transpose(2, 0, 1)[np.newaxis]  # (1,3,H,W)

    # mask → float32 NCHW binary
    msk_arr = np.array(mask.convert("L"), dtype=np.float32) / 255.0
    msk_t = (msk_arr >= 0.5).astype(np.float32)[np.newaxis, np.newaxis]  # (1,1,H,W)

    # pad to multiple of 8 (required by FFT layers)
    img_t, _ = _pad_to_multiple(img_t)
    msk_t, _ = _pad_to_multiple(msk_t)

    # build feed dict by inspecting model input names
    input_names = [i.name for i in session.get_inputs()]
    output_names = [o.name for o in session.get_outputs()]
    feed = {name: (msk_t if "mask" in name.lower() else img_t) for name in input_names}

    out = session.run(output_names, feed)[0]  # (1,3,H_pad,W_pad)

    # postprocess: unpad, clip, convert
    result = out[0].transpose(1, 2, 0)  # HWC
    result = np.clip(result, 0.0, 1.0)
    result = (result * 255).round().astype(np.uint8)
    return Image.fromarray(result[:orig_h, :orig_w], "RGB")


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------


def erase_text(
    session: ort.InferenceSession,
    image: Image.Image | np.ndarray,
    boxes: Sequence[BBox],
    *,
    box_format: Literal["xyxy", "xywh"] = "xyxy",
    dilation: int = 4,
) -> Image.Image:
    """
    Erase text from a manga image given detected bounding boxes.

    Parameters
    ----------
    session    : session from :func:`load_session`
    image      : manga page – PIL Image or H×W×3 uint8 ndarray
    boxes      : text bounding boxes from your detector
    box_format : ``"xyxy"`` (x1,y1,x2,y2) or ``"xywh"`` (x,y,width,height)
    dilation   : pixels to expand each box before inpainting (catches edge
                 pixels the detector may have clipped)

    Returns
    -------
    PIL.Image.Image  –  cleaned page, same size as input

    Example
    -------
    >>> session = load_session("models/lama_manga.onnx")
    >>> img = Image.open("page.png")
    >>> boxes = [(120, 45, 300, 90), (80, 200, 250, 260)]  # from your detector
    >>> result = erase_text(session, img, boxes)
    >>> result.save("page_clean.png")
    """
    image = _to_image(image)
    mask = _boxes_to_mask(image.size, boxes, box_format=box_format, dilation=dilation)
    return _inpaint(session, image, mask)


def erase_text_with_mask(
    session: ort.InferenceSession,
    image: Image.Image | np.ndarray,
    mask: Image.Image | np.ndarray,
) -> Image.Image:
    """
    Erase text using a pre-built binary mask (white = erase, black = keep).

    Use this when your pipeline already produces a pixel mask rather than boxes.

    Parameters
    ----------
    session : session from :func:`load_session`
    image   : manga page – PIL Image or H×W×3 uint8 ndarray
    mask    : binary mask – PIL Image or H×W / H×W×1 uint8 ndarray

    Returns
    -------
    PIL.Image.Image  –  cleaned page, same size as input
    """
    image = _to_image(image)
    if isinstance(mask, np.ndarray):
        if mask.ndim == 3:
            mask = mask[:, :, 0]
        mask = Image.fromarray(mask)
    mask = mask.resize(image.size, Image.NEAREST)
    return _inpaint(session, image, mask)
