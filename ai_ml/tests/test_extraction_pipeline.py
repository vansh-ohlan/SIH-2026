"""Tests for ai_ml.pipeline.extraction_pipeline."""

from __future__ import annotations

import pytest

from ai_ml.ocr.schema import OCRBlock, OCRLine, OCRPage, OCRResult, OCRWord
from ai_ml.extraction.exceptions import InvalidOCRResultError
from ai_ml.extraction.schema import (
    ExtractionMethod,
    ExtractionResult,
    ExtractedField,
    FieldProvenance,
    Parcel,
    RoRMetadata,
    RoRRecord,
)
from ai_ml.extraction.label_extractor import LabelExtractor
from ai_ml.extraction.pattern_extractor import PatternExtractor
from ai_ml.pipeline.extraction_pipeline import ExtractionPipeline


def _make_ocr_result(lines_per_page: dict[int, list[tuple[str, float, tuple[int, int, int, int]]]]) -> OCRResult:
    pages = []
    for page_number in sorted(lines_per_page.keys()):
        blocks = []
        block_lines = []
        for idx, (text, confidence, bbox) in enumerate(lines_per_page[page_number], start=1):
            words = [OCRWord(text=text, confidence=confidence, bbox=bbox, language="hi")]
            block_lines.append(OCRLine(line_id=f"line-{idx}", words=words, bbox=bbox))
        blocks.append(OCRBlock(block_id="block-1", lines=block_lines, bbox=(0, 0, 100, 100)))
        pages.append(OCRPage(page_number=page_number, blocks=blocks, width=100, height=100))
    return OCRResult(pages=pages, engine_name="test", language="hi")


class TestExtractionPipeline:
    def test_pipeline_returns_extraction_result(self) -> None:
        ocr = _make_ocr_result({1: [("Year 2023", 0.9, (0, 0, 10, 20))]})
        result = ExtractionPipeline().extract(ocr)
        assert isinstance(result, ExtractionResult)

    def test_pipeline_merges_both_extractors(self) -> None:
        ocr = _make_ocr_result({
            1: [
                ("Year 2023", 0.9, (0, 0, 10, 20)),
                ("Khasra Number 142/1", 0.9, (0, 0, 10, 20)),
            ]
        })
        result = ExtractionPipeline().extract(ocr)
        assert result.record.metadata.year.value == "2023"
        assert result.record.parcels[0].khasra_number.value == "142/1"

    def test_pipeline_preserves_provenance(self) -> None:
        ocr = _make_ocr_result({1: [("Year 2023-24", 0.9, (0, 0, 10, 20))]})
        result = ExtractionPipeline().extract(ocr)
        prov = result.record.metadata.year.provenance
        assert prov is not None
        assert prov.source_ocr_text == "Year 2023-24"
        assert prov.page_number == 1
        assert prov.extraction_method in (ExtractionMethod.LABEL, ExtractionMethod.REGEX)

    def test_pipeline_preserves_ocr_confidence(self) -> None:
        ocr = _make_ocr_result({1: [("Revenue 500 INR", 0.7, (0, 0, 10, 20))]})
        result = ExtractionPipeline().extract(ocr)
        prov = result.record.parcels[0].revenue.provenance
        assert prov.ocr_confidence == 0.7

    def test_pipeline_empty_ocr_returns_partial(self) -> None:
        ocr = OCRResult(pages=[], engine_name="test", language="hi")
        result = ExtractionPipeline().extract(ocr)
        assert result.status == "partial"

    def test_pipeline_invalid_ocr_raises(self) -> None:
        with pytest.raises(InvalidOCRResultError):
            ExtractionPipeline().extract(None)

    def test_pipeline_multiple_pages(self) -> None:
        ocr = _make_ocr_result({
            1: [("Year 2023", 0.9, (0, 0, 10, 20))],
            2: [("Khasra Number 142/1", 0.9, (0, 0, 10, 20))],
        })
        result = ExtractionPipeline().extract(ocr)
        assert result.record.metadata.year.value == "2023"
        assert result.record.parcels[0].khasra_number.value == "142/1"

    def test_pipeline_extractor_version_set(self) -> None:
        ocr = _make_ocr_result({1: [("Year 2023", 0.9, (0, 0, 10, 20))]})
        result = ExtractionPipeline().extract(ocr)
        assert result.extractor_version == "pipeline-v1"

    def test_pipeline_deterministic(self) -> None:
        ocr = _make_ocr_result({1: [("Year 2023", 0.9, (0, 0, 10, 20))]})
        r1 = ExtractionPipeline().extract(ocr)
        r2 = ExtractionPipeline().extract(ocr)
        assert r1.record.metadata.year.value == r2.record.metadata.year.value

    def test_pipeline_no_ml_or_llm(self) -> None:
        import ai_ml.pipeline.extraction_pipeline as mod
        source = open(mod.__file__).read().lower()
        assert "sklearn" not in source
        assert "tensorflow" not in source
        assert "torch" not in source
        assert "openai" not in source
        assert "anthropic" not in source

    def test_pipeline_no_conflict_when_same_value(self) -> None:
        ocr = _make_ocr_result({1: [("Year 2023", 0.9, (0, 0, 10, 20))]})
        result = ExtractionPipeline().extract(ocr)
        assert not any(c["field"] == "year" for c in result.conflicts)

    def test_pipeline_detects_same_field_conflict(self) -> None:
        ocr = _make_ocr_result({1: [("Year of record 2023", 0.9, (0, 0, 10, 20))]})
        result = ExtractionPipeline().extract(ocr)
        year_conflicts = [c for c in result.conflicts if c["field"] == "year"]
        assert len(year_conflicts) == 1
        values = [v["value"] for v in year_conflicts[0]["values"]]
        assert "of record 2023" in values
        assert "2023" in values

    def test_pipeline_conflict_preserves_both_provenances(self) -> None:
        ocr = _make_ocr_result({1: [("Year of record 2023", 0.9, (0, 0, 10, 20))]})
        result = ExtractionPipeline().extract(ocr)
        year_conflicts = [c for c in result.conflicts if c["field"] == "year"]
        assert len(year_conflicts) == 1
        methods = [v["method"] for v in year_conflicts[0]["values"]]
        assert "label" in methods
        assert "regex" in methods

    def test_pipeline_preserves_state_specific_fields(self) -> None:
        pipeline = ExtractionPipeline()
        label_meta = RoRMetadata(state_specific_fields={"state_code": "RJ"})
        pattern_meta = RoRMetadata(state_specific_fields={"district_code": "JPR"})
        merged, conflicts = pipeline._merge_metadata(label_meta, pattern_meta)
        assert merged.state_specific_fields["state_code"] == "RJ"
        assert merged.state_specific_fields["district_code"] == "JPR"
        assert not any(c["field"].startswith("state_specific_fields") for c in conflicts)

    def test_pipeline_state_specific_fields_conflict_reported(self) -> None:
        pipeline = ExtractionPipeline()
        label_meta = RoRMetadata(state_specific_fields={"code": "RJ"})
        pattern_meta = RoRMetadata(state_specific_fields={"code": "MH"})
        merged, conflicts = pipeline._merge_metadata(label_meta, pattern_meta)
        assert merged.state_specific_fields["code"] == "RJ"
        ssf_conflicts = [c for c in conflicts if c["field"] == "state_specific_fields.code"]
        assert len(ssf_conflicts) == 1
