"""Backend API Gateway for Bhu-Setu.

Accepts land-record document uploads and delegates AI inference to the
existing AI FastAPI service via AIInferenceClient.
"""

from __future__ import annotations

from .main import create_app

app = create_app()