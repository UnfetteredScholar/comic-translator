# Comic Translator

A free, local-first tool for translating comic and manga pages. Upload a page, detect speech bubbles, extract text with OCR, translate it, then export a new image with the translated text redrawn in place.

## Demo

https://github.com/user-attachments/assets/692ce7db-2ee7-436c-8db6-ead0a677713e

## Features

- Interactive workflow: upload → detect → OCR → translate → review → export
- Automatic speech-bubble / text-region detection
- Vision-model OCR and LLM-based translation via an OpenAI-compatible local API
- Editable bounding boxes and text before export
- Font selection for redrawn dialogue
- Batch translation of comic archives (ZIP) via the API
- FastAPI backend + React / Vite frontend

## Architecture

                 ┌──────────────┐
                 │ React Client │
                 └──────┬───────┘
                        │
                        ▼
                 ┌──────────────┐
                 │   FastAPI    │
                 └──────┬───────┘
                        │
             ┌──────────┼───────────┐
             ▼          ▼           ▼
         Detection     OCR      Translation
             │          │           │
             └──────────┼───────────┘
                        ▼
                   Inpainting
                        │
                        ▼
                   Redrawing
                        │
                        ▼
                  Translated Image

                  
## How it works

```text
Image
  → Detect text regions (RT-DETR bubble detector)
  → OCR each region (SmolVLM2)
  → Translate text (Sugoi)
  → Optionally inpaint old text (LaMa manga ONNX)
  → Redraw translated text into bubbles
  → Export image
```

## Stack

| Layer    | Tech |
|----------|------|
| Frontend | React 19, TypeScript, Vite, Tailwind CSS, TanStack Query |
| Backend  | Python 3.12+, FastAPI, Pillow, OpenCV, Transformers, ONNX Runtime |
| Models   | Hugging Face bubble detector, local GGUF OCR/translation models, LaMa manga inpainter |

Default models (configurable via env):

- **Detection:** [`ogkalu/comic-text-and-bubble-detector`](https://huggingface.co/ogkalu/comic-text-and-bubble-detector)
- **OCR:** `SmolVLM2-2.2B-Instruct-GGUF` (served at `LLM_BASE_URL`)
- **Translation:** `Sugoi-14B-Ultra-GGUF` (same local API)
- **Inpainting:** `lama-manga-dynamic.onnx` from [`ogkalu/lama-manga-onnx-dynamic`](https://huggingface.co/ogkalu/lama-manga-onnx-dynamic)

## Prerequisites

- Python **3.12+**
- [uv](https://docs.astral.sh/uv/) (recommended) or another Python package manager
- Node.js **18+** and npm
- A Hugging Face token with access to the detection / mask models
- An OpenAI-compatible LLM server (e.g. [llama.cpp](https://github.com/ggerganov/llama.cpp) server) on `http://localhost:8080` serving the OCR and translation models
- GPU strongly recommended (this repo’s defaults target **AMD ROCm** on Linux; CUDA/CPU setups will need dependency adjustments)

## Setup

### 1. Clone

```bash
git clone https://github.com/UnfetteredScholar/comic-translator.git
cd comic-translator
```

### 2. Backend

```bash
cd backend
uv sync
```

Create `backend/.env`:

```env
HF_TOKEN=hf_your_token_here
BUBBLE_DETECTION_MODEL_ID=ogkalu/comic-text-and-bubble-detector
OCR_MODEL=SmolVLM2-2.2B-Instruct-GGUF
TRANSLATION_MODEL=Sugoi-14B-Ultra-GGUF
LLM_BASE_URL=http://localhost:8080
LLM_API_KEY=local-ai
MASK_MODEL=lama-manga-dynamic.onnx
```

Download the inpainting model into `backend/app/models/` (or the path in `MODELS_DIR`):

```bash
uv run python -c "
from huggingface_hub import hf_hub_download
hf_hub_download(
    'ogkalu/lama-manga-onnx-dynamic',
    'lama_manga.onnx',
    local_dir='app/models',
)
"
```

Rename or set `MASK_MODEL` to match the downloaded filename if needed (default expects `lama-manga-dynamic.onnx`).

### 3. Local LLM server

Start an OpenAI-compatible server that exposes `/v1/chat/completions` and can load both the OCR and translation GGUF models. Point `LLM_BASE_URL` / model names at whatever you serve.

### 4. Frontend

```bash
cd frontend
cp .env.example .env.local
npm install
```

`.env.local` defaults to proxying API calls through Vite:

```env
VITE_API_BASE=/api
```

## Running

From `backend/app/` (API on port **8000**):

```bash
cd backend/app
uv run fastapi dev main.py
# or: uv run uvicorn main:app --reload
```

From `frontend/` (UI on port **5173**):

```bash
cd frontend
npm run dev
```

Open [http://localhost:5173](http://localhost:5173). The Vite dev server proxies `/api/*` to `http://localhost:8000`.

Health check: [http://localhost:8000/health](http://localhost:8000/health)  
API docs: [http://localhost:8000/docs](http://localhost:8000/docs)

## Project layout

```text
comic-translator/
├── backend/
│   ├── app/
│   │   ├── api/v1/routers/   # health + image endpoints
│   │   ├── image_translator/ # detection, OCR, translate, inpaint, pipeline
│   │   ├── schema/           # request/response models, fonts
│   │   ├── fonts/            # bundled redraw fonts
│   │   ├── models/           # ONNX weights (gitignored)
│   │   └── main.py
│   ├── example/              # sample API payloads
│   └── pyproject.toml
└── frontend/
    └── src/                  # React UI and API client
```

## Main API endpoints

| Method | Path | Description |
|--------|------|-------------|
| `GET`  | `/health` | Service health |
| `POST` | `/image/extract-text-regions` | Detect speech bubbles / text boxes |
| `POST` | `/image/extract-text` | OCR text inside boxes |
| `POST` | `/image/translate-text-list` | Translate extracted strings |
| `POST` | `/image/mask-image` | Inpaint text regions |
| `POST` | `/image/replace-image-text` | Draw translated text onto the page |
| `POST` | `/image/translate-image` | Full single-image pipeline |
| `POST` | `/image/translate-image-set` | Translate a ZIP of pages |

Example request/response JSON lives under [`backend/example/`](backend/example/).


## Engineering Decisions

### Why local inference?

Comics and manga are copyrighted, and many pages people want to translate are personal scans. Running detection, OCR, translation, and inpainting on your own machine keeps pages off third-party APIs, avoids per-page cloud costs, and lets you swap models without changing the app. The OCR and translation models are served as GGUF files behind an OpenAI-compatible local server (e.g. llama.cpp); the bubble detector and LaMa inpainter run in-process.

If a user wants to use a cloud hosted model, Comic Translator can be configured to work with any OpenAI compatible API by settings required envs.

### Why FastAPI?

The backend is a thin orchestration layer over heavy model calls. FastAPI gives typed request/response schemas that match the frontend types, automatic OpenAPI docs at `/docs`, and simple multipart handling for single-image and ZIP uploads. CORS is left open for local development; the Vite dev server also proxies `/api` to the backend so the UI can call relative paths without CORS friction.

### Why separate pipeline stages?

Comic OCR and translation are imperfect. Detection often needs a human nudge: move a box, add a missed bubble, drop a false positive, fix a bad OCR string, or tweak a translation before redraw. The UI therefore walks **detect → OCR → translate → review → export**, with each stage as its own endpoint so intermediate results stay editable.

The same stages are composed into one-shot paths (`/image/translate-image`, `/image/translate-image-set`) when you want throughput over review — e.g. translating a whole chapter ZIP without opening the UI.

### How are models configured?

All model IDs and paths come from environment variables via `backend/app/core/config.py` (loaded from `.env`):

| Setting | Role |
|---------|------|
| `BUBBLE_DETECTION_MODEL_ID` | Hugging Face RT-DETR comic bubble detector |
| `OCR_MODEL` / `TRANSLATION_MODEL` | GGUF model names expected by the local LLM server |
| `LLM_BASE_URL` / `LLM_API_KEY` | OpenAI-compatible server for OCR + translation |
| `MODELS_DIR` / `MASK_MODEL` | On-disk LaMa ONNX weights for inpainting |

Defaults favor a JP→EN manga workflow (SmolVLM2 for OCR, Sugoi for translation) but can be pointed at whatever your local server exposes.

### How do you handle large images?

OCR runs **one crop per bubble**, which is slower but more reliable than page-level OCR on dense layouts.

Pages are processed at full resolution — there is no downscale or tile step in the pipeline. Detection and inpainting see the original page; the frontend only scales for display overlays. Translation batches strings by estimated token cost against an 8192-token context budget (with a safety margin) so long pages with many bubbles do not blow llama.cpp’s KV cache.

### What happens when inference fails?

API handlers catch exceptions and return HTTP 500 with a short error detail. Translation is more defensive: list output is constrained with a llama.cpp JSON grammar, then cleaned (fences, curly quotes, trailing commas) before parse. If a batch still fails to parse, that call can degrade to an empty list rather than crashing mid-page — so always spot-check batch ZIP output. The `/health` endpoint is a liveness check only; it does not probe the LLM server or model weights.

### Why ONNX for inpainting?

Early redraw paths filled bubbles with a white rectangle. That looked wrong on textured or drawn backgrounds. The current path (`replace_text_boxes_v3`) uses a manga-tuned LaMa model to erase the old glyphs, then fits and centers the new text with Pillow (binary-search font size, word wrap). Shipping LaMa as ONNX keeps inpainting portable across ROCm, CUDA, DirectML, and CPU providers without a second PyTorch training stack. This repo’s Python deps default to **AMD ROCm**; CUDA/CPU users may need to swap the torch / onnxruntime packages.

### How does batch translation work?

`POST /image/translate-image-set` accepts a ZIP of page images plus a target language and optional font. For each image in the archive it runs detection → per-bubble OCR → batched translation → inpaint + redraw, then returns a new ZIP. Output archives are prefixed with `[MTL]` so machine-translated sets are easy to tell apart from the source. This path skips the interactive review loop; use the step endpoints (or the UI) when accuracy matters more than speed.

## License

[MIT](LICENSE) © [Ato Toffah](mailto:atotoffah@gmail.com)
