"""Developer-only OCR Smoke Test script.

This script tests the low-level PaddleOCR engine adapter (ai_ml.ocr.paddle_engine)
against a local scanned RoR / Jamabandi image file.

Usage:
    python scripts/ocr_smoke_test.py --image "C:\\tmp\\ror_sample.png"

    Or in Linux / WSL:
    python scripts/ocr_smoke_test.py --image "/tmp/ror_sample.png"
"""

from __future__ import annotations

import argparse
import sys
import time
from pathlib import Path
from typing import Any, Optional

import cv2
import numpy as np

# Import existing AI OCR adapter
try:
    from ai_ml.ocr.config import OCRConfig
    from ai_ml.ocr.exceptions import OCREngineUnavailableError, OCRInferenceError
    from ai_ml.ocr.paddle_engine import PaddleOCREngine
    HAS_OCR_ENGINE = True
except ImportError as err:
    HAS_OCR_ENGINE = False
    OCR_IMPORT_ERROR = str(err)


def run_ocr_smoke_test(image_path: str | Path, languages: Optional[list[str]] = None) -> int:
    """Run PaddleOCR engine smoke test on specified image.

    Args:
        image_path: Path to local document image file.
        languages: Optional list of language codes. Defaults to ["hi", "en"].

    Returns:
        0 on success, non-zero exit code on failure.
    """
    path = Path(image_path).resolve()
    if not path.exists() or not path.is_file():
        print(f"[OCR Smoke Test ERROR] Image file does not exist: {path}", file=sys.stderr)
        return 1

    if not HAS_OCR_ENGINE:
        print(
            f"[OCR Smoke Test ERROR] Could not import ai_ml.ocr module: {OCR_IMPORT_ERROR}",
            file=sys.stderr,
        )
        return 2

    languages = languages or ["hi", "en"]
    print(f"[OCR Smoke Test] Target Image : {path}")
    print(f"[OCR Smoke Test] Languages    : {languages}")
    print("[OCR Smoke Test] Loading image via OpenCV...")

    img = cv2.imread(str(path))
    if img is None:
        print(
            f"[OCR Smoke Test ERROR] OpenCV could not decode image at {path}. Check file format.",
            file=sys.stderr,
        )
        return 3

    h, w = img.shape[:2]
    print(f"[OCR Smoke Test] Image Dimensions: {w}x{h} px")
    print("[OCR Smoke Test] Initializing PaddleOCR Engine adapter...")

    start_init = time.perf_counter()
    try:
        config = OCRConfig(languages=languages)
        engine = PaddleOCREngine(config=config)
        engine._initialize()
    except OCREngineUnavailableError as err:
        print(
            f"\n[OCR Smoke Test ERROR] PaddleOCR Engine Unavailable:\n{err}\n"
            "Ensure PaddleOCR and PaddlePaddle are installed in your environment:\n"
            "  pip install paddleocr paddlepaddle",
            file=sys.stderr,
        )
        return 4
    except Exception as err:
        print(f"\n[OCR Smoke Test ERROR] Initialization failed: {err}", file=sys.stderr)
        return 4
    init_duration = time.perf_counter() - start_init
    print(f"[OCR Smoke Test] Engine Initialized in {init_duration:.2f}s")

    print("[OCR Smoke Test] Executing PaddleOCR inference...")
    start_infer = time.perf_counter()
    try:
        ocr_result = engine.recognize(img)
    except OCRInferenceError as err:
        print(f"\n[OCR Smoke Test ERROR] Inference failed: {err}", file=sys.stderr)
        return 5
    except Exception as err:
        print(f"\n[OCR Smoke Test ERROR] Unexpected OCR error: {err}", file=sys.stderr)
        return 5
    infer_duration = time.perf_counter() - start_infer

    # Compute stats
    num_pages = len(ocr_result.pages)
    total_blocks = 0
    total_lines = 0
    total_words = 0
    confidences: list[float] = []

    for page in ocr_result.pages:
        total_blocks += len(page.blocks)
        for block in page.blocks:
            total_lines += len(block.lines)
            for line in block.lines:
                for word in line.words:
                    total_words += 1
                    if word.confidence is not None:
                        confidences.append(word.confidence)

    avg_conf = sum(confidences) / len(confidences) if confidences else 0.0

    print("\n========================================================")
    print("                PADDLEOCR ENGINE SMOKE TEST RESULT       ")
    print("========================================================")
    print(f" Status               : SUCCESS")
    print(f" Initialization Time  : {init_duration:.2f} seconds")
    print(f" Inference Runtime    : {infer_duration:.2f} seconds")
    print(f" Total Pages Processed: {num_pages}")
    print(f" Detected Blocks      : {total_blocks}")
    print(f" Detected Text Lines  : {total_lines}")
    print(f" Recognized Words     : {total_words}")
    print(f" Average Confidence   : {avg_conf:.4f} ({avg_conf*100:.1f}%)")
    print("--------------------------------------------------------")
    print(" Privacy Safeguard    : Unredacted text and citizen PII hidden.")
    print("========================================================\n")

    return 0


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Run low-level PaddleOCR smoke test on a local image."
    )
    parser.add_argument(
        "--image",
        "-i",
        required=True,
        help="Path to scanned RoR/Jamabandi image file (e.g., /tmp/ror_sample.png)",
    )
    parser.add_argument(
        "--languages",
        "-l",
        default="hi,en",
        help="Comma-separated language codes (default: hi,en)",
    )

    args = parser.parse_args()
    langs = [s.strip() for s in args.languages.split(",") if s.strip()]
    code = run_ocr_smoke_test(args.image, languages=langs)
    sys.exit(code)


if __name__ == "__main__":
    main()
