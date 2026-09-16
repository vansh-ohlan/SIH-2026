"""Feature engineering for anomaly detection.

Extracts structured, non-sensitive numeric features from ExtractionResult.
No personal text (names, addresses, IDs) is included in the feature vector.
"""

from __future__ import annotations

from typing import Any, Optional

import numpy as np

from ai_ml.extraction.schema import ExtractionResult


# Feature names must remain stable because they are used by the model and tests.
FEATURE_NAMES = [
    "num_parcels",
    "num_landholders",
    "num_core_extracted_fields",
    "num_missing_required_fields",
    "avg_ocr_confidence",
    "avg_extraction_confidence",
    "num_validation_issues",
    "num_conflicts",
    "has_area",
    "has_revenue",
    "num_parcels_with_khasra",
    "num_validation_errors",
    "num_validation_warnings",
]


def extract_features(result: ExtractionResult) -> np.ndarray:
    """Extract a numeric feature vector from ExtractionResult.

    All features are derived from structured metadata only.
    Personal text fields (names, addresses, IDs) are intentionally excluded.

    Args:
        result: ExtractionResult produced by the extraction pipeline.

    Returns:
        1-D numpy array of floats with shape (len(FEATURE_NAMES),).
    """
    record = result.record if result.record is not None else _empty_record()
    features = np.zeros(len(FEATURE_NAMES), dtype=float)

    features[0] = float(len(record.parcels))
    features[1] = float(len(record.landholders))

    extracted_count = 0
    missing_required = 0
    ocr_confs: list[float] = []
    ext_confs: list[float] = []

    metadata_fields = [
        "khata_number",
    ]
    for f in metadata_fields:
        field = getattr(record.metadata, f, None)
        if field is not None and field.value is not None:
            extracted_count += 1
        else:
            missing_required += 1
        if field is not None and field.provenance is not None:
            if field.provenance.ocr_confidence is not None:
                ocr_confs.append(field.provenance.ocr_confidence)
            if field.provenance.extraction_confidence is not None:
                ext_confs.append(field.provenance.extraction_confidence)

    for parcel in record.parcels:
        if parcel.khasra_number is not None and parcel.khasra_number.value is not None:
            extracted_count += 1
        if parcel.khasra_number is None:
            missing_required += 1
        if parcel.area_raw is not None and parcel.area_raw.value is not None:
            extracted_count += 1
            features[8] = 1.0
        if parcel.revenue is not None and parcel.revenue.value is not None:
            extracted_count += 1
            features[9] = 1.0
        if parcel.khasra_number is not None and parcel.khasra_number.value is not None:
            features[10] += 1.0
        if parcel.khasra_number is not None and parcel.khasra_number.provenance is not None:
            if parcel.khasra_number.provenance.ocr_confidence is not None:
                ocr_confs.append(parcel.khasra_number.provenance.ocr_confidence)
            if parcel.khasra_number.provenance.extraction_confidence is not None:
                ext_confs.append(parcel.khasra_number.provenance.extraction_confidence)

    features[2] = float(extracted_count)
    features[3] = float(missing_required)
    features[4] = sum(ocr_confs) / len(ocr_confs) if ocr_confs else 0.0
    features[5] = sum(ext_confs) / len(ext_confs) if ext_confs else 0.0

    num_issues = _count_validation_issues(result)
    features[6] = float(num_issues)
    features[11] = float(_count_validation_errors(result))
    features[12] = float(_count_validation_warnings(result))

    conflicts = getattr(result, "conflicts", None) or []
    features[7] = float(len(conflicts))

    return features


def get_feature_names() -> list[str]:
    """Return the ordered list of feature names used by the anomaly model."""
    return list(FEATURE_NAMES)


def _empty_record() -> Any:
    from ai_ml.extraction.schema import RoRRecord
    return RoRRecord()


def _count_validation_issues(result: ExtractionResult) -> int:
    return sum(1 for w in result.warnings if "[validation]" in w)


def _count_validation_errors(result: ExtractionResult) -> int:
    return sum(
        1 for w in result.warnings
        if "[validation]" in w and any(kw in w.lower() for kw in ["error", "missing", "invalid", "required"])
    )


def _count_validation_warnings(result: ExtractionResult) -> int:
    return sum(
        1 for w in result.warnings
        if "[validation]" in w and "error" not in w.lower()
    )
