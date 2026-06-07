import logging
import os
from logging.handlers import TimedRotatingFileHandler

from dotenv import load_dotenv
from pydantic_settings import BaseSettings

load_dotenv()


def configure_logging():
    os.makedirs("./logs", exist_ok=True)
    # Create a TimedRotatingFileHandler
    handler = TimedRotatingFileHandler(
        "./logs/comic-translator.log",  # Log file path
        when="midnight",  # Rotate at midnight
        interval=1,  # Every 1 day
        backupCount=7,  # Keep last 7 days of logs
    )

    # Create a formatter
    formatter = logging.Formatter(
        "%(asctime)s - %(levelname)s - %(name)s  - %(message)s"
    )
    handler.setFormatter(formatter)
    handler.setLevel(logging.INFO)

    # Get the root logger
    root_logger = logging.getLogger()
    root_logger.setLevel(logging.DEBUG)  # Set the logging level globally
    root_logger.addHandler(handler)

    # Optional: Adding console logging
    console_handler = logging.StreamHandler()
    console_handler.setFormatter(formatter)
    console_handler.setLevel(logging.INFO)
    root_logger.addHandler(console_handler)

    # detailed logs
    detailed_handler = TimedRotatingFileHandler(
        "./logs/detailed.comic-translator.log",  # Log file path
        when="midnight",  # Rotate at midnight
        interval=1,  # Every 1 day
        backupCount=7,  # Keep last 7 days of logs
    )
    detailed_handler.setFormatter(formatter)
    detailed_handler.setLevel(logging.DEBUG)
    root_logger.addHandler(detailed_handler)


class Settings(BaseSettings):
    APP_VERSION: str = "0.1.0"
    APP_NAME: str = "Comic Translator"
    APP_DESCRIPTION: str = "A tool to translate comic pages"
    HF_TOKEN: str
    BUBBLE_DETECTION_MODEL_ID: str = "ogkalu/comic-text-and-bubble-detector"
    OCR_MODEL: str = "SmolVLM2-2.2B-Instruct-GGUF"
    LLM_BASE_URL: str = "http://localhost:8080"
    LLM_API_KEY: str = "local-ai"
    TRANSLATION_MODEL: str = "Sugoi-14B-Ultra-GGUF"

settings = Settings()
