"""Evaluation CLI entry point.

Usage:
    python -m ai_ml.evaluation [dataset_name]

Available datasets:
    clean_ror, mixed_script, noisy_ocr, missing_field, multi_parcel

If no dataset name is provided, all datasets are evaluated.

NOTE:
    These evaluations use deterministic synthetic prediction fixtures with
    controlled errors. They are NOT real-world model accuracy benchmarks.
    They exist to validate the evaluation framework itself.
"""

from __future__ import annotations

import json
import sys

from ai_ml.evaluation.evaluator import ExtractionEvaluator
from ai_ml.evaluation.report import generate_report, to_json
from ai_ml.evaluation.synthetic import get_all_datasets, get_all_predictions


def main(argv: list[str] | None = None) -> int:
    """Run evaluation on synthetic datasets using controlled prediction fixtures."""
    argv = argv or sys.argv[1:]

    ground_truths = get_all_datasets()
    predictions = get_all_predictions()

    if argv:
        selected_gt = {}
        selected_pred = {}
        for name in argv:
            if name in ground_truths:
                selected_gt[name] = ground_truths[name]
                selected_pred[name] = predictions.get(name, {})
            else:
                print(f"Unknown dataset: {name}", file=sys.stderr)
                print(f"Available: {list(ground_truths.keys())}", file=sys.stderr)
                return 1
    else:
        selected_gt = ground_truths
        selected_pred = predictions

    evaluator = ExtractionEvaluator()
    all_reports = {}

    for dataset_name, ground_truth in selected_gt.items():
        predicted = selected_pred.get(dataset_name, {})
        raw_result = evaluator.evaluate(predicted, ground_truth)
        report = generate_report(
            raw_result,
            title=f"Synthetic evaluation fixture: {dataset_name}",
        )
        all_reports[dataset_name] = report

    output = {
        "evaluation_type": "synthetic_evaluation_fixtures",
        "description": (
            "Deterministic controlled-error prediction fixtures used to validate "
            "the evaluation framework. NOT real-world model accuracy benchmarks."
        ),
        "datasets_evaluated": len(all_reports),
        "reports": all_reports,
    }

    print(to_json(output))
    return 0


if __name__ == "__main__":
    sys.exit(main())
