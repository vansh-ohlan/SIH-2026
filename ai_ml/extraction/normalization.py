"""Conservative normalization for Hindi/Devanagari extraction robustness.

This module provides matching helpers that make label/pattern extraction
tolerant of realistic OCR variations while preserving exact original text
in provenance.

Important:
- Normalization is used ONLY for matching labels/patterns.
- Extracted values are NEVER modified; original OCR text is preserved.
- No fuzzy matching, no LLM, no transliteration of extracted values.
"""

from __future__ import annotations

import re
import unicodedata
from typing import Optional


# Devanagari code-point block: U+0900 - U+097F
_DEVANAGARI_BLOCK_START = 0x0900
_DEVANAGARI_BLOCK_END = 0x097F

# Devanagari digits to Arabic digit mapping
_DEVANAGARI_DIGIT_MAP = {
    "०": "0",
    "१": "1",
    "२": "2",
    "३": "3",
    "४": "4",
    "५": "5",
    "६": "6",
    "७": "7",
    "८": "8",
    "९": "9",
}

_ARABIC_TO_DEVANAGARI_DIGIT_MAP = {v: k for k, v in _DEVANAGARI_DIGIT_MAP.items()}


def normalize_unicode(text: str, form: str = "NFC") -> str:
    """Apply conservative Unicode normalization.

    Args:
        text: Input text.
        form: Unicode normalization form (NFC, NFD, NFKC, NFKD).

    Returns:
        Normalized text. Returns original text on invalid input.
    """
    try:
        return unicodedata.normalize(form, text)
    except (TypeError, ValueError):
        return text


def contains_devanagari(text: str) -> bool:
    """Return True if text contains any Devanagari script characters."""
    for ch in text:
        cp = ord(ch)
        if _DEVANAGARI_BLOCK_START <= cp <= _DEVANAGARI_BLOCK_END:
            return True
    return False


def devanagari_digits_to_arabic(text: str) -> str:
    """Replace Devanagari digits with Arabic digits in a copy of the text.

    The original text is never modified. This is intended for pattern/label
    matching only, not for rewriting extracted values.

    Args:
        text: Input text possibly containing Devanagari digits.

    Returns:
        Text with Devanagari digits replaced by Arabic equivalents.
    """
    return "".join(_DEVANAGARI_DIGIT_MAP.get(ch, ch) for ch in text)


def arabic_digits_to_devanagari(text: str) -> str:
    """Replace Arabic digits with Devanagari digits in a copy of the text.

    Args:
        text: Input text possibly containing Arabic digits.

    Returns:
        Text with Arabic digits replaced by Devanagari equivalents.
    """
    return "".join(_ARABIC_TO_DEVANAGARI_DIGIT_MAP.get(ch, ch) for ch in text)


def normalize_whitespace(text: str) -> str:
    """Normalize whitespace for label/pattern matching.

    - Collapses repeated spaces/tabs into a single space.
    - Strips leading/trailing whitespace.
    - Replaces line breaks with a single space.

    Args:
        text: Input text.

    Returns:
        Whitespace-normalized text.
    """
    text = text.replace("\r\n", " ").replace("\r", " ").replace("\n", " ")
    text = re.sub(r"[ \t]+", " ", text)
    return text.strip()


def normalize_punctuation(text: str) -> str:
    """Apply conservative punctuation normalization for matching.

    - Collapses repeated punctuation marks (e.g., "!!" -> "!").
    - Preserves slashes, hyphens, and parentheses for numeric values.
    - Does NOT remove punctuation globally.

    Args:
        text: Input text.

    Returns:
        Punctuation-normalized text.
    """
    if not text:
        return text
    text = re.sub(r"([!?.,;:])\1+", r"\1", text)
    text = re.sub(r"(['\"])\1+", r"\1", text)
    return text


def normalize_for_matching(text: str) -> str:
    """Full conservative normalization suitable for label/pattern matching.

    Steps:
    1. Unicode NFC normalization
    2. Devanagari digits -> Arabic digits (so patterns can use \\d)
    3. Whitespace normalization
    4. Punctuation normalization

    The original text is never modified; extracted values preserve their
    exact OCR representation.

    Args:
        text: Input text from OCR.

    Returns:
        Normalized text for matching purposes.
    """
    text = normalize_unicode(text, form="NFC")
    text = devanagari_digits_to_arabic(text)
    text = normalize_whitespace(text)
    text = normalize_punctuation(text)
    return text


def normalize_label_variant(text: str) -> str:
    """Normalize a label string for variant matching.

    In addition to full matching normalization, this also lowercases
    ASCII letters while preserving Devanagari script.

    Args:
        text: Input label text.

    Returns:
        Normalized label text.
    """
    text = normalize_for_matching(text)
    return "".join(ch.lower() if "A" <= ch <= "Z" or "a" <= ch <= "z" else ch for ch in text)


# Known label variants for common RoR fields.
# Keys are field names; values are normalized label fragments that should
# match the beginning of a line.
_LABEL_VARIANTS: dict[str, list[str]] = {
    "khata_number": [
        "khata number",
        "खाता संख्या",
        "खाता नं.",
        "खाता नं",
        "खाता",
        "खता",
    ],
    "khewat_number": [
        "khewat number",
        "खेवट संख्या",
        "खेवट नं.",
        "खेवट नं",
        "खेवट",
    ],
    "khatoni_number": [
        "khatoni number",
        "खतौनी संख्या",
        "खतौनी नं.",
        "खतौनी नं",
        "खतौनी",
    ],
    "khasra_number": [
        "khasra number",
        "खसरा संख्या",
        "खसरा नं.",
        "खसरा नं",
        "खसरा",
    ],
    "year": [
        "year",
        "साल",
        "वर्ष",
        "financial year",
        "वित्तीय वर्ष",
    ],
    "district": [
        "district",
        "जिला",
    ],
    "tehsil": [
        "tehsil",
        "तहसील",
        "तहसील",
        "मंडल",
    ],
    "village": [
        "village",
        "ग्राम",
        "गांव",
        "गाँव",
    ],
    "landholder_name": [
        "name of owner",
        "owner name",
        "landholder name",
        "खातेदार का नाम",
        "नाम",
    ],
    "father_or_husband_name": [
        "father name",
        "father's name",
        "husband name",
        "husband's name",
        "पिता का नाम",
        "पति का नाम",
    ],
    "address": [
        "address",
        "पता",
    ],
    "area": [
        "area",
        "रकबा",
        "क्षेत्रफल",
    ],
    "land_classification": [
        "land classification",
        "सामाजिक वर्गीकरण",
        "भूमि वर्गीकरण",
    ],
    "irrigation_source": [
        "irrigation source",
        "सिंचाई का स्रोत",
        "सिंचित",
        "असिंचित",
    ],
    "revenue": [
        "revenue",
        "राजस्व",
        "राजस्व राशि",
    ],
    "mutation_number": [
        "mutation number",
        "नामांतरण संख्या",
        "म्यूटेशन नं.",
    ],
    "mutation_details": [
        "mutation details",
        "नामांतरण विवरण",
    ],
    "remarks": [
        "remarks",
        "विवरण",
    ],
}


def find_label_in_text(text: str) -> Optional[tuple[str, int]]:
    """Find a known RoR label in OCR text.

    Matching is conservative:
    - Normalizes the text for matching (Unicode NFC, digit mapping,
      whitespace, punctuation, ASCII lowercasing).
    - Checks normalized label variants as prefixes or substrings.
    - Returns the field name and the word count of the matched label
      fragment in the *normalized* text.

    Args:
        text: Raw OCR line text.

    Returns:
        (field_name, label_word_count) or None if no label is found.
    """
    normalized = normalize_label_variant(text)
    for field_name, variants in _LABEL_VARIANTS.items():
        for variant in variants:
            norm_variant = normalize_label_variant(variant)
            if normalized.startswith(norm_variant):
                return field_name, len(norm_variant.split())
            if norm_variant in normalized:
                return field_name, len(norm_variant.split())
    return None


def is_likely_hindi_label(text: str) -> bool:
    """Heuristic: return True if the text looks like a Hindi label fragment.

    This is intentionally conservative. It is used only to adjust matching
    behavior, not to modify extracted values.
    """
    normalized = normalize_for_matching(text)
    for variants in _LABEL_VARIANTS.values():
        for variant in variants:
            norm_variant = normalize_label_variant(variant)
            if norm_variant in normalized:
                return True
    return False
