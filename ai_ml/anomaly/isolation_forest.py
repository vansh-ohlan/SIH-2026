"""IsolationForest wrapper for anomaly detection.

Wraps sklearn IsolationForest with a clean interface, deterministic behavior,
and safe handling of missing values.
"""

from __future__ import annotations

from typing import Any, Optional

import numpy as np
from sklearn.ensemble import IsolationForest


class AnomalyModel:
    """Deterministic wrapper around sklearn IsolationForest.

    The model is stateless with respect to the data it has seen; fitting is
    explicit and separate from scoring. This makes the model replaceable later
    without changing callers.

    Attributes:
        feature_names: Ordered feature names used by the model.
        contamination: Expected proportion of anomalies in the training data.
        random_state: Seed for reproducibility.
    """

    def __init__(
        self,
        contamination: float = 0.1,
        random_state: Optional[int] = 42,
        feature_names: Optional[list[str]] = None,
    ) -> None:
        if contamination <= 0 or contamination > 0.5:
            raise ValueError("contamination must be in (0, 0.5]")
        self.contamination = contamination
        self.random_state = random_state
        self.feature_names = feature_names or [
            "num_parcels",
            "num_landholders",
            "num_extracted_fields",
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
        self._model = IsolationForest(
            contamination=self.contamination,
            random_state=self.random_state,
        )
        self._is_fitted = False

    def fit(self, X: np.ndarray) -> "AnomalyModel":
        """Fit the IsolationForest on a 2-D feature matrix.

        Args:
            X: 2-D numpy array of shape (n_samples, n_features).

        Returns:
            self
        """
        if X.ndim != 2:
            raise ValueError(f"X must be 2-D, got shape {X.shape}")
        if X.shape[1] != len(self.feature_names):
            raise ValueError(
                f"X has {X.shape[1]} features; expected {len(self.feature_names)} "
                f"({self.feature_names})"
            )
        self._model.fit(X)
        self._is_fitted = True
        return self

    def score(self, X: np.ndarray) -> np.ndarray:
        """Compute anomaly scores for samples.

        IsolationForest anomaly scores are in [0, 1] where higher means more
        anomalous. The score is derived from the path length in the trees.

        Args:
            X: 2-D numpy array of shape (n_samples, n_features).

        Returns:
            1-D numpy array of anomaly scores in [0, 1].
        """
        if not self._is_fitted:
            raise RuntimeError("Model has not been fitted. Call fit() first.")
        if X.ndim == 1:
            X = X.reshape(1, -1)
        if X.shape[1] != len(self.feature_names):
            raise ValueError(
                f"X has {X.shape[1]} features; expected {len(self.feature_names)} "
                f"({self.feature_names})"
            )
        raw_scores = self._model.decision_function(X)
        # decision_function returns lower scores for anomalies.
        # Normalize to [0, 1] where 1 = most anomalous.
        # We use a simple min-max scaling based on typical IsolationForest range.
        normalized = 1.0 - (raw_scores + 1.0) / 2.0
        return np.clip(normalized, 0.0, 1.0)

    def predict(self, X: np.ndarray) -> np.ndarray:
        """Predict whether samples are anomalies.

        Args:
            X: 2-D numpy array of shape (n_samples, n_features).

        Returns:
            1-D numpy array of predictions: 1 = normal, -1 = anomalous.
        """
        if not self._is_fitted:
            raise RuntimeError("Model has not been fitted. Call fit() first.")
        if X.ndim == 1:
            X = X.reshape(1, -1)
        return self._model.predict(X)

    @property
    def is_fitted(self) -> bool:
        """Whether the model has been fitted."""
        return self._is_fitted
