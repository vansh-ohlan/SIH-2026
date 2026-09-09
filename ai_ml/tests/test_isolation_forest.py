"""Tests for ai_ml.anomaly.isolation_forest."""

from __future__ import annotations

import numpy as np
import pytest

from ai_ml.anomaly.isolation_forest import AnomalyModel


class TestAnomalyModel:
    def test_fit_and_predict(self) -> None:
        model = AnomalyModel(contamination=0.2, random_state=42)
        X = np.array([
            [0.0, 1.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0],
            [1.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0],
            [0.5, 0.5, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0],
            [10.0, 10.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0],
        ])
        model.fit(X)
        assert model.is_fitted is True
        predictions = model.predict(X)
        assert predictions.shape == (4,)
        assert set(predictions.tolist()).issubset({1, -1})

    def test_score_range(self) -> None:
        model = AnomalyModel(contamination=0.2, random_state=42)
        X = np.array([
            [0.0, 1.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0],
            [1.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0],
            [0.5, 0.5, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0],
            [10.0, 10.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0],
        ])
        model.fit(X)
        scores = model.score(X)
        assert scores.shape == (4,)
        assert np.all(scores >= 0.0)
        assert np.all(scores <= 1.0)

    def test_deterministic_with_random_state(self) -> None:
        X = np.array([
            [0.0, 1.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0],
            [1.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0],
            [0.5, 0.5, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0],
            [10.0, 10.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0],
        ])
        model1 = AnomalyModel(contamination=0.2, random_state=42)
        model1.fit(X)
        scores1 = model1.score(X)

        model2 = AnomalyModel(contamination=0.2, random_state=42)
        model2.fit(X)
        scores2 = model2.score(X)

        np.testing.assert_array_equal(scores1, scores2)

    def test_raises_before_fit(self) -> None:
        model = AnomalyModel(contamination=0.1, random_state=42)
        X = np.array([[0.0] * len(model.feature_names)])
        with pytest.raises(RuntimeError):
            model.predict(X)
        with pytest.raises(RuntimeError):
            model.score(X)

    def test_feature_mismatch_raises(self) -> None:
        model = AnomalyModel(contamination=0.1, random_state=42)
        X_good = np.array([[0.0] * len(model.feature_names)])
        model.fit(X_good)
        X_bad = np.array([[0.0] * (len(model.feature_names) + 1)])
        with pytest.raises(ValueError):
            model.predict(X_bad)
        with pytest.raises(ValueError):
            model.score(X_bad)

    def test_single_sample_score(self) -> None:
        model = AnomalyModel(contamination=0.1, random_state=42)
        X = np.array([[0.0] * len(model.feature_names)])
        model.fit(X)
        scores = model.score(X)
        assert scores.shape == (1,)

    def test_invalid_contamination_raises(self) -> None:
        with pytest.raises(ValueError):
            AnomalyModel(contamination=0.0, random_state=42)
        with pytest.raises(ValueError):
            AnomalyModel(contamination=0.6, random_state=42)
