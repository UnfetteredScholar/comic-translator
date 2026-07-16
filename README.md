# Comic Translator

A free, local-first tool for translating comic and manga pages. Upload a page, detect speech bubbles, extract text with OCR, translate it, then export a new image with the translated text redrawn in place.

## Features

- Interactive workflow: upload → detect → OCR → translate → review → export
- Automatic speech-bubble / text-region detection
- Vision-model OCR and LLM-based translation via an OpenAI-compatible local API
- Editable bounding boxes and text before export
- Font selection for redrawn dialogue
- Batch translation of comic archives (ZIP) via the API
- FastAPI backend + React / Vite frontend

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

## License

[MIT](LICENSE) © [Ato Toffah](mailto:atotoffah@gmail.com)
