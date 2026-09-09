"""Explainability / evidence builder for ExtractionResult."""

from __future__ import annotations

from typing import Any, Optional

from ai_ml.extraction.schema import ExtractionResult, FieldProvenance


def build_extraction_evidence(result: ExtractionResult) -> dict[str, Any]:
    """Build a structured, JSON-serializable evidence representation for ExtractionResult.

    For every extracted field, preserves:
    - field name
    - extracted value
    - extraction confidence
    - OCR confidence
    - extraction method
    - source OCR text
    - page number
    - bounding box when available
    - notes/provenance
    - validation issues affecting the field

    Also exposes extraction conflicts and their competing values/provenance.

    Args:
        result: ExtractionResult produced by the extraction pipeline.

    Returns:
        JSON-serializable dict containing evidence for the record and its fields.
    """
    if result.record is None:
        return {
            "record_present": False,
            "status": result.status,
            "warnings": result.warnings,
            "conflicts": getattr(result, "conflicts", None) or [],
            "fields": {},
            "parcels": [],
            "landholders": [],
        }

    metadata_fields = [
        "document_id", "state", "district", "tehsil", "village", "year",
        "document_type", "khata_number", "khewat_number", "khatoni_number",
        "mutation_number", "mutation_date", "mutation_details",
    ]
    fields_evidence = {}
    for f in metadata_fields:
        extracted_field = getattr(result.record.metadata, f, None)
        fields_evidence[f] = _build_field_evidence(extracted_field, f)

    parcels_evidence = []
    for idx, parcel in enumerate(result.record.parcels):
        parcel_evidence = {
            "parcel_index": idx,
            "khasra_number": _build_field_evidence(parcel.khasra_number, f"parcels[{idx}].khasra_number"),
            "area_raw": _build_field_evidence(parcel.area_raw, f"parcels[{idx}].area_raw"),
            "area_normalized": _build_field_evidence(parcel.area_normalized, f"parcels[{idx}].area_normalized"),
            "area_unit": _build_field_evidence(parcel.area_unit, f"parcels[{idx}].area_unit"),
            "land_classification": _build_field_evidence(parcel.land_classification, f"parcels[{idx}].land_classification"),
            "land_type": _build_field_evidence(parcel.land_type, f"parcels[{idx}].land_type"),
            "cultivation_status": _build_field_evidence(parcel.cultivation_status, f"parcels[{idx}].cultivation_status"),
            "irrigation_source": _build_field_evidence(parcel.irrigation_source, f"parcels[{idx}].irrigation_source"),
            "revenue": _build_field_evidence(parcel.revenue, f"parcels[{idx}].revenue"),
            "remarks": _build_field_evidence(parcel.remarks, f"parcels[{idx}].remarks"),
        }
        parcels_evidence.append(parcel_evidence)

    landholders_evidence = []
    for idx, holder in enumerate(result.record.landholders):
        holder_evidence = {
            "landholder_index": idx,
            "name": _build_field_evidence(holder.name, f"landholders[{idx}].name"),
            "father_or_husband_name": _build_field_evidence(holder.father_or_husband_name, f"landholders[{idx}].father_or_husband_name"),
            "caste": _build_field_evidence(holder.caste, f"landholders[{idx}].caste"),
            "address": _build_field_evidence(holder.address, f"landholders[{idx}].address"),
            "share": _build_field_evidence(holder.share, f"landholders[{idx}].share"),
            "is_cultivator": _build_field_evidence(holder.is_cultivator, f"landholders[{idx}].is_cultivator"),
        }
        landholders_evidence.append(holder_evidence)

    conflicts_evidence = _build_conflicts_evidence(getattr(result, "conflicts", None) or [])

    return {
        "record_present": True,
        "status": result.status,
        "extractor_version": result.extractor_version,
        "warnings": result.warnings,
        "conflicts": conflicts_evidence,
        "fields": fields_evidence,
        "parcels": parcels_evidence,
        "landholders": landholders_evidence,
        "document_remarks": _build_field_evidence(result.record.document_remarks, "document_remarks"),
        "unrecognized_text": result.record.unrecognized_text,
    }


def _build_field_evidence(
    extracted_field: Optional[Any],
    field_name: str,
) -> dict[str, Any]:
    """Build evidence dict for a single ExtractedField."""
    if extracted_field is None:
        return {
            "field_name": field_name,
            "value": None,
            "extraction_confidence": None,
            "ocr_confidence": None,
            "extraction_method": None,
            "source_ocr_text": None,
            "page_number": None,
            "source_bbox": None,
            "notes": None,
        }

    provenance = extracted_field.provenance
    if provenance is not None:
        prov_dict = {
            "source_ocr_text": provenance.source_ocr_text,
            "source_bbox": list(provenance.source_bbox) if provenance.source_bbox is not None else None,
            "page_number": provenance.page_number,
            "ocr_confidence": provenance.ocr_confidence,
            "extraction_confidence": provenance.extraction_confidence,
            "extraction_method": provenance.extraction_method,
            "extractor_version": provenance.extractor_version,
            "notes": provenance.notes,
        }
    else:
        prov_dict = {
            "source_ocr_text": None,
            "source_bbox": None,
            "page_number": None,
            "ocr_confidence": None,
            "extraction_confidence": None,
            "extraction_method": None,
            "extractor_version": None,
            "notes": None,
        }

    return {
        "field_name": field_name,
        "value": extracted_field.value,
        **prov_dict,
    }


def _build_conflicts_evidence(conflicts: list[dict[str, Any]]) -> list[dict[str, Any]]:
    """Build evidence list for extraction conflicts."""
    evidence = []
    for conflict in conflicts:
        evidence.append({
            "field": conflict.get("field"),
            "values": conflict.get("values", []),
        })
    return evidence
