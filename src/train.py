"""
Train and evaluate multiple ML models on the Heart Disease dataset.

For every model we build a full scikit-learn Pipeline (shared preprocessing +
classifier), train it on a stratified train split, and evaluate it on a held-out
test split. All metrics required by the project brief are computed:

    Accuracy, Precision, Recall, F1, ROC-AUC, Training time, Confusion matrix

Artifacts written:
    models/<model>.joblib        - one trained pipeline per model
    models/_meta.joblib          - train/test split + feature info for the app
    reports/metrics.json         - everything the dashboard needs to render

Run:  py -3.12 src/train.py
"""
from __future__ import annotations

import os
import json
import time

import joblib
import numpy as np
from sklearn.model_selection import train_test_split, cross_val_score
from sklearn.pipeline import Pipeline
from sklearn.linear_model import LogisticRegression
from sklearn.ensemble import RandomForestClassifier, GradientBoostingClassifier
from sklearn.svm import SVC
from sklearn.calibration import CalibratedClassifierCV
from sklearn.metrics import (
    accuracy_score, precision_score, recall_score, f1_score, roc_auc_score,
    confusion_matrix, roc_curve,
)

from preprocess import (
    get_X_y, build_preprocessor, MODELS_DIR, REPORTS_DIR,
    NUMERIC_FEATURES, CATEGORICAL_FEATURES,
)

RANDOM_STATE = 42

MODELS = {
    "Logistic Regression": LogisticRegression(max_iter=1000, random_state=RANDOM_STATE),
    "Random Forest": RandomForestClassifier(
        n_estimators=300, max_depth=None, random_state=RANDOM_STATE, n_jobs=-1),
    "Support Vector Machine": CalibratedClassifierCV(
        SVC(C=1.0, kernel="rbf", random_state=RANDOM_STATE), ensemble=False),
    "Gradient Boosting": GradientBoostingClassifier(random_state=RANDOM_STATE),
}


def main():
    os.makedirs(MODELS_DIR, exist_ok=True)
    os.makedirs(REPORTS_DIR, exist_ok=True)

    X, y = get_X_y()
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, stratify=y, random_state=RANDOM_STATE)

    results = {}
    for name, clf in MODELS.items():
        pipe = Pipeline(steps=[
            ("prep", build_preprocessor()),
            ("clf", clf),
        ])

        t0 = time.perf_counter()
        pipe.fit(X_train, y_train)
        train_time = time.perf_counter() - t0

        # 5-fold CV accuracy on the training set (stability check)
        cv_scores = cross_val_score(pipe, X_train, y_train, cv=5, scoring="accuracy")

        y_pred = pipe.predict(X_test)
        y_proba = pipe.predict_proba(X_test)[:, 1]

        fpr, tpr, _ = roc_curve(y_test, y_proba)
        cm = confusion_matrix(y_test, y_pred)

        results[name] = {
            "accuracy": float(accuracy_score(y_test, y_pred)),
            "precision": float(precision_score(y_test, y_pred)),
            "recall": float(recall_score(y_test, y_pred)),
            "f1": float(f1_score(y_test, y_pred)),
            "roc_auc": float(roc_auc_score(y_test, y_proba)),
            "train_time": float(train_time),
            "cv_accuracy_mean": float(cv_scores.mean()),
            "cv_accuracy_std": float(cv_scores.std()),
            "confusion_matrix": cm.tolist(),
            "roc_curve": {"fpr": fpr.tolist(), "tpr": tpr.tolist()},
        }

        joblib.dump(pipe, os.path.join(MODELS_DIR, f"{_slug(name)}.joblib"))
        print(f"{name:24s} acc={results[name]['accuracy']:.3f} "
              f"f1={results[name]['f1']:.3f} auc={results[name]['roc_auc']:.3f} "
              f"({train_time*1000:.0f} ms)")

    # Choose best model by ROC-AUC (good for imbalanced / medical screening)
    best = max(results, key=lambda k: results[k]["roc_auc"])
    for k in results:
        results[k]["is_best"] = (k == best)

    payload = {
        "dataset": {
            "n_records": int(len(X)),
            "n_features": int(X.shape[1]),
            "n_train": int(len(X_train)),
            "n_test": int(len(X_test)),
            "class_balance": {"0": int((y == 0).sum()), "1": int((y == 1).sum())},
            "numeric_features": NUMERIC_FEATURES,
            "categorical_features": CATEGORICAL_FEATURES,
        },
        "best_model": best,
        "models": results,
    }
    with open(os.path.join(REPORTS_DIR, "metrics.json"), "w", encoding="utf-8") as fh:
        json.dump(payload, fh, indent=2)

    # Save the split so the app/report can reference exact numbers
    joblib.dump({"X_test": X_test, "y_test": y_test}, os.path.join(MODELS_DIR, "_meta.joblib"))

    print(f"\nBest model (by ROC-AUC): {best}")
    print(f"Wrote reports/metrics.json and {len(MODELS)} model files.")


def _slug(name: str) -> str:
    return name.lower().replace(" ", "_")


if __name__ == "__main__":
    main()
