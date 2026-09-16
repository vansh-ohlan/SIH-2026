"""Tests for ai_ml.evaluation."""

from __future__ import annotations

import pytest

from ai_ml.evaluation.evaluator import ExtractionEvaluator
from ai_ml.evaluation.metrics import (
    compute_coverage,
    exact_match,
    field_accuracy,
    normalize_match,
)
from ai_ml.evaluation.report import generate_report, to_json
from ai_ml.evaluation.synthetic import (
    generate_clean_ror,
    generate_clean_ror_prediction,
    generate_conflicting_values_ground_truth,
    generate_conflicting_values_prediction,
    generate_devanagari_numbers_ground_truth,
    generate_devanagari_numbers_prediction,
    generate_hindi_labels_ground_truth,
    generate_hindi_labels_prediction,
    generate_missing_field_ground_truth,
    generate_missing_field_prediction,
    generate_missing_table_cells_ground_truth,
    generate_missing_table_cells_prediction,
    generate_mixed_script_prediction,
    generate_mixed_script_ror,
    generate_multi_parcel_ground_truth,
    generate_multi_parcel_prediction,
    generate_noisy_ocr_ground_truth,
    generate_noisy_ocr_prediction,
    generate_ocr_whitespace_ground_truth,
    generate_ocr_whitespace_prediction,
    generate_table_rows_ground_truth,
    generate_table_rows_prediction,
    get_all_datasets,
    get_all_predictions,
)


class TestMetrics:
    def test_exact_match_identical(self) -> None:
        assert exact_match("123", "123") is True

    def test_exact_match_whitespace(self) -> None:
        assert exact_match(" 123 ", "123") is True

    def test_exact_match_mismatch(self) -> None:
        assert exact_match("123", "456") is False

    def test_normalize_match_alias(self) -> None:
        assert normalize_match("123", "123") is True
        assert normalize_match("123", "456") is False

    def test_hindi_mixed_script(self) -> None:
        assert exact_match("जयपुर", "जयपुर") is True
        assert exact_match("जयपुर", "Jaipur") is False

    def test_field_accuracy_perfect(self) -> None:
        result = field_accuracy("123", "123")
        assert result["exact_match"] is True
        assert result["status"] == "present"

    def test_field_accuracy_missing_prediction(self) -> None:
        result = field_accuracy(None, "123")
        assert result["exact_match"] is False
        assert result["status"] == "missing_prediction"

    def test_field_accuracy_unexpected_prediction(self) -> None:
        result = field_accuracy("123", None)
        assert result["exact_match"] is False
        assert result["status"] == "unexpected_prediction"

    def test_field_accuracy_both_missing(self) -> None:
        result = field_accuracy(None, None)
        assert result["exact_match"] is True
        assert result["status"] == "both_missing"

    def test_compute_coverage(self) -> None:
        predicted = {"a": "1", "c": "3"}
        ground_truth = {"a": "1", "b": "2", "c": "3", "d": "4"}
        result = compute_coverage(predicted, ground_truth, ["a", "b", "c", "d"])
        assert result["total_ground_truth_fields"] == 4
        assert result["total_predicted_fields"] == 2
        assert result["coverage"] == 0.5


class TestEvaluator:
    def test_perfect_match(self) -> None:
        evaluator = ExtractionEvaluator()
        gt = {
            "khata_number": "123",
            "village": "रामगढ़",
            "parcels": [
                {"khasra_number": "142/1", "area_raw": "2-5-10"}
            ],
        }
        predicted = {"record": {
            "khata_number": "123",
            "village": "रामगढ़",
            "parcels": [
                {"khasra_number": "142/1", "area_raw": "2-5-10"}
            ],
        }}
        result = evaluator.evaluate(predicted, gt)
        assert result["overall_accuracy"] == 1.0
        assert result["coverage"]["coverage"] == 1.0

    def test_exact_mismatch(self) -> None:
        evaluator = ExtractionEvaluator()
        gt = {"khata_number": "123"}
        predicted = {"record": {"khata_number": "456"}}
        result = evaluator.evaluate(predicted, gt)
        assert result["overall_accuracy"] < 1.0

    def test_whitespace_difference(self) -> None:
        evaluator = ExtractionEvaluator()
        gt = {"khata_number": "123"}
        predicted = {"record": {"khata_number": " 123 "}}
        result = evaluator.evaluate(predicted, gt)
        assert result["overall_accuracy"] == 1.0

    def test_hindi_mixed_script_values(self) -> None:
        evaluator = ExtractionEvaluator()
        gt = {"district": "जयपुर"}
        predicted = {"record": {"district": "जयपुर"}}
        result = evaluator.evaluate(predicted, gt)
        assert result["overall_accuracy"] == 1.0

    def test_missing_prediction(self) -> None:
        evaluator = ExtractionEvaluator()
        gt = {"khata_number": "123"}
        predicted = {"record": {}}
        result = evaluator.evaluate(predicted, gt)
        assert result["overall_accuracy"] == 0.0
        assert result["field_metrics"]["khata_number"]["status"] == "missing_prediction"

    def test_optional_fields_not_mandatory(self) -> None:
        evaluator = ExtractionEvaluator()
        gt = {"khata_number": "123"}
        predicted = {"record": {"khata_number": "123"}}
        result = evaluator.evaluate(predicted, gt)
        assert result["overall_accuracy"] == 1.0

    def test_repeated_parcels(self) -> None:
        evaluator = ExtractionEvaluator()
        gt = {
            "parcels": [
                {"khasra_number": "142/1"},
                {"khasra_number": "143/1"},
            ]
        }
        predicted = {
            "record": {
                "parcels": [
                    {"khasra_number": "142/1"},
                    {"khasra_number": "143/1"},
                ]
            }
        }
        result = evaluator.evaluate(predicted, gt)
        assert result["overall_accuracy"] == 1.0

    def test_repeated_landholders(self) -> None:
        evaluator = ExtractionEvaluator()
        gt = {
            "landholders": [
                {"name": "राम"},
                {"name": "कृष्ण"},
            ]
        }
        predicted = {
            "record": {
                "landholders": [
                    {"name": "राम"},
                    {"name": "कृष्ण"},
                ]
            }
        }
        result = evaluator.evaluate(predicted, gt)
        assert result["overall_accuracy"] == 1.0

    def test_empty_records(self) -> None:
        evaluator = ExtractionEvaluator()
        gt = {}
        predicted = {"record": {}}
        result = evaluator.evaluate(predicted, gt)
        assert result["overall_accuracy"] == 1.0

    def test_json_serializable(self) -> None:
        import json
        evaluator = ExtractionEvaluator()
        gt = {"khata_number": "123"}
        predicted = {"record": {"khata_number": "123"}}
        result = evaluator.evaluate(predicted, gt)
        report = generate_report(result)
        json_str = to_json(report)
        assert isinstance(json_str, str)
        parsed = json.loads(json_str)
        assert "overall_accuracy" in parsed


class TestSyntheticData:
    def test_all_datasets_available(self) -> None:
        datasets = get_all_datasets()
        assert "clean_ror" in datasets
        assert "mixed_script" in datasets
        assert "noisy_ocr" in datasets
        assert "missing_field" in datasets
        assert "multi_parcel" in datasets

    def test_all_predictions_available(self) -> None:
        predictions = get_all_predictions()
        assert "clean_ror" in predictions
        assert "mixed_script" in predictions
        assert "noisy_ocr" in predictions
        assert "missing_field" in predictions
        assert "multi_parcel" in predictions

    def test_clean_ror_structure(self) -> None:
        data = generate_clean_ror()
        assert "khata_number" in data
        assert "parcels" in data
        assert len(data["parcels"]) == 1

    def test_multi_parcel_count(self) -> None:
        data = generate_multi_parcel_ground_truth()
        assert len(data["parcels"]) == 5

    def test_deterministic_with_seed(self) -> None:
        r1 = generate_clean_ror(seed=42)
        r2 = generate_clean_ror(seed=42)
        assert r1 == r2

    def test_predictions_not_identical_to_ground_truth(self) -> None:
        gt = generate_noisy_ocr_ground_truth()
        pred = generate_noisy_ocr_prediction()
        assert pred != gt

    def test_missing_field_prediction_reduces_coverage(self) -> None:
        evaluator = ExtractionEvaluator()
        gt = generate_missing_field_ground_truth()
        pred = generate_missing_field_prediction()
        result = evaluator.evaluate(pred, gt)
        assert result["coverage"]["coverage"] < 1.0
        assert result["field_metrics"]["khata_number"]["status"] == "missing_prediction"

    def test_noisy_ocr_prediction_has_mismatches(self) -> None:
        evaluator = ExtractionEvaluator()
        gt = generate_noisy_ocr_ground_truth()
        pred = generate_noisy_ocr_prediction()
        result = evaluator.evaluate(pred, gt)
        assert result["overall_accuracy"] < 1.0

    def test_multi_parcel_mismatch_detected(self) -> None:
        evaluator = ExtractionEvaluator()
        gt = generate_multi_parcel_ground_truth()
        pred = generate_multi_parcel_prediction()
        result = evaluator.evaluate(pred, gt)
        assert result["overall_accuracy"] < 1.0
        # Check that the first parcel mismatch is detected
        first_parcel_metrics = result["field_metrics"].get("parcels[0].khasra_number")
        assert first_parcel_metrics is not None
        assert first_parcel_metrics["exact_match"] is False

    def test_clean_ror_prediction_high_accuracy(self) -> None:
        evaluator = ExtractionEvaluator()
        gt = generate_clean_ror()
        pred = generate_clean_ror_prediction()
        result = evaluator.evaluate(pred, gt)
        # Should be high but not perfect
        assert result["overall_accuracy"] < 1.0
        assert result["overall_accuracy"] > 0.7

    def test_mixed_script_prediction_has_difference(self) -> None:
        evaluator = ExtractionEvaluator()
        gt = generate_mixed_script_ror()
        pred = generate_mixed_script_prediction()
        result = evaluator.evaluate(pred, gt)
        assert result["overall_accuracy"] < 1.0

    def test_evaluation_deterministic(self) -> None:
        evaluator = ExtractionEvaluator()
        gt = generate_clean_ror()
        pred = generate_clean_ror_prediction()
        r1 = evaluator.evaluate(pred, gt)
        r2 = evaluator.evaluate(pred, gt)
        assert r1["overall_accuracy"] == r2["overall_accuracy"]
        assert r1["coverage"]["coverage"] == r2["coverage"]["coverage"]

    def test_evaluation_output_is_json_serializable(self) -> None:
        import json
        evaluator = ExtractionEvaluator()
        gt = generate_clean_ror()
        pred = generate_clean_ror_prediction()
        result = evaluator.evaluate(pred, gt)
        report = generate_report(result)
        json_str = to_json(report)
        assert isinstance(json_str, str)
        parsed = json.loads(json_str)
        assert "overall_accuracy" in parsed


class TestRoRBenchmarkFixtures:
    def test_hindi_labels_fixtures_available(self) -> None:
        from ai_ml.evaluation.synthetic import (
            generate_hindi_labels_ground_truth,
            generate_hindi_labels_prediction,
        )
        gt = generate_hindi_labels_ground_truth()
        pred = generate_hindi_labels_prediction()
        assert "khata_number" in gt
        assert pred != gt

    def test_devanagari_numbers_fixtures_available(self) -> None:
        from ai_ml.evaluation.synthetic import (
            generate_devanagari_numbers_ground_truth,
            generate_devanagari_numbers_prediction,
        )
        gt = generate_devanagari_numbers_ground_truth()
        pred = generate_devanagari_numbers_prediction()
        assert "२०२३" in gt["year"]
        assert pred != gt

    def test_ocr_whitespace_fixtures_available(self) -> None:
        from ai_ml.evaluation.synthetic import (
            generate_ocr_whitespace_ground_truth,
            generate_ocr_whitespace_prediction,
        )
        gt = generate_ocr_whitespace_ground_truth()
        pred = generate_ocr_whitespace_prediction()
        assert pred != gt

    def test_table_rows_fixtures_available(self) -> None:
        from ai_ml.evaluation.synthetic import (
            generate_table_rows_ground_truth,
            generate_table_rows_prediction,
        )
        gt = generate_table_rows_ground_truth()
        pred = generate_table_rows_prediction()
        assert len(gt["parcels"]) == 3
        assert pred != gt

    def test_missing_table_cells_fixtures_available(self) -> None:
        from ai_ml.evaluation.synthetic import (
            generate_missing_table_cells_ground_truth,
            generate_missing_table_cells_prediction,
        )
        gt = generate_missing_table_cells_ground_truth()
        pred = generate_missing_table_cells_prediction()
        assert "khata_number" not in pred
        assert pred != gt

    def test_conflicting_values_fixtures_available(self) -> None:
        from ai_ml.evaluation.synthetic import (
            generate_conflicting_values_ground_truth,
            generate_conflicting_values_prediction,
        )
        gt = generate_conflicting_values_ground_truth()
        pred = generate_conflicting_values_prediction()
        assert len(gt["parcels"]) == 2
        assert pred != gt

    def test_parcel_metrics_in_report(self) -> None:
        evaluator = ExtractionEvaluator()
        gt = generate_table_rows_ground_truth()
        pred = generate_table_rows_prediction()
        result = evaluator.evaluate(pred, gt)
        assert "parcel_metrics" in result
        assert "precision" in result["parcel_metrics"]

    def test_landholder_metrics_in_report(self) -> None:
        evaluator = ExtractionEvaluator()
        gt = generate_table_rows_ground_truth()
        pred = generate_table_rows_prediction()
        result = evaluator.evaluate(pred, gt)
        assert "landholder_metrics" in result
        assert "precision" in result["landholder_metrics"]

    def test_table_row_metrics_in_report(self) -> None:
        evaluator = ExtractionEvaluator()
        gt = generate_table_rows_ground_truth()
        pred = generate_table_rows_prediction()
        result = evaluator.evaluate(pred, gt)
        assert "table_row_metrics" in result
        assert "association_accuracy" in result["table_row_metrics"]

    def test_missing_cells_reduce_coverage(self) -> None:
        evaluator = ExtractionEvaluator()
        gt = generate_missing_table_cells_ground_truth()
        pred = generate_missing_table_cells_prediction()
        result = evaluator.evaluate(pred, gt)
        assert result["coverage"]["coverage"] < 1.0

    def test_benchmark_cli_output_clear_labeling(self) -> None:
        import subprocess
        import json
        output = subprocess.check_output(
            ["python", "-m", "ai_ml.evaluation", "clean_ror"],
            text=True,
        )
        data = json.loads(output)
        assert "evaluation_type" in data
        assert "synthetic_evaluation_fixtures" in data["evaluation_type"]
