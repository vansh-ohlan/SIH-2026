"""Tests for ai_ml.extraction.normalization."""

from __future__ import annotations

import pytest

from ai_ml.extraction.normalization import (
    arabic_digits_to_devanagari,
    contains_devanagari,
    devanagari_digits_to_arabic,
    find_label_in_text,
    is_likely_hindi_label,
    normalize_for_matching,
    normalize_label_variant,
    normalize_punctuation,
    normalize_unicode,
    normalize_whitespace,
)


class TestNormalizeUnicode:
    def test_nfc_normalization(self) -> None:
        text = "क\u093fर"  # decomposed
        result = normalize_unicode(text, form="NFC")
        assert result == "किर"

    def test_invalid_form_returns_original(self) -> None:
        assert normalize_unicode("hello", form="INVALID") == "hello"

    def test_none_returns_original(self) -> None:
        assert normalize_unicode(None) is None


class TestContainsDevanagari:
    def test_returns_true_for_devanagari(self) -> None:
        assert contains_devanagari("जयपुर") is True

    def test_returns_false_for_ascii(self) -> None:
        assert contains_devanagari("Jaipur") is False

    def test_returns_false_for_empty(self) -> None:
        assert contains_devanagari("") is False


class TestDevanagariDigitMapping:
    def test_devanagari_to_arabic(self) -> None:
        assert devanagari_digits_to_arabic("०१२३४५६७८९") == "0123456789"

    def test_mixed_text_preserves_non_digits(self) -> None:
        assert devanagari_digits_to_arabic("खाता १२३") == "खाता 123"

    def test_arabic_to_devanagari(self) -> None:
        assert arabic_digits_to_devanagari("0123456789") == "०१२३४५६७८९"

    def test_roundtrip(self) -> None:
        original = "२०२३-२४"
        arabic = devanagari_digits_to_arabic(original)
        assert arabic == "2023-24"
        back = arabic_digits_to_devanagari(arabic)
        assert back == original


class TestNormalizeWhitespace:
    def test_collapses_multiple_spaces(self) -> None:
        assert normalize_whitespace("a   b") == "a b"

    def test_strips_edges(self) -> None:
        assert normalize_whitespace("  hello  ") == "hello"

    def test_replaces_newlines(self) -> None:
        assert normalize_whitespace("hello\nworld") == "hello world"


class TestNormalizePunctuation:
    def test_collapses_repeated_punctuation(self) -> None:
        assert normalize_punctuation("hello!!") == "hello!"

    def test_preserves_slashes(self) -> None:
        assert normalize_punctuation("142/1") == "142/1"

    def test_preserves_hyphens(self) -> None:
        assert normalize_punctuation("2-5-10") == "2-5-10"


class TestNormalizeForMatching:
    def test_devanagari_digits_converted(self) -> None:
        assert normalize_for_matching("२०२३") == "2023"

    def test_whitespace_normalized(self) -> None:
        assert normalize_for_matching("खाता  संख्या") == "खाता संख्या"

    def test_punctuation_collapsed(self) -> None:
        assert normalize_for_matching("खाता!!") == "खाता!"

    def test_ascii_preserved(self) -> None:
        assert normalize_for_matching("Khata Number") == "Khata Number"

    def test_devanagari_preserved(self) -> None:
        assert "खाता" in normalize_for_matching("खाता संख्या")


class TestNormalizeLabelVariant:
    def test_ascii_lowercased(self) -> None:
        assert normalize_label_variant("Khata Number") == "khata number"

    def test_devanagari_preserved(self) -> None:
        assert "खाता" in normalize_label_variant("खाता संख्या")


class TestFindLabelInText:
    def test_finds_english_label(self) -> None:
        result = find_label_in_text("khata number 123")
        assert result is not None
        assert result[0] == "khata_number"

    def test_finds_devanagari_label(self) -> None:
        result = find_label_in_text("खाता संख्या 123")
        assert result is not None
        assert result[0] == "khata_number"

    def test_finds_variant_khata(self) -> None:
        result = find_label_in_text("खाता 123")
        assert result is not None
        assert result[0] == "khata_number"

    def test_finds_variant_khewat(self) -> None:
        result = find_label_in_text("खेवट संख्या 45")
        assert result is not None
        assert result[0] == "khewat_number"

    def test_finds_variant_khatoni(self) -> None:
        result = find_label_in_text("खतौनी 1")
        assert result is not None
        assert result[0] == "khatoni_number"

    def test_finds_village_variants(self) -> None:
        assert find_label_in_text("ग्राम रामगढ़") is not None
        assert find_label_in_text("गांव रामगढ़") is not None
        assert find_label_in_text("गाँव रामगढ़") is not None

    def test_returns_none_for_unknown(self) -> None:
        assert find_label_in_text("hello world") is None

    def test_whitespace_variation(self) -> None:
        result = find_label_in_text("खाता   संख्या   123")
        assert result is not None

    def test_punctuation_variation(self) -> None:
        result = find_label_in_text("खाता संख्या: 123")
        assert result is not None

    def test_mixed_script(self) -> None:
        result = find_label_in_text("Khata Number 123")
        assert result is not None
        assert result[0] == "khata_number"


class TestIsLikelyHindiLabel:
    def test_returns_true_for_hindi_label(self) -> None:
        assert is_likely_hindi_label("खातेदार का नाम") is True

    def test_returns_false_for_non_label(self) -> None:
        assert is_likely_hindi_label("राम") is False
