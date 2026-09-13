"""Tests for ai_ml.evaluation.error_analysis."""

from __future__ import annotations

import pytest

from ai_ml.evaluation.error_analysis import (
    analyze_field_errors,
    analyze_landholder_errors,
    analyze_parcel_errors,
    generate_error_report,
)


class TestAnalyzeFieldErrors:
    def test_correct_fields(self) -> None:
        result = analyze_field_errors({"a": "1", "b": "2"}, {"a": "1", "b": "2"})
        assert result["accuracy"] == 1.0
        assert result["correct"] == 2
        assert result["incorrect"] == 0

    def test_incorrect_fields(self) -> None:
        result = analyze_field_errors({"a": "1"}, {"a": "2"})
        assert result["incorrect"] == 1
        assert result["accuracy"] == 0.0

    def test_missing_prediction(self) -> None:
        result = analyze_field_errors({}, {"a": "1"})
        assert result["missing_prediction"] == 1
        assert result["coverage"] == 0.0

    def test_unexpected_prediction(self) -> None:
        result = analyze_field_errors({"a": "1"}, {})
        assert result["unexpected_prediction"] == 1
        assert result["coverage"] == 1.0

    def test_normalization_mismatch(self) -> None:
        result = analyze_field_errors({"a": "1 2"}, {"a": "1  2"})
        assert result["normalization_mismatch"] == 1
        assert result["correct"] == 0

    def test_both_missing_counts_as_correct(self) -> None:
        result = analyze_field_errors({"a": None}, {"a": None})
        assert result["correct"] == 1
        assert result["total_fields"] == 1

    def test_empty_strings_both_missing(self) -> None:
        result = analyze_field_errors({"a": ""}, {"a": ""})
        assert result["correct"] == 1

    def test_per_field_accuracy(self) -> None:
        result = analyze_field_errors({"a": "1", "b": "2"}, {"a": "1", "b": "3"})
        assert result["per_field_accuracy"]["a"]["accuracy"] == 1.0
        assert result["per_field_accuracy"]["b"]["accuracy"] == 0.0

    def test_weak_areas_devanagari(self) -> None:
        result = analyze_field_errors(
            {"devanagari_name": "abc"},
            {"devanagari_name": "xyz", "state": "Punjab"},
        )
        weak = result["weak_areas"]
        areas = [w["area"] for w in weak]
        assert "devanagari_digits" in areas

    def test_weak_areas_whitespace(self) -> None:
        result = analyze_field_errors(
            {"village": "Burj  Littan"},
            {"village": "Burj Littan", "year": "2024"},
        )
        weak = result["weak_areas"]
        areas = [w["area"] for w in weak]
        assert "ocr_whitespace_corruption" in areas

    def test_weak_areas_table_extraction(self) -> None:
        result = analyze_field_errors(
            {"parcel_area": None},
            {"parcel_area": "1250"},
        )
        weak = result["weak_areas"]
        areas = [w["area"] for w in weak]
        assert "table_extraction" in areas

    def test_weak_areas_conflicting_values(self) -> None:
        result = analyze_field_errors(
            {"conflict_field": "a"},
            {"conflict_field": "b"},
        )
        weak = result["weak_areas"]
        areas = [w["area"] for w in weak]
        assert "conflicting_values" in areas

    def test_synthetic_label_present(self) -> None:
        result = analyze_field_errors({"a": "1"}, {"a": "1"})
        assert result["evaluation_type"] == "synthetic_evaluation_fixtures"


class TestAnalyzeParcelErrors:
    def test_matched_parcels(self) -> None:
        pred = [{"khasra_number": "142/3", "area": "1250"}]
        gt = [{"khasra_number": "142/3", "area": "1250"}]
        result = analyze_parcel_errors(pred, gt)
        assert result["matched_count"] == 1
        assert result["parcel_errors"]["missing_prediction"] == []
        assert result["parcel_errors"]["unexpected_prediction"] == []

    def test_missing_prediction_parcel(self) -> None:
        pred = []
        gt = [{"khasra_number": "142/3"}]
        result = analyze_parcel_errors(pred, gt)
        assert result["parcel_errors"]["missing_prediction"] == [{"key_field": "khasra_number", "key_value": "142/3"}]

    def test_unexpected_prediction_parcel(self) -> None:
        pred = [{"khasra_number": "999/1"}]
        gt = []
        result = analyze_parcel_errors(pred, gt)
        assert result["parcel_errors"]["unexpected_prediction"] == [{"key_field": "khasra_number", "key_value": "999/1"}]


class TestAnalyzeLandholderErrors:
    def test_matched_landholders(self) -> None:
        pred = [{"name": "Ramesh", "share": "0.5"}]
        gt = [{"name": "Ramesh", "share": "0.5"}]
        result = analyze_landholder_errors(pred, gt)
        assert result["matched_count"] == 1

    def test_missing_prediction_landholder(self) -> None:
        pred = []
        gt = [{"name": "Suresh"}]
        result = analyze_landholder_errors(pred, gt)
        assert len(result["holder_errors"]["missing_prediction"]) == 1


class TestGenerateErrorReport:
    def test_basic_report(self) -> None:
        field_errors = analyze_field_errors({"a": "1"}, {"a": "1"})
        report = generate_error_report(field_errors)
        assert report["summary"]["accuracy"] == 1.0
        assert report["evaluation_type"] == "synthetic_evaluation_fixtures"

    def test_report_with_parcels_and_landholders(self) -> None:
        field_errors = analyze_field_errors({"a": "1"}, {"a": "1"})
        parcel_errors = analyze_parcel_errors([], [])
        landholder_errors = analyze_landholder_errors([], [])
        report = generate_error_report(field_errors, parcel_errors, landholder_errors)
        assert "parcel_errors" in report
        assert "landholder_errors" in report

    def test_report_is_json_serializable(self) -> None:
        import json
        field_errors = analyze_field_errors({"a": "1"}, {"a": "1"})
        report = generate_error_report(field_errors)
        json.dumps(report)
