"""
Flask web server for the Heart Disease Prediction project.

This is the modern front-end for the project. It REUSES the models trained by
`src/train.py` (loaded from models/*.joblib) and the metrics in
reports/metrics.json — no model is retrained here, and no external API is used.
All prediction happens locally inside this process.

Run:  py -3.12 web/server.py        (then open http://localhost:5000)
"""
from __future__ import annotations

import os
import sys
import json

import joblib
import numpy as np
import pandas as pd
from flask import Flask, render_template, request, jsonify

# Make the project root importable so we can reuse src/preprocess.py
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, ROOT)

from src.preprocess import (  # noqa: E402
    load_raw, FEATURE_INFO, ALL_FEATURES, NUMERIC_FEATURES,
    CATEGORICAL_FEATURES, MODELS_DIR, REPORTS_DIR,
)

app = Flask(__name__)

# ---------------------------------------------------------------------------
# Load artifacts once at startup
# ---------------------------------------------------------------------------
with open(os.path.join(REPORTS_DIR, "metrics.json"), encoding="utf-8") as fh:
    METRICS = json.load(fh)

MODELS = {}
for _fname in os.listdir(MODELS_DIR):
    if _fname.endswith(".joblib") and not _fname.startswith("_"):
        _name = _fname[: -len(".joblib")].replace("_", " ").title().replace("Svm", "SVM")
        MODELS[_name] = joblib.load(os.path.join(MODELS_DIR, _fname))

BEST_MODEL = METRICS["best_model"]

# Pre-build a JSON-friendly description of the form fields for the template
FORM_FIELDS = []
for feat in ALL_FEATURES:
    info = FEATURE_INFO[feat]
    field = {"name": feat, "label": info["label"], "type": info["type"],
             "help": info.get("help", "")}
    if info["type"] == "numeric":
        field.update(min=info["min"], max=info["max"],
                     default=info["default"], step=info.get("step", 1))
    else:
        field["options"] = [{"value": k, "text": v} for k, v in info["options"].items()]
        field["default"] = info.get("default", list(info["options"].keys())[0])
    FORM_FIELDS.append(field)


def _model_key(name: str) -> str:
    norm = name.lower().replace(" ", "")
    for k in METRICS["models"]:
        if k.lower().replace(" ", "") == norm:
            return k
    return name


# ---------------------------------------------------------------------------
# Pages
# ---------------------------------------------------------------------------
@app.route("/")
def home():
    ds = METRICS["dataset"]
    best_auc = METRICS["models"][BEST_MODEL]["roc_auc"]
    stats = {
        "records": ds["n_records"],
        "features": ds["n_features"],
        "models": len(METRICS["models"]),
        "best_auc": round(best_auc, 3),
    }
    return render_template("index.html", stats=stats, best_model=BEST_MODEL, page="home")


@app.route("/predict")
def predict_page():
    return render_template("predict.html", fields=FORM_FIELDS,
                           models=list(MODELS.keys()), best_model=BEST_MODEL, page="predict")


@app.route("/dashboard")
def dashboard_page():
    return render_template("dashboard.html", page="dashboard")


@app.route("/explore")
def explore_page():
    return render_template("explore.html", page="explore",
                           categorical=[{"name": f, "label": FEATURE_INFO[f]["label"]}
                                        for f in CATEGORICAL_FEATURES],
                           numeric=[{"name": f, "label": FEATURE_INFO[f]["label"]}
                                    for f in NUMERIC_FEATURES])


# ---------------------------------------------------------------------------
# JSON API (local — no external calls)
# ---------------------------------------------------------------------------
@app.route("/api/metrics")
def api_metrics():
    return jsonify(METRICS)


@app.route("/api/predict", methods=["POST"])
def api_predict():
    payload = request.get_json(force=True)
    model_name = payload.get("model", BEST_MODEL)
    if model_name not in MODELS:
        model_name = BEST_MODEL
    try:
        row = [[float(payload["features"][f]) for f in ALL_FEATURES]]
    except (KeyError, TypeError, ValueError) as exc:
        return jsonify({"error": f"Invalid input: {exc}"}), 400

    X = pd.DataFrame(row, columns=ALL_FEATURES)
    pipe = MODELS[model_name]
    proba = float(pipe.predict_proba(X)[:, 1][0])
    pred = int(proba >= 0.5)
    m = METRICS["models"][_model_key(model_name)]
    return jsonify({
        "prediction": pred,
        "label": "Heart disease likely" if pred else "No heart disease",
        "probability": round(proba, 4),
        "percent": round(proba * 100, 1),
        "model": model_name,
        "model_auc": round(m["roc_auc"], 3),
        "model_recall": round(m["recall"], 3),
    })


@app.route("/api/explore")
def api_explore():
    """Aggregated, chart-ready views of the dataset (computed locally)."""
    df = load_raw()
    label = df["target"].map({0: "No disease", 1: "Disease"})

    # Numeric distributions (binned) split by class
    numeric = {}
    for f in NUMERIC_FEATURES:
        series = df[f].dropna()
        lo, hi = float(series.min()), float(series.max())
        bins = np.linspace(lo, hi, 13)
        centers = [round((bins[i] + bins[i + 1]) / 2, 1) for i in range(len(bins) - 1)]
        out = {"centers": centers}
        for cls, name in [(0, "No disease"), (1, "Disease")]:
            vals = df.loc[df["target"] == cls, f].dropna()
            counts, _ = np.histogram(vals, bins=bins)
            out[name] = counts.tolist()
        numeric[f] = out

    # Disease rate per category
    categorical = {}
    for f in CATEGORICAL_FEATURES:
        grp = df.groupby(f)["target"].mean()
        opts = FEATURE_INFO[f]["options"]
        categorical[f] = {
            "labels": [opts.get(k, str(k)) for k in grp.index],
            "rates": [round(float(v), 3) for v in grp.values],
        }

    # Correlations with the target
    corr = df[ALL_FEATURES + ["target"]].corr(numeric_only=True)["target"].drop("target")
    corr = corr.sort_values()
    correlations = {"labels": list(corr.index),
                    "values": [round(float(v), 3) for v in corr.values]}

    balance = METRICS["dataset"]["class_balance"]
    return jsonify({"numeric": numeric, "categorical": categorical,
                    "correlations": correlations, "balance": balance})


if __name__ == "__main__":
    # Bind to 0.0.0.0 and honour the PORT env var so the same file works locally
    # and on hosting platforms (Render, Hugging Face, etc.).
    port = int(os.environ.get("PORT", 5000))
    app.run(host="0.0.0.0", port=port, debug=False)
