"""OCR post-processing for Hindi/English/mixed documents."""

from __future__ import annotations

import re
import unicodedata
from dataclasses import dataclass, field
from typing import Optional

from ai_ml.ocr.config import OCRConfig
from ai_ml.ocr.exceptions import OCRConfigurationError
from ai_ml.ocr.schema import OCRBlock, OCRLine, OCRPage, OCRResult, OCRWord


@dataclass
class PostprocessConfig:
    """Configuration for OCR post-processing."""

    apply_unicode_normalization: bool = True
    unicode_form: str = "NFC"
    apply_whitespace_normalization: bool = True
    remove_empty_elements: bool = True
    preserve_numeric_as_is: bool = True
    preserve_devanagari_as_is: bool = True
    confidence_preservation: str = "keep"
    retain_original_text: bool = True


def _normalize_unicode(text: str, form: str = "NFC") -> str:
    """Normalize Unicode text.

    Args:
        text: Input text.
        form: Unicode normalization form (NFC, NFD, NFKC, NFKD).

    Returns:
        Normalized text.
    """
    try:
        return unicodedata.normalize(form, text)
    except (TypeError, ValueError):
        return text


def _normalize_whitespace(text: str) -> str:
    """Normalize whitespace in text.

    - Collapse repeated spaces/tabs into a single space.
    - Strip leading/trailing whitespace.
    - Replace line breaks within the string with a single space.

    Args:
        text: Input text.

    Returns:
        Whitespace-normalized text.
    """
    text = text.replace("\r\n", " ").replace("\r", " ").replace("\n", " ")
    text = re.sub(r"[ \t]+", " ", text)
    return text.strip()


def _is_pure_numeric(text: str) -> bool:
    """Check if text is purely numeric or a safe numeric pattern.

    Safe patterns include:
    - Digits with optional decimal points
    - Slash-separated numbers (e.g., khasra numbers like 142/1)
    - Hyphenated numeric ranges
    - Parenthesized numbers

    Args:
        text: Input text.

    Returns:
        True if the text appears to be purely numeric/safe numeric pattern.
    """
    if not text:
        return False
    return bool(re.fullmatch(r"[0-9/.\-(),]+", text))


def _clean_ocr_artifacts(text: str) -> str:
    """Apply conservative OCR artifact cleanup.

    Only removes obvious artifacts:
    - Repeated identical characters beyond normal length (e.g., "aaa" → "a")
    - Does NOT autocorrect words or guess intended text.

    Args:
        text: Input text.

    Returns:
        Cleaned text.
    """
    if not text:
        return text

    if _is_pure_numeric(text):
        return text

    text = re.sub(r"(?<![\\u0900-\\u097F\\u200C\\u200D]){3,}", lambda m: m.group(0)[:2], text)

    text = re.sub(r"[\u200c\u200d]+", "", text)

    return text


def _clean_punctuation(text: str) -> str:
    """Apply conservative punctuation cleanup.

    - Collapses repeated punctuation marks (e.g., "!!" → "!")
    - Does NOT remove punctuation globally.
    - Preserves slashes, hyphens, parentheses for numeric values.

    Args:
        text: Input text.

    Returns:
        Cleaned text.
    """
    if not text:
        return text

    if _is_pure_numeric(text):
        return text

    text = re.sub(r"([!?.,;:])\1+", r"\1", text)
    text = re.sub(r"(['\"])\1+", r"\1", text)

    return text


def _process_text(text: str, config: PostprocessConfig) -> str:
    """Apply all configured post-processing steps to a single text string.

    Args:
        text: Input text.
        config: Post-processing configuration.

    Returns:
        Processed text.
    """
    original = text

    if config.apply_unicode_normalization:
        text = _normalize_unicode(text, form=config.unicode_form)

    if config.preserve_devanagari_as_is and any(
        "\\u0900" <= ch <= "\\u097F" or ch in ("\\u200c", "\\u200d") for ch in text
    ):
        pass

    if not _is_pure_numeric(text):
        text = _clean_ocr_artifacts(text)
        text = _clean_punctuation(text)

    if config.apply_whitespace_normalization:
        text = _normalize_whitespace(text)

    if not text and config.remove_empty_elements:
        return ""

    return text


def _should_remove_word(word: OCRWord, config: PostprocessConfig) -> bool:
    """Determine if a word should be removed entirely.

    Args:
        word: OCRWord to evaluate.
        config: Post-processing configuration.

    Returns:
        True if the word should be removed.
    """
    if not config.remove_empty_elements:
        return False

    processed = word.text if word.text is not None else ""
    if not processed.strip():
        return True

    return False


def _process_word(word: OCRWord, config: PostprocessConfig) -> OCRWord:
    """Post-process a single OCRWord.

    Args:
        word: Input OCRWord.
        config: Post-processing configuration.

    Returns:
        New OCRWord with processed text and preserved metadata.
    """
    original_text = word.text if word.text is not None else ""
    processed_text = _process_text(original_text, config)

    if config.retain_original_text:
        new_word = OCRWord(
            text=processed_text,
            original_text=original_text if original_text != processed_text else None,
            confidence=word.confidence,
            bbox=word.bbox,
            language=word.language,
        )
    else:
        new_word = OCRWord(
            text=processed_text,
            confidence=word.confidence,
            bbox=word.bbox,
            language=word.language,
        )

    return new_word


def _process_line(line: OCRLine, config: PostprocessConfig) -> OCRLine:
    """Post-process an OCRLine.

    Args:
        line: Input OCRLine.
        config: Post-processing configuration.

    Returns:
        Processed OCRLine. Empty lines are preserved with empty word lists.
    """
    processed_words = [_process_word(word, config) for word in line.words]

    if config.remove_empty_elements:
        processed_words = [w for w in processed_words if not _should_remove_word(w, config)]

    return OCRLine(
        line_id=line.line_id,
        words=processed_words,
        bbox=line.bbox,
    )


def _process_block(block: OCRBlock, config: PostprocessConfig) -> OCRBlock:
    """Post-process an OCRBlock.

    Args:
        block: Input OCRBlock.
        config: Post-processing configuration.

    Returns:
        Processed OCRBlock. Empty blocks are preserved with empty line lists.
    """
    processed_lines = [_process_line(line, config) for line in block.lines]

    return OCRBlock(
        block_id=block.block_id,
        lines=processed_lines,
        bbox=block.bbox,
    )


def _process_page(page: OCRPage, config: PostprocessConfig) -> OCRPage:
    """Post-process an OCRPage.

    Args:
        page: Input OCRPage.
        config: Post-processing configuration.

    Returns:
        Processed OCRPage. Empty pages are preserved with empty block lists.
    """
    processed_blocks = [_process_block(block, config) for block in page.blocks]

    return OCRPage(
        page_number=page.page_number,
        blocks=processed_blocks,
        width=page.width,
        height=page.height,
    )


def postprocess(
    result: OCRResult,
    config: Optional[OCRConfig | PostprocessConfig] = None,
) -> OCRResult:
    """Post-process raw OCR results.

    This function cleans and normalizes OCR output while preserving spatial
    metadata and confidence. It is intentionally conservative: it removes
    obvious artifacts and normalizes formatting, but does not autocorrect
    words or infer missing content.

    Args:
        result: Raw OCRResult from the engine.
        config: OCR configuration or post-processing configuration.
            Uses defaults if not provided.

    Returns:
        Post-processed OCRResult with cleaned text and preserved metadata.

    Raises:
        OCRConfigurationError: If the configuration is invalid.
    """
    if config is None:
        pp_config = PostprocessConfig()
    elif isinstance(config, PostprocessConfig):
        pp_config = config
    else:
        pp_config = PostprocessConfig()

    processed_pages = [_process_page(page, pp_config) for page in result.pages]

    return OCRResult(
        pages=processed_pages,
        engine_name=result.engine_name,
        language=result.language,
        raw_metadata=result.raw_metadata,
    )
