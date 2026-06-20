"""
Generate publication-quality figures for the project report and README.

Outputs PNGs into assets/:
    target_distribution.png   - class balance
    correlation_heatmap.png   - feature/target correlations
    metric_comparison.png     - grouped bar chart of all metrics
    roc_curves.png            - ROC curve per model
    confusion_matrices.png    - 2x2 confusion matrix per model

Run:  py -3.12 src/make_figures.py
"""
from __future__ import annotations

import os
import json

import numpy as np
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt

from preprocess import load_raw, ALL_FEATURES, REPORTS_DIR, ROOT

ASSETS = os.path.join(ROOT, "assets")
os.makedirs(ASSETS, exist_ok=True)
plt.rcParams.update({"figure.dpi": 130, "font.size": 10, "axes.grid": True,
                     "grid.alpha": 0.3, "axes.axisbelow": True})


def load_metrics():
    with open(os.path.join(REPORTS_DIR, "metrics.json"), encoding="utf-8") as fh:
        return json.load(fh)


def fig_target(df):
    counts = df["target"].value_counts().sort_index()
    fig, ax = plt.subplots(figsize=(5, 3.4))
    bars = ax.bar(["No disease (0)", "Disease (1)"], counts.values,
                  color=["#2ca02c", "#d62728"])
    ax.bar_label(bars)
    ax.set_ylabel("Number of patients")
    ax.set_title("Target class distribution")
    fig.tight_layout()
    fig.savefig(os.path.join(ASSETS, "target_distribution.png"))
    plt.close(fig)


def fig_corr(df):
    corr = df[ALL_FEATURES + ["target"]].corr(numeric_only=True)
    fig, ax = plt.subplots(figsize=(7.5, 6.2))
    im = ax.imshow(corr, cmap="RdBu", vmin=-1, vmax=1)
    ax.set_xticks(range(len(corr)))
    ax.set_yticks(range(len(corr)))
    ax.set_xticklabels(corr.columns, rotation=45, ha="right")
    ax.set_yticklabels(corr.columns)
    for i in range(len(corr)):
        for j in range(len(corr)):
            ax.text(j, i, f"{corr.iloc[i, j]:.2f}", ha="center", va="center",
                    color="black", fontsize=7)
    ax.set_title("Feature & target correlation")
    fig.colorbar(im, fraction=0.046, pad=0.04)
    ax.grid(False)
    fig.tight_layout()
    fig.savefig(os.path.join(ASSETS, "correlation_heatmap.png"))
    plt.close(fig)


def fig_metric_comparison(metrics):
    models = metrics["models"]
    metric_keys = ["accuracy", "precision", "recall", "f1", "roc_auc"]
    labels = ["Accuracy", "Precision", "Recall", "F1", "ROC-AUC"]
    names = list(models.keys())
    x = np.arange(len(metric_keys))
    width = 0.8 / len(names)
    fig, ax = plt.subplots(figsize=(8.5, 4.2))
    for i, name in enumerate(names):
        vals = [models[name][k] for k in metric_keys]
        ax.bar(x + i * width, vals, width, label=name)
    ax.set_xticks(x + width * (len(names) - 1) / 2)
    ax.set_xticklabels(labels)
    ax.set_ylim(0, 1.0)
    ax.set_ylabel("Score")
    ax.set_title("Model performance comparison")
    ax.legend(fontsize=8, ncol=2)
    fig.tight_layout()
    fig.savefig(os.path.join(ASSETS, "metric_comparison.png"))
    plt.close(fig)


def fig_roc(metrics):
    models = metrics["models"]
    fig, ax = plt.subplots(figsize=(5.6, 5))
    for name, m in models.items():
        ax.plot(m["roc_curve"]["fpr"], m["roc_curve"]["tpr"],
                label=f"{name} (AUC={m['roc_auc']:.3f})")
    ax.plot([0, 1], [0, 1], "--", color="gray", label="Chance")
    ax.set_xlabel("False Positive Rate")
    ax.set_ylabel("True Positive Rate")
    ax.set_title("ROC curves")
    ax.legend(fontsize=8, loc="lower right")
    fig.tight_layout()
    fig.savefig(os.path.join(ASSETS, "roc_curves.png"))
    plt.close(fig)


def fig_confusion(metrics):
    models = metrics["models"]
    n = len(models)
    fig, axes = plt.subplots(1, n, figsize=(3.2 * n, 3.2))
    labels = ["No disease", "Disease"]
    for ax, (name, m) in zip(axes, models.items()):
        cm = np.array(m["confusion_matrix"])
        im = ax.imshow(cm, cmap="Blues")
        ax.set_xticks([0, 1]); ax.set_yticks([0, 1])
        ax.set_xticklabels(labels, fontsize=8)
        ax.set_yticklabels(labels, fontsize=8)
        ax.set_xlabel("Predicted"); ax.set_ylabel("Actual")
        ax.set_title(name, fontsize=9)
        thresh = cm.max() / 2
        for i in range(2):
            for j in range(2):
                ax.text(j, i, cm[i, j], ha="center", va="center",
                        color="white" if cm[i, j] > thresh else "black")
        ax.grid(False)
    fig.suptitle("Confusion matrices (test set)")
    fig.tight_layout()
    fig.savefig(os.path.join(ASSETS, "confusion_matrices.png"))
    plt.close(fig)


def main():
    df = load_raw()
    metrics = load_metrics()
    fig_target(df)
    fig_corr(df)
    fig_metric_comparison(metrics)
    fig_roc(metrics)
    fig_confusion(metrics)
    print("Saved figures to assets/:",
          ", ".join(sorted(os.listdir(ASSETS))))


if __name__ == "__main__":
    main()
