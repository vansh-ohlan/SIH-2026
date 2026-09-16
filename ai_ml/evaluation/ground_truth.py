"""Ground-truth benchmark evaluation for real document benchmarks."""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any, Optional

from ai_ml.evaluation.evaluator import ExtractionEvaluator
from ai_ml.evaluation.error_analysis import analyze_field_errors, generate_error_report


def load_ground_truth(path: str | Path) -> dict[str, Any]:
    """Load a ground-truth JSON file.

    Expected format:
    {
      "document_id": "...",
      "state": "...",
      "district": "...",
      ...
      "landholders": [
        {"name": "...", "share": "..."}
      ],
      "parcels": [
        {"khasra_number": "...", "area_raw": "..."}
      ]
    }

    Args:
        path: Path to a JSON ground-truth file.

    Returns:
        Ground-truth dict.
    """
    path = Path(path)
    if not path.exists():
        raise FileNotFoundError(f"Ground-truth file not found: {path}")
    with open(path, "r", encoding="utf-8") as fh:
        return json.load(fh)


def evaluate_benchmark(
    prediction: Any,
    ground_truth: dict[str, Any],
    metadata: Optional[dict[str, Any]] = None,
) -> dict[str, Any]:
    """Evaluate a single benchmark prediction against ground truth.

    Args:
        prediction: Predicted ExtractionResult or dict with a ``record`` key.
        ground_truth: Ground-truth dict loaded from JSON.
        metadata: Optional benchmark metadata (image path, timestamp, etc.).

    Returns:
        JSON-serializable benchmark report.
    """
    evaluator = ExtractionEvaluator()
    raw_evaluation = evaluator.evaluate(prediction, ground_truth)

    predicted_fields: dict[str, Any] = {}
    record = getattr(prediction, "record", None)
    if record is None and isinstance(prediction, dict):
        record = prediction.get("record", prediction)
    if record is not None and hasattr(record, "parcels"):
        for idx, parcel in enumerate(record.parcels):
            for f in [
                "khasra_number", "area_raw", "area_normalized", "area_unit",
                "land_classification", "land_type", "cultivation_status",
                "irrigation_source", "revenue", "remarks",
            ]:
                value = getattr(parcel, f, None)
                predicted_fields[f"parcels[{idx}].{f}"] = value.value if value is not None else None
        for idx, holder in enumerate(record.landholders):
            for f in ["name", "father_or_husband_name", "caste", "address", "share", "is_cultivator"]:
                value = getattr(holder, f, None)
                predicted_fields[f"landholders[{idx}].{f}"] = value.value if value is not None else None
        for f in [
            "document_id", "state", "district", "tehsil", "village",
            "year", "document_type", "khata_number", "khewat_number",
            "khatoni_number", "mutation_number", "mutation_date", "mutation_details",
        ]:
            value = getattr(record.metadata, f, None) if hasattr(record, "metadata") and record.metadata else None
            predicted_fields[f] = value.value if value is not None else None

    gt_fields: dict[str, Any] = {}
    _flatten_ground_truth(ground_truth, gt_fields, prefix="")

    field_error_report = analyze_field_errors(predicted_fields, gt_fields)
    error_report = generate_error_report(field_error_report)

    report: dict[str, Any] = {
        "evaluation_type": "real_document_benchmark",
        "description": (
            "Evaluation of AI predictions against manually prepared ground truth "
            "for a real/local document. This is separate from synthetic/fixture evaluation."
        ),
        "metadata": metadata or {},
        "overall_accuracy": raw_evaluation.get("overall_accuracy"),
        "overall_normalized_match": raw_evaluation.get("overall_normalized_match"),
        "coverage": raw_evaluation.get("coverage", {}).get("coverage"),
        "field_metrics": raw_evaluation.get("field_metrics", {}),
        "parcel_metrics": raw_evaluation.get("parcel_metrics", {}),
        "landholder_metrics": raw_evaluation.get("landholder_metrics", {}),
        "table_row_metrics": raw_evaluation.get("table_row_metrics", {}),
        "error_analysis": error_report,
        "failing_fields": [
            {
                "field": field,
                "predicted": metrics.get("predicted_value"),
                "ground_truth": metrics.get("ground_truth_value"),
                "status": metrics.get("status"),
            }
            for field, metrics in raw_evaluation.get("field_metrics", {}).items()
            if not metrics.get("exact_match", False)
        ],
    }

    return report


def _flatten_ground_truth(source: Any, output: dict[str, Any], prefix: str) -> None:
    if isinstance(source, dict):
        for key, value in source.items():
            new_prefix = f"{prefix}.{key}" if prefix else key
            _flatten_ground_truth(value, output, new_prefix)
    elif isinstance(source, list):
        for idx, item in enumerate(source):
            new_prefix = f"{prefix}[{idx}]"
            _flatten_ground_truth(item, output, new_prefix)
    else:
        output[prefix] = source


def run_ground_truth_benchmark(
    image_paths: list[str | Path],
    ground_truth_paths: list[str | Path],
    languages: Optional[list[str]] = None,
) -> dict[str, Any]:
    """Run ground-truth benchmark on multiple images.

    Args:
        image_paths: List of local image file paths.
        ground_truth_paths: Corresponding list of ground-truth JSON file paths.
        languages: OCR language codes. Defaults to ["hi", "en"].

    Returns:
        JSON-serializable benchmark report.
    """
    if len(image_paths) != len(ground_truth_paths):
        raise ValueError("image_paths and ground_truth_paths must have the same length.")

    from ai_ml.evaluation.benchmark import run_benchmark_on_image

    reports = []
    for image_path, gt_path in zip(image_paths, ground_truth_paths):
        try:
            bench_result = run_benchmark_on_image(image_path, languages=languages)
            ground_truth = load_ground_truth(gt_path)
            prediction = bench_result.analysis_result or bench_result
            evaluation = evaluate_benchmark(
                prediction,
                ground_truth,
                metadata={"image_path": str(image_path), "ground_truth_path": str(gt_path)},
            )
            reports.append(evaluation)
        except Exception as exc:
            reports.append({
                "evaluation_type": "real_document_benchmark",
                "error": str(exc),
                "metadata": {
                    "image_path": str(image_path),
                    "ground_truth_path": str(gt_path),
                },
            })

    successful = [r for r in reports if "error" not in r]
    failed = [r for r in reports if "error" in r]

    summary = {
        "evaluation_type": "real_document_benchmark",
        "description": (
            "Ground-truth benchmark using manually prepared JSON files for real/local documents. "
            "Separate from synthetic/fixture evaluation."
        ),
        "total_documents": len(reports),
        "successful": len(successful),
        "failed": len(failed),
        "reports": reports,
    }

    if successful:
        accuracies = [r["overall_accuracy"] for r in successful if r.get("overall_accuracy") is not None]
        if accuracies:
            summary["avg_accuracy"] = sum(accuracies) / len(accuracies)

    return summary
