"""Synthetic RoR-style dataset generation for evaluation and demo."""

from __future__ import annotations

import random
from typing import Any

# Deterministic seed for reproducibility
_DEFAULT_SEED = 42


def _rng(seed: int = _DEFAULT_SEED) -> random.Random:
    return random.Random(seed)


def generate_clean_ror(seed: int = _DEFAULT_SEED) -> dict[str, Any]:
    """Generate a clean Hindi + numeric RoR-style record."""
    rng = _rng(seed)
    return {
        "document_id": f"DOC-{rng.randint(1000, 9999)}",
        "state": "Rajasthan",
        "district": "जयपुर",
        "tehsil": "जयपुर",
        "village": "रामगढ़",
        "year": "2023-24",
        "document_type": "खतौनी",
        "khata_number": "123",
        "khewat_number": "45",
        "khatoni_number": "1",
        "landholders": [
            {
                "name": "राम",
                "father_or_husband_name": "लक्ष्मण",
                "share": "1/2",
            }
        ],
        "parcels": [
            {
                "khasra_number": "142/1",
                "area_raw": "2-5-10",
                "land_classification": "इर्रिगेटेड",
                "revenue": "500",
            }
        ],
    }


def generate_mixed_script_ror(seed: int = _DEFAULT_SEED + 1) -> dict[str, Any]:
    """Generate a mixed Hindi/English RoR-style record."""
    rng = _rng(seed)
    return {
        "document_id": f"DOC-{rng.randint(1000, 9999)}",
        "state": "Rajasthan",
        "district": "Jaipur",
        "tehsil": "जयपुर",
        "village": "Ramgarh",
        "year": "2023-24",
        "document_type": "Khatauni",
        "khata_number": "456",
        "khewat_number": "78",
        "khatoni_number": "2",
        "landholders": [
            {
                "name": "Mohan",
                "father_or_husband_name": "Sohan",
                "share": "1/3",
            },
            {
                "name": "सीता",
                "father_or_husband_name": "राम",
                "share": "2/3",
            },
        ],
        "parcels": [
            {
                "khasra_number": "143/1",
                "area_raw": "1-0-5",
                "land_classification": "Banjar",
                "revenue": "200",
            },
            {
                "khasra_number": "144/1",
                "area_raw": "0-15-0",
                "land_classification": "इर्रिगेटेड",
                "revenue": "150",
            },
        ],
    }


def generate_noisy_ocr_ground_truth(seed: int = _DEFAULT_SEED + 2) -> dict[str, Any]:
    """Generate a record representing noisy OCR challenges."""
    rng = _rng(seed)
    return {
        "document_id": f"DOC-{rng.randint(1000, 9999)}",
        "state": "Rajasthan",
        "district": "जयपुर",
        "tehsil": "जयपुर",
        "village": "रामगढ़",
        "year": "2022-23",
        "document_type": "खतौनी",
        "khata_number": "789",
        "khewat_number": "12",
        "khatoni_number": "1",
        "landholders": [
            {
                "name": "अनkit",
                "father_or_husband_name": "कुंजबihari",
                "share": "1/1",
            }
        ],
        "parcels": [
            {
                "khasra_number": "150/2",
                "area_raw": "3-10-0",
                "revenue": "750",
            }
        ],
    }


def generate_missing_field_ground_truth(seed: int = _DEFAULT_SEED + 3) -> dict[str, Any]:
    """Generate a record with missing fields."""
    rng = _rng(seed)
    return {
        "document_id": f"DOC-{rng.randint(1000, 9999)}",
        "state": "Rajasthan",
        # district is missing intentionally
        "tehsil": "जयपुर",
        "village": "रामगढ़",
        "year": "2023-24",
        "khata_number": "321",
        # khewat_number is missing
        # khatoni_number is missing
        "landholders": [],
        "parcels": [
            {
                "khasra_number": "160/1",
                "area_raw": "1-5-0",
                # revenue is missing
            }
        ],
    }


def generate_multi_parcel_ground_truth(seed: int = _DEFAULT_SEED + 4) -> dict[str, Any]:
    """Generate a record with multiple parcels."""
    rng = _rng(seed)
    parcels = []
    for i in range(5):
        parcels.append({
            "khasra_number": f"{200 + i}/{rng.randint(1, 3)}",
            "area_raw": f"{i}-0-0",
            "land_classification": "इर्रिगेटेड",
            "revenue": str(100 + i * 50),
        })
    return {
        "document_id": f"DOC-{rng.randint(1000, 9999)}",
        "state": "Rajasthan",
        "district": "जयपुर",
        "tehsil": "जयपुर",
        "village": "रामगढ़",
        "year": "2023-24",
        "khata_number": "555",
        "landholders": [
            {"name": "राम", "share": "1/2"},
            {"name": "कृष्ण", "share": "1/2"},
        ],
        "parcels": parcels,
    }


# ---------------------------------------------------------------------------
# Deterministic prediction fixtures with controlled realistic errors
# ---------------------------------------------------------------------------


def _copy_ground_truth(ground_truth: dict[str, Any]) -> dict[str, Any]:
    """Deep-copy a ground-truth dict for mutation into a prediction fixture."""
    if isinstance(ground_truth, dict):
        return {k: _copy_ground_truth(v) for k, v in ground_truth.items()}
    if isinstance(ground_truth, list):
        return [_copy_ground_truth(item) for item in ground_truth]
    return ground_truth


def generate_clean_ror_prediction(seed: int = _DEFAULT_SEED) -> dict[str, Any]:
    """Prediction for clean_ror: mostly correct with one minor OCR-like error."""
    rng = _rng(seed)
    pred = _copy_ground_truth(generate_clean_ror(seed))
    # Realistic OCR error: missing nukta in last character of village
    pred["village"] = "रामगढ"
    # Realistic OCR error: O instead of 0 in revenue
    pred["parcels"][0]["revenue"] = "50O"
    return pred


def generate_mixed_script_prediction(seed: int = _DEFAULT_SEED + 1) -> dict[str, Any]:
    """Prediction for mixed_script: mostly correct with one controlled difference."""
    rng = _rng(seed)
    pred = _copy_ground_truth(generate_mixed_script_ror(seed))
    # Controlled extraction difference: OCR missed one 'i' in Jaipur
    pred["district"] = "Jaiipur"
    return pred


def generate_noisy_ocr_prediction(seed: int = _DEFAULT_SEED + 2) -> dict[str, Any]:
    """Prediction for noisy_ocr: deterministic OCR-like corruption."""
    rng = _rng(seed)
    pred = _copy_ground_truth(generate_noisy_ocr_ground_truth(seed))
    # Whitespace/artifact difference: trailing space in khasra number
    pred["parcels"][0]["khasra_number"] = "150/2 "
    # One character-level error: OCR read '0' as 'O'
    pred["khata_number"] = "78O"
    # One missing value: revenue not extracted
    pred["parcels"][0]["revenue"] = None
    return pred


def generate_missing_field_prediction(seed: int = _DEFAULT_SEED + 3) -> dict[str, Any]:
    """Prediction for missing_field: intentionally omits required fields."""
    rng = _rng(seed)
    pred = _copy_ground_truth(generate_missing_field_ground_truth(seed))
    # Omit required/core fields
    pred.pop("khata_number", None)
    pred.pop("district", None)
    # Also omit parcel revenue
    if pred.get("parcels"):
        pred["parcels"][0].pop("revenue", None)
    return pred


def generate_multi_parcel_prediction(seed: int = _DEFAULT_SEED + 4) -> dict[str, Any]:
    """Prediction for multi_parcel: one controlled parcel-level mismatch."""
    rng = _rng(seed)
    pred = _copy_ground_truth(generate_multi_parcel_ground_truth(seed))
    # Introduce one parcel-level mismatch: change first parcel khasra
    if pred.get("parcels"):
        pred["parcels"][0] = dict(pred["parcels"][0])
        pred["parcels"][0]["khasra_number"] = "200/9"
    # Omit area_raw from second parcel
    if len(pred.get("parcels", [])) > 1:
        pred["parcels"][1] = dict(pred["parcels"][1])
        pred["parcels"][1]["area_raw"] = None
    return pred


def get_all_datasets() -> dict[str, dict[str, Any]]:
    """Return all available synthetic datasets (ground truth only)."""
    return {
        "clean_ror": generate_clean_ror(),
        "mixed_script": generate_mixed_script_ror(),
        "noisy_ocr": generate_noisy_ocr_ground_truth(),
        "missing_field": generate_missing_field_ground_truth(),
        "multi_parcel": generate_multi_parcel_ground_truth(),
        "hindi_labels": generate_hindi_labels_ground_truth(),
        "devanagari_numbers": generate_devanagari_numbers_ground_truth(),
        "ocr_whitespace_corruption": generate_ocr_whitespace_ground_truth(),
        "table_rows": generate_table_rows_ground_truth(),
        "missing_table_cells": generate_missing_table_cells_ground_truth(),
        "conflicting_values": generate_conflicting_values_ground_truth(),
    }


def get_all_predictions() -> dict[str, dict[str, Any]]:
    """Return all deterministic synthetic prediction fixtures.

    These are NOT real model outputs. They are controlled error scenarios
    designed to exercise the evaluation framework.
    """
    return {
        "clean_ror": generate_clean_ror_prediction(),
        "mixed_script": generate_mixed_script_prediction(),
        "noisy_ocr": generate_noisy_ocr_prediction(),
        "missing_field": generate_missing_field_prediction(),
        "multi_parcel": generate_multi_parcel_prediction(),
        "hindi_labels": generate_hindi_labels_prediction(),
        "devanagari_numbers": generate_devanagari_numbers_prediction(),
        "ocr_whitespace_corruption": generate_ocr_whitespace_prediction(),
        "table_rows": generate_table_rows_prediction(),
        "missing_table_cells": generate_missing_table_cells_prediction(),
        "conflicting_values": generate_conflicting_values_prediction(),
    }


# ---------------------------------------------------------------------------
# RoR-specific benchmark datasets
# ---------------------------------------------------------------------------


def generate_hindi_labels_ground_truth(seed: int = _DEFAULT_SEED + 10) -> dict[str, Any]:
    """Generate a record testing Hindi label robustness."""
    rng = _rng(seed)
    return {
        "document_id": f"DOC-{rng.randint(1000, 9999)}",
        "state": "Rajasthan",
        "district": "जयपुर",
        "tehsil": "जयपुर",
        "village": "रामगढ़",
        "year": "2023-24",
        "khata_number": "111",
        "khasra_number": "250/1",
        "landholders": [
            {"name": "राम", "father_or_husband_name": "लक्ष्मण"}
        ],
        "parcels": [
            {"khasra_number": "250/1", "area_raw": "3-0-0", "revenue": "600"}
        ],
    }


def generate_devanagari_numbers_ground_truth(seed: int = _DEFAULT_SEED + 11) -> dict[str, Any]:
    """Generate a record testing Devanagari numeral handling."""
    rng = _rng(seed)
    return {
        "document_id": f"DOC-{rng.randint(1000, 9999)}",
        "state": "Rajasthan",
        "district": "जयपुर",
        "tehsil": "जयपुर",
        "village": "रामगढ़",
        "year": "२०२३-२४",
        "khata_number": "१२३",
        "khasra_number": "३५०/१",
        "landholders": [
            {"name": "राम"}
        ],
        "parcels": [
            {"khasra_number": "३५०/१", "area_raw": "४-५-१०", "revenue": "५००"}
        ],
    }


def generate_ocr_whitespace_ground_truth(seed: int = _DEFAULT_SEED + 12) -> dict[str, Any]:
    """Generate a record testing OCR whitespace/punctuation corruption."""
    rng = _rng(seed)
    return {
        "document_id": f"DOC-{rng.randint(1000, 9999)}",
        "state": "Rajasthan ",
        "district": " जयपुर",
        "tehsil": "जयपुर",
        "village": "रामगढ़ !!!",
        "year": "2023 - 24",
        "khata_number": "123",
        "khasra_number": "400/1",
        "landholders": [
            {"name": "राम"}
        ],
        "parcels": [
            {"khasra_number": "400/1", "area_raw": "2-0-0", "revenue": "300"}
        ],
    }


def generate_table_rows_ground_truth(seed: int = _DEFAULT_SEED + 13) -> dict[str, Any]:
    """Generate a record with multiple table-row parcels."""
    rng = _rng(seed)
    return {
        "document_id": f"DOC-{rng.randint(1000, 9999)}",
        "state": "Rajasthan",
        "district": "जयपुर",
        "tehsil": "जयपुर",
        "village": "रामगढ़",
        "year": "2023-24",
        "khata_number": "555",
        "landholders": [
            {"name": "राम"},
            {"name": "कृष्ण"},
        ],
        "parcels": [
            {"khasra_number": "200/1", "area_raw": "2.5", "land_classification": "कृषि", "irrigation_source": "सिंचित", "revenue": "50"},
            {"khasra_number": "200/2", "area_raw": "1.2", "land_classification": "कृषि", "irrigation_source": "असिंचित", "revenue": "25"},
            {"khasra_number": "201/1", "area_raw": "3.0", "land_classification": "बंजर", "irrigation_source": "बारिश", "revenue": "75"},
        ],
    }


def generate_missing_table_cells_ground_truth(seed: int = _DEFAULT_SEED + 14) -> dict[str, Any]:
    """Generate a record with missing table cells."""
    rng = _rng(seed)
    return {
        "document_id": f"DOC-{rng.randint(1000, 9999)}",
        "state": "Rajasthan",
        "district": "जयपुर",
        "tehsil": "जयपुर",
        "village": "रामगढ़",
        "year": "2023-24",
        "khata_number": "666",
        "landholders": [
            {"name": "राम"}
        ],
        "parcels": [
            {"khasra_number": "300/1", "area_raw": "2.0", "land_classification": "कृषि"},
            {"khasra_number": "300/2", "revenue": "40"},
        ],
    }


def generate_conflicting_values_ground_truth(seed: int = _DEFAULT_SEED + 15) -> dict[str, Any]:
    """Generate a record with potentially conflicting values across rows."""
    rng = _rng(seed)
    return {
        "document_id": f"DOC-{rng.randint(1000, 9999)}",
        "state": "Rajasthan",
        "district": "जयपुर",
        "tehsil": "जयपुर",
        "village": "रामगढ़",
        "year": "2023-24",
        "khata_number": "777",
        "landholders": [
            {"name": "राम"}
        ],
        "parcels": [
            {"khasra_number": "500/1", "area_raw": "2-5-10", "revenue": "500"},
            {"khasra_number": "500/2", "area_raw": "1-0-0", "revenue": "250"},
        ],
    }


# ---------------------------------------------------------------------------
# Deterministic prediction fixtures with controlled errors
# ---------------------------------------------------------------------------


def generate_hindi_labels_prediction(seed: int = _DEFAULT_SEED + 10) -> dict[str, Any]:
    rng = _rng(seed)
    pred = _copy_ground_truth(generate_hindi_labels_ground_truth(seed))
    pred["district"] = "जयपुर "
    pred["parcels"][0]["revenue"] = "60O"
    return pred


def generate_devanagari_numbers_prediction(seed: int = _DEFAULT_SEED + 11) -> dict[str, Any]:
    rng = _rng(seed)
    pred = _copy_ground_truth(generate_devanagari_numbers_ground_truth(seed))
    pred["khata_number"] = "१२४"
    pred["parcels"][0]["revenue"] = "५५०"
    return pred


def generate_ocr_whitespace_prediction(seed: int = _DEFAULT_SEED + 12) -> dict[str, Any]:
    rng = _rng(seed)
    pred = _copy_ground_truth(generate_ocr_whitespace_ground_truth(seed))
    pred["state"] = "Rajasthan"
    pred["village"] = "रामगढ"
    pred["year"] = "2023-24"
    return pred


def generate_table_rows_prediction(seed: int = _DEFAULT_SEED + 13) -> dict[str, Any]:
    rng = _rng(seed)
    pred = _copy_ground_truth(generate_table_rows_ground_truth(seed))
    if pred.get("parcels"):
        pred["parcels"][0] = dict(pred["parcels"][0])
        pred["parcels"][0]["khasra_number"] = "200/9"
        pred["parcels"][0]["revenue"] = "55"
    return pred


def generate_missing_table_cells_prediction(seed: int = _DEFAULT_SEED + 14) -> dict[str, Any]:
    rng = _rng(seed)
    pred = _copy_ground_truth(generate_missing_table_cells_ground_truth(seed))
    pred.pop("khata_number", None)
    if pred.get("parcels"):
        pred["parcels"][0] = dict(pred["parcels"][0])
        pred["parcels"][0].pop("area_raw", None)
    return pred


def generate_conflicting_values_prediction(seed: int = _DEFAULT_SEED + 15) -> dict[str, Any]:
    rng = _rng(seed)
    pred = _copy_ground_truth(generate_conflicting_values_ground_truth(seed))
    if pred.get("parcels"):
        pred["parcels"][0] = dict(pred["parcels"][0])
        pred["parcels"][0]["revenue"] = "600"
    return pred
