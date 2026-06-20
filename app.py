"""
Heart Disease Prediction - Machine Learning Web Application
============================================================

A fully self-contained Streamlit app (no external prediction APIs) that:
  * lets a user enter clinical measurements and get a heart-disease risk
    prediction from a locally trained model,
  * shows a model-comparison dashboard (accuracy, precision, recall, F1,
    ROC-AUC, training time, confusion matrices, ROC curves), and
  * provides interactive exploration of the dataset.

Run:  py -3.12 -m streamlit run app.py
"""
from __future__ import annotations

import os
import json

import joblib
import numpy as np
import pandas as pd
import plotly.express as px
import plotly.graph_objects as go
import streamlit as st

from src.preprocess import (
    load_raw, FEATURE_INFO, ALL_FEATURES, NUMERIC_FEATURES,
    CATEGORICAL_FEATURES, MODELS_DIR, REPORTS_DIR,
)

st.set_page_config(page_title="Heart Disease ML App", page_icon="❤️",
                   layout="wide", initial_sidebar_state="expanded")

METRIC_LABELS = {
    "accuracy": "Accuracy", "precision": "Precision", "recall": "Recall",
    "f1": "F1 Score", "roc_auc": "ROC-AUC", "train_time": "Train Time (s)",
}


# ---------------------------------------------------------------------------
# Cached loaders
# ---------------------------------------------------------------------------
@st.cache_data
def get_data() -> pd.DataFrame:
    return load_raw()


@st.cache_data
def get_metrics() -> dict:
    with open(os.path.join(REPORTS_DIR, "metrics.json"), encoding="utf-8") as fh:
        return json.load(fh)


@st.cache_resource
def get_models() -> dict:
    models = {}
    for fname in os.listdir(MODELS_DIR):
        if fname.endswith(".joblib") and not fname.startswith("_"):
            name = fname[:-len(".joblib")].replace("_", " ").title()
            # Normalise a couple of display names
            name = name.replace("Svm", "SVM")
            models[name] = joblib.load(os.path.join(MODELS_DIR, fname))
    return models


def _model_key_match(metrics_models: dict, loaded_name: str) -> str | None:
    """Map a loaded model name to its metrics.json key (case/spacing tolerant)."""
    norm = loaded_name.lower().replace(" ", "")
    for k in metrics_models:
        if k.lower().replace(" ", "") == norm:
            return k
    return None


# ---------------------------------------------------------------------------
# Pages
# ---------------------------------------------------------------------------
def page_home(metrics):
    st.title("❤️ Heart Disease Prediction")
    st.markdown(
        "A machine-learning web application that predicts the **presence of "
        "heart disease** from routine clinical measurements, and compares "
        "several models trained locally on the UCI Heart Disease dataset."
    )

    ds = metrics["dataset"]
    c1, c2, c3, c4 = st.columns(4)
    c1.metric("Records", f"{ds['n_records']:,}")
    c2.metric("Features", ds["n_features"])
    c3.metric("Models trained", len(metrics["models"]))
    best = metrics["best_model"]
    c4.metric("Best model (ROC-AUC)", f"{metrics['models'][best]['roc_auc']:.3f}",
              help=f"Best model: {best}")

    st.divider()
    st.subheader("How to use this app")
    st.markdown(
        "- **🔮 Predict** — enter patient measurements and get a risk prediction.\n"
        "- **📊 Model Dashboard** — compare every model on all metrics.\n"
        "- **🔎 Data Explorer** — inspect the dataset used for training.\n"
    )

    st.subheader("Project requirements covered")
    st.markdown(
        "| Requirement | Where |\n|---|---|\n"
        "| Web interface | This Streamlit app |\n"
        "| ≥ 2 ML algorithms on one dataset | 4 models, same UCI dataset |\n"
        "| No external APIs | All models trained & run locally |\n"
        "| User input → prediction | **Predict** page |\n"
        "| Model comparison dashboard | **Model Dashboard** page |\n"
        "| 500+ record dataset | 920 records |\n"
    )
    st.caption("Educational project — not a medical device. Do not use for real diagnosis.")


def page_predict(models, metrics):
    st.title("🔮 Predict Heart Disease Risk")
    st.markdown("Enter the patient's measurements and choose a model.")

    model_names = list(models.keys())
    default_idx = next((i for i, n in enumerate(model_names)
                        if _model_key_match(metrics["models"], n) == metrics["best_model"]), 0)
    chosen = st.selectbox("Model", model_names, index=default_idx)

    with st.form("predict_form"):
        cols = st.columns(3)
        values = {}
        for i, feat in enumerate(ALL_FEATURES):
            info = FEATURE_INFO[feat]
            col = cols[i % 3]
            if info["type"] == "numeric":
                step = info.get("step", 1.0)
                values[feat] = col.number_input(
                    info["label"], min_value=float(info["min"]),
                    max_value=float(info["max"]), value=float(info["default"]),
                    step=float(step), help=info.get("help"))
            else:
                opts = info["options"]
                keys = list(opts.keys())
                default_key = info.get("default", keys[0])
                values[feat] = col.selectbox(
                    info["label"], keys, index=keys.index(default_key),
                    format_func=lambda k, o=opts: o[k])
        submitted = st.form_submit_button("Predict", type="primary", width="stretch")

    if submitted:
        X = pd.DataFrame([[values[f] for f in ALL_FEATURES]], columns=ALL_FEATURES)
        pipe = models[chosen]
        proba = float(pipe.predict_proba(X)[:, 1][0])
        pred = int(proba >= 0.5)

        st.divider()
        left, right = st.columns([1, 1])
        with left:
            if pred == 1:
                st.error(f"### ⚠️ Heart disease predicted\nEstimated risk: **{proba*100:.1f}%**")
            else:
                st.success(f"### ✅ No heart disease predicted\nEstimated risk: **{proba*100:.1f}%**")
            st.caption(f"Model used: {chosen}")
        with right:
            gauge = go.Figure(go.Indicator(
                mode="gauge+number", value=proba * 100,
                number={"suffix": "%"},
                title={"text": "Predicted risk"},
                gauge={"axis": {"range": [0, 100]},
                       "bar": {"color": "#d62728" if pred else "#2ca02c"},
                       "steps": [{"range": [0, 50], "color": "#e8f5e9"},
                                 {"range": [50, 100], "color": "#fdecea"}],
                       "threshold": {"line": {"color": "black", "width": 3},
                                     "thickness": 0.75, "value": 50}}))
            gauge.update_layout(height=260, margin=dict(l=10, r=10, t=50, b=10))
            st.plotly_chart(gauge, width="stretch")


def page_dashboard(metrics):
    st.title("📊 Model Comparison Dashboard")
    models = metrics["models"]
    best = metrics["best_model"]

    # --- Metrics table -----------------------------------------------------
    rows = []
    for name, m in models.items():
        rows.append({
            "Model": name + (" ⭐" if name == best else ""),
            "Accuracy": m["accuracy"], "Precision": m["precision"],
            "Recall": m["recall"], "F1": m["f1"], "ROC-AUC": m["roc_auc"],
            "CV Acc": m["cv_accuracy_mean"], "Train Time (s)": m["train_time"],
        })
    df = pd.DataFrame(rows).set_index("Model")
    st.subheader("Performance summary")
    st.dataframe(
        df.style.format({c: "{:.3f}" for c in df.columns})
                .highlight_max(subset=["Accuracy", "Precision", "Recall", "F1", "ROC-AUC", "CV Acc"],
                               color="#c8e6c9")
                .highlight_min(subset=["Train Time (s)"], color="#c8e6c9"),
        width="stretch")
    st.caption(f"⭐ Best model by ROC-AUC: **{best}**")

    # --- Grouped bar chart -------------------------------------------------
    st.subheader("Metric comparison")
    melt_metrics = ["accuracy", "precision", "recall", "f1", "roc_auc"]
    long = []
    for name, m in models.items():
        for mk in melt_metrics:
            long.append({"Model": name, "Metric": METRIC_LABELS[mk], "Score": m[mk]})
    long_df = pd.DataFrame(long)
    fig = px.bar(long_df, x="Metric", y="Score", color="Model", barmode="group",
                 range_y=[0, 1], text_auto=".3f")
    fig.update_layout(height=420, legend_title_text="")
    st.plotly_chart(fig, width="stretch")

    # --- ROC curves + training time ---------------------------------------
    c1, c2 = st.columns(2)
    with c1:
        st.subheader("ROC curves")
        roc = go.Figure()
        for name, m in models.items():
            roc.add_trace(go.Scatter(x=m["roc_curve"]["fpr"], y=m["roc_curve"]["tpr"],
                                     mode="lines",
                                     name=f"{name} (AUC={m['roc_auc']:.3f})"))
        roc.add_trace(go.Scatter(x=[0, 1], y=[0, 1], mode="lines",
                                 line=dict(dash="dash", color="gray"),
                                 name="Chance", showlegend=False))
        roc.update_layout(height=380, xaxis_title="False Positive Rate",
                          yaxis_title="True Positive Rate",
                          legend=dict(y=0.05, x=0.4))
        st.plotly_chart(roc, width="stretch")
    with c2:
        st.subheader("Training time")
        tt = pd.DataFrame({"Model": list(models.keys()),
                           "Train Time (s)": [m["train_time"] for m in models.values()]})
        fig_tt = px.bar(tt, x="Train Time (s)", y="Model", orientation="h", text_auto=".3f")
        fig_tt.update_layout(height=380)
        st.plotly_chart(fig_tt, width="stretch")

    # --- Confusion matrices ------------------------------------------------
    st.subheader("Confusion matrices (test set)")
    cm_cols = st.columns(len(models))
    labels = ["No disease", "Disease"]
    for col, (name, m) in zip(cm_cols, models.items()):
        cm = np.array(m["confusion_matrix"])
        fig_cm = px.imshow(cm, text_auto=True, color_continuous_scale="Blues",
                           x=labels, y=labels, aspect="auto",
                           labels=dict(x="Predicted", y="Actual", color="Count"))
        fig_cm.update_layout(title=name, height=300, coloraxis_showscale=False,
                             margin=dict(l=10, r=10, t=40, b=10))
        col.plotly_chart(fig_cm, width="stretch")


def page_explore(data, metrics):
    st.title("🔎 Data Explorer")
    st.markdown(
        "Combined **UCI Heart Disease** dataset (Cleveland, Hungarian, "
        "Switzerland and VA Long Beach databases)."
    )

    c1, c2, c3 = st.columns(3)
    c1.metric("Records", f"{len(data):,}")
    c2.metric("Features", len(ALL_FEATURES))
    bal = metrics["dataset"]["class_balance"]
    c3.metric("Disease / No disease", f"{bal['1']} / {bal['0']}")

    tab1, tab2, tab3, tab4 = st.tabs(
        ["Preview", "Distributions", "Target relationships", "Correlation"])

    with tab1:
        st.dataframe(data.head(50), width="stretch")
        st.markdown("**Summary statistics**")
        st.dataframe(data[NUMERIC_FEATURES].describe().T, width="stretch")

    with tab2:
        feat = st.selectbox("Feature", ALL_FEATURES, key="dist_feat")
        if feat in NUMERIC_FEATURES:
            fig = px.histogram(data, x=feat, color=data["target"].map({0: "No disease", 1: "Disease"}),
                               barmode="overlay", nbins=30, opacity=0.7)
        else:
            tmp = data.copy()
            tmp["Diagnosis"] = tmp["target"].map({0: "No disease", 1: "Disease"})
            fig = px.histogram(tmp, x=feat, color="Diagnosis", barmode="group")
        fig.update_layout(legend_title_text="", height=420)
        st.plotly_chart(fig, width="stretch")

    with tab3:
        st.markdown("Disease rate by category")
        cat = st.selectbox("Categorical feature", CATEGORICAL_FEATURES, key="rate_feat")
        rate = data.groupby(cat)["target"].mean().reset_index()
        rate.columns = [FEATURE_INFO[cat]["label"], "Disease rate"]
        fig = px.bar(rate, x=FEATURE_INFO[cat]["label"], y="Disease rate",
                     range_y=[0, 1], text_auto=".2f")
        fig.update_layout(height=420)
        st.plotly_chart(fig, width="stretch")

    with tab4:
        corr = data[ALL_FEATURES + ["target"]].corr(numeric_only=True)
        fig = px.imshow(corr, text_auto=".2f", color_continuous_scale="RdBu", zmin=-1, zmax=1,
                        aspect="auto")
        fig.update_layout(height=600)
        st.plotly_chart(fig, width="stretch")


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------
def main():
    if not os.path.exists(os.path.join(REPORTS_DIR, "metrics.json")):
        st.error("Models not trained yet. Run:  `py -3.12 src/train.py`")
        st.stop()

    metrics = get_metrics()
    data = get_data()
    models = get_models()

    st.sidebar.title("❤️ Heart Disease ML")
    page = st.sidebar.radio(
        "Navigate",
        ["🏠 Home", "🔮 Predict", "📊 Model Dashboard", "🔎 Data Explorer"])
    st.sidebar.divider()
    st.sidebar.caption(
        f"Best model: **{metrics['best_model']}**\n\n"
        f"{metrics['dataset']['n_records']} records · "
        f"{len(metrics['models'])} models")
    st.sidebar.caption("Educational use only — not a medical device.")

    if page == "🏠 Home":
        page_home(metrics)
    elif page == "🔮 Predict":
        page_predict(models, metrics)
    elif page == "📊 Model Dashboard":
        page_dashboard(metrics)
    else:
        page_explore(data, metrics)


if __name__ == "__main__":
    main()
