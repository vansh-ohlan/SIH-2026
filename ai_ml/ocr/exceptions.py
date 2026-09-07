"""OCR-specific exceptions."""


class OCRError(Exception):
    """Base exception for OCR module errors."""


class OCRImageError(OCRError):
    """Raised when the input image is invalid or unsupported."""


class OCREngineUnavailableError(OCRError):
    """Raised when the requested OCR engine or its dependencies are missing."""


class OCRInferenceError(OCRError):
    """Raised when OCR inference fails."""


class OCRParsingError(OCRError):
    """Raised when OCR engine output cannot be parsed into the expected schema."""


class OCRConfigurationError(OCRError):
    """Raised when OCR configuration is invalid."""
