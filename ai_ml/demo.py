"""End-to-end AI demo for SIH 2026.

Usage:
    python -m ai_ml.demo <image_path>

Example:
    python -m ai_ml.demo C:\\tmp\\ror_sample.png

The demo runs the full AI pipeline:
    image -> preprocessing -> OCR -> OCR post-processing ->
    extraction -> normalization -> validation -> confidence/risk ->
    anomaly detection -> explainability -> structured output

Requirements:
- A compatible PaddleOCR runtime (Linux/WSL/cloud recommended for CPU).
- On Windows CPU, PaddleOCR inference may be impractically slow or fail
  due to upstream PaddlePaddle/oneDNN limitations.

If PaddleOCR is unavailable or inference fails, the demo exits with a clear
message rather than fabricating OCR output.
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path
from typing import Any, Optional

from ai_ml.analysis.analyzer import Analyzer
from ai_ml.analysis.result import AnalysisResult
from ai_ml.extraction.exceptions import InvalidOCRResultError
from ai_ml.inference.document_inference import DocumentAIInference
from ai_ml.ocr.config import OCRConfig
from ai_ml.ocr.paddle_engine import PaddleOCREngine
from ai_ml.ocr.validation import OCRValidationUnavailableError, _check_paddleocr_available
from ai_ml.preprocessing.pipeline import run as run_preprocessing


def _check_preprocessing_available() -> bool:
    try:
        from ai_ml.preprocessing.pipeline import run as _run  # noqa: F401
        return True
    except ImportError:
        return False


def _check_extraction_available() -> bool:
    try:
        from ai_ml.pipeline.extraction_pipeline import ExtractionPipeline  # noqa: F401
        return True
    except ImportError:
        return False


def _check_anomaly_available() -> bool:
    try:
        from ai_ml.anomaly.isolation_forest import AnomalyModel  # noqa: F401
        return True
    except ImportError:
        return False


def _check_explainability_available() -> bool:
    try:
        from ai_ml.anomaly.explainer import Explainer  # noqa: F401
        return True
    except ImportError:
        return False


def _summarize(result: AnalysisResult) -> dict[str, Any]:
    """Create a demo-friendly summary of an AnalysisResult."""
    extraction = result.extraction_result
    record = getattr(extraction, "record", None)

    metadata_fields: dict[str, Any] = {}
    if record is not None and hasattr(record, "metadata") and record.metadata is not None:
        for field_name in [
            "document_id", "state", "district", "tehsil", "village",
            "year", "document_type", "khata_number", "khewat_number",
            "khatoni_number", "mutation_number", "mutation_date", "mutation_details",
        ]:
            value = getattr(record.metadata, field_name, None)
            if value is not None and hasattr(value, "value") and value.value is not None:
                metadata_fields[field_name] = value.value

    parcels: list[dict[str, Any]] = []
    if record is not None and hasattr(record, "parcels"):
        for parcel in record.parcels:
            parcel_fields: dict[str, Any] = {}
            for f in [
                "khasra_number", "area_raw", "area_normalized", "area_unit",
                "land_classification", "land_type", "cultivation_status",
                "irrigation_source", "revenue", "remarks",
            ]:
                value = getattr(parcel, f, None)
                if value is not None and hasattr(value, "value") and value.value is not None:
                    parcel_fields[f] = value.value
            if parcel_fields:
                parcels.append(parcel_fields)

    landholders: list[dict[str, Any]] = []
    if record is not None and hasattr(record, "landholders"):
        for holder in record.landholders:
            holder_fields: dict[str, Any] = {}
            for f in ["name", "father_or_husband_name", "caste", "address", "share", "is_cultivator"]:
                value = getattr(holder, f, None)
                if value is not None and hasattr(value, "value") and value.value is not None:
                    holder_fields[f] = value.value
            if holder_fields:
                landholders.append(holder_fields)

    summary: dict[str, Any] = {
        "status": extraction.status,
        "metadata": metadata_fields,
        "parcels": parcels,
        "landholders": landholders,
        "validation": {
            "error_count": extraction.validation_error_count,
            "warning_count": extraction.validation_warning_count,
        },
        "confidence": {
            "score": result.confidence_score,
            "risk": result.extraction_risk,
        },
        "anomaly": {
            "score": result.anomaly_score,
            "risk": result.anomaly_risk,
        },
        "explainability": result.explainability_evidence,
        "conflicts": extraction.conflicts,
        "warnings": extraction.warnings,
    }
    return summary


def run_demo(image_path: str | Path, languages: Optional[list[str]] = None) -> dict[str, Any]:
    """Run the full AI pipeline on a local image.

    Args:
        image_path: Path to a local image file.
        languages: OCR language codes. Defaults to ["hi", "en"].

    Returns:
        Demo summary dict.

    Raises:
        SystemExit: If PaddleOCR is unavailable or the pipeline fails.
    """
    path = Path(image_path)

    if not path.exists() or not path.is_file():
        print(f"Error: Image file does not exist or is not a file: {path}", file=sys.stderr)
        sys.exit(1)

    if not _check_paddleocr_available():
        print(
            "Error: PaddleOCR is not installed or not available in this environment.\n"
            "The demo requires a compatible PaddleOCR runtime.\n"
            "Recommended: Linux/WSL/cloud environment with PaddleOCR 3.x and PaddlePaddle.\n"
            "Install: pip install paddleocr paddlepaddle",
            file=sys.stderr,
        )
        sys.exit(1)

    if not _check_preprocessing_available():
        print("Error: Preprocessing module is not available.", file=sys.stderr)
        sys.exit(1)

    if not _check_extraction_available():
        print("Error: Extraction pipeline is not available.", file=sys.stderr)
        sys.exit(1)

    languages = languages or ["hi", "en"]

    try:
        ocr_config = OCRConfig(languages=languages)
        ocr_engine = PaddleOCREngine(config=ocr_config)
    except Exception as exc:
        print(f"Error: Failed to initialize OCR engine: {exc}", file=sys.stderr)
        sys.exit(1)

    try:
        preprocessed = run_preprocessing(str(path))
    except Exception as exc:
        print(f"Error: Preprocessing failed: {exc}", file=sys.stderr)
        sys.exit(1)

    if preprocessed.image is None or not isinstance(preprocessed.image, type(preprocessed.image)):
        print("Error: Preprocessing returned an invalid image.", file=sys.stderr)
        sys.exit(1)

    try:
        ocr_result = ocr_engine.recognize(preprocessed.image)
    except OCRValidationUnavailableError as exc:
        print(f"Error: OCR validation unavailable: {exc}", file=sys.stderr)
        sys.exit(1)
    except InvalidOCRResultError as exc:
        print(f"Error: Unreadable document: {exc}", file=sys.stderr)
        sys.exit(1)
    except Exception as exc:
        print(f"Error: OCR inference failed: {exc}", file=sys.stderr)
        sys.exit(1)

    try:
        inference_service = DocumentAIInference(ocr_engine=ocr_engine)
        analysis_result = inference_service.infer(str(path))
    except Exception as exc:
        print(f"Error: Inference pipeline failed: {exc}", file=sys.stderr)
        sys.exit(1)

    summary = _summarize(analysis_result)
    summary["image_path"] = str(path)
    summary["languages"] = languages

    return summary


def main(argv: Optional[list[str]] = None) -> int:
    """CLI entry point for the AI demo."""
    parser = argparse.ArgumentParser(
        description="Run the Bhu-Setu AI pipeline on a scanned RoR image.",
    )
    parser.add_argument(
        "image_path",
        help="Path to a local scanned RoR/Jamabandi image file.",
    )
    parser.add_argument(
        "--languages",
        default="hi,en",
        help="Comma-separated OCR language codes (default: hi,en).",
    )
    parser.add_argument(
        "--json",
        action="store_true",
        help="Output raw JSON instead of formatted text.",
    )
    args = parser.parse_args(argv)

    languages = [lang.strip() for lang in args.languages.split(",") if lang.strip()]
    summary = run_demo(args.image_path, languages=languages)

    if args.json:
        print(json.dumps(summary, indent=2, default=str))
    else:
        _print_summary(summary)

    return 0


def _print_summary(summary: dict[str, Any]) -> None:
    """Print a human-readable demo summary."""
    print("=" * 60)
    print("Bhu-Setu AI Pipeline Demo")
    print("=" * 60)
    print(f"Image: {summary.get('image_path', 'unknown')}")
    print(f"Languages: {summary.get('languages', [])}")
    print()

    print("--- Metadata ---")
    for key, value in summary.get("metadata", {}).items():
        print(f"  {key}: {value}")

    print()
    print("--- Parcels ---")
    for idx, parcel in enumerate(summary.get("parcels", []), start=1):
        print(f"  Parcel {idx}:")
        for key, value in parcel.items():
            print(f"    {key}: {value}")

    print()
    print("--- Landholders ---")
    for idx, holder in enumerate(summary.get("landholders", []), start=1):
        print(f"  Landholder {idx}:")
        for key, value in holder.items():
            print(f"    {key}: {value}")

    print()
    print("--- Validation ---")
    validation = summary.get("validation", {})
    print(f"  Errors: {validation.get('error_count', 0)}")
    print(f"  Warnings: {validation.get('warning_count', 0)}")

    print()
    print("--- Confidence / Risk ---")
    confidence = summary.get("confidence", {})
    print(f"  Score: {confidence.get('score')}")
    print(f"  Risk: {confidence.get('risk')}")

    print()
    print("--- Anomaly ---")
    anomaly = summary.get("anomaly", {})
    print(f"  Score: {anomaly.get('score')}")
    print(f"  Risk: {anomaly.get('risk')}")

    print()
    print("--- Explainability ---")
    explainability = summary.get("explainability", {})
    if explainability:
        for key, value in explainability.items():
            print(f"  {key}: {value}")
    else:
        print("  (none)")

    print()
    print("--- Conflicts ---")
    conflicts = summary.get("conflicts", [])
    if conflicts:
        for conflict in conflicts:
            print(f"  {conflict}")
    else:
        print("  (none)")

    print()
    print("--- Warnings ---")
    warnings = summary.get("warnings", [])
    if warnings:
        for warning in warnings:
            print(f"  {warning}")
    else:
        print("  (none)")

    print()
    print("=" * 60)


if __name__ == "__main__":
    sys.exit(main())
