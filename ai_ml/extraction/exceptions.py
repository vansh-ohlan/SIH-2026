"""Extraction-specific exceptions."""


class ExtractionError(Exception):
    """Base exception for extraction module errors."""


class InvalidOCRResultError(ExtractionError):
    """Raised when the OCR result is invalid or malformed."""


class UnsupportedDocumentError(ExtractionError):
    """Raised when the document structure is not supported."""


class ExtractionFailureError(ExtractionError):
    """Raised when field extraction fails."""


class ExtractionConfigurationError(ExtractionError):
    """Raised when extraction configuration is invalid."""
