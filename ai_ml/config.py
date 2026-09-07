"""Configuration settings for the AI/ML module."""

from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent

# Placeholder configuration values
OCR_MODEL_PATH = BASE_DIR / "models"
UPLOAD_DIR = BASE_DIR / "data" / "uploads"
OUTPUT_DIR = BASE_DIR / "data" / "outputs"
