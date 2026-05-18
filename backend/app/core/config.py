from pydantic_settings import BaseSettings
from dotenv import load_dotenv

load_dotenv()


class Settings(BaseSettings):
    HF_TOKEN: str
    BUBBLE_DETECTION_MODEL_ID: str = "ogkalu/comic-text-and-bubble-detector"
    OCR_MODEL: str = "GLM-OCR-GGUF"
    LLM_BASE_URL: str = "http://localhost:8080"
    LLM_API_KEY: str = "local-ai"
    TRANSLATION_MODEL: str = "Qwen3-14B-GGUF"


settings = Settings()
