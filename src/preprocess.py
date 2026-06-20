"""
Shared data loading, cleaning and preprocessing for the Heart Disease project.

This module is imported by both the training script (`src/train.py`) and the
Streamlit web app (`app.py`) so that the exact same feature definitions and
preprocessing pipeline are used everywhere.
"""
from __future__ import annotations

import os
import numpy as np
import pandas as pd
from sklearn.compose import ColumnTransformer
from sklearn.impute import SimpleImputer
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import StandardScaler, OneHotEncoder

# ---------------------------------------------------------------------------
# Paths
# ---------------------------------------------------------------------------
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA_PATH = os.path.join(ROOT, "data", "heart.csv")
MODELS_DIR = os.path.join(ROOT, "models")
REPORTS_DIR = os.path.join(ROOT, "reports")

# ---------------------------------------------------------------------------
# Feature metadata  (single source of truth for the whole project)
# ---------------------------------------------------------------------------
NUMERIC_FEATURES = ["age", "trestbps", "chol", "thalach", "oldpeak"]
CATEGORICAL_FEATURES = ["sex", "cp", "fbs", "restecg", "exang", "slope"]
ALL_FEATURES = NUMERIC_FEATURES + CATEGORICAL_FEATURES
TARGET = "target"

# Human-readable descriptions + value labels, used to drive the web form
FEATURE_INFO = {
    "age": {"label": "Age (years)", "type": "numeric",
            "min": 20, "max": 90, "default": 54,
            "help": "Patient age in years."},
    "trestbps": {"label": "Resting blood pressure (mm Hg)", "type": "numeric",
                 "min": 80, "max": 220, "default": 132,
                 "help": "Resting blood pressure on admission to hospital."},
    "chol": {"label": "Serum cholesterol (mg/dl)", "type": "numeric",
             "min": 100, "max": 600, "default": 200,
             "help": "Serum cholesterol. 0 in the raw data means 'not measured'."},
    "thalach": {"label": "Maximum heart rate achieved", "type": "numeric",
                "min": 60, "max": 210, "default": 137,
                "help": "Maximum heart rate achieved during exercise testing."},
    "oldpeak": {"label": "ST depression (oldpeak)", "type": "numeric",
                "min": -3.0, "max": 7.0, "default": 0.9, "step": 0.1,
                "help": "ST depression induced by exercise relative to rest."},
    "sex": {"label": "Sex", "type": "categorical",
            "options": {1.0: "Male", 0.0: "Female"}, "default": 1.0},
    "cp": {"label": "Chest pain type", "type": "categorical",
           "options": {1.0: "Typical angina", 2.0: "Atypical angina",
                       3.0: "Non-anginal pain", 4.0: "Asymptomatic"},
           "default": 4.0},
    "fbs": {"label": "Fasting blood sugar > 120 mg/dl", "type": "categorical",
            "options": {1.0: "True", 0.0: "False"}, "default": 0.0},
    "restecg": {"label": "Resting ECG results", "type": "categorical",
                "options": {0.0: "Normal", 1.0: "ST-T wave abnormality",
                            2.0: "Left ventricular hypertrophy"},
                "default": 0.0},
    "exang": {"label": "Exercise-induced angina", "type": "categorical",
              "options": {1.0: "Yes", 0.0: "No"}, "default": 0.0},
    "slope": {"label": "Slope of peak exercise ST segment", "type": "categorical",
              "options": {1.0: "Upsloping", 2.0: "Flat", 3.0: "Downsloping"},
              "default": 2.0},
}


def load_raw() -> pd.DataFrame:
    """Load the combined CSV and apply domain cleaning rules."""
    df = pd.read_csv(DATA_PATH)
    # Cholesterol / resting BP recorded as 0 means 'not measured' -> NaN
    df.loc[df["chol"] == 0, "chol"] = np.nan
    df.loc[df["trestbps"] == 0, "trestbps"] = np.nan
    return df


def get_X_y(df: pd.DataFrame | None = None):
    """Return feature matrix X and target vector y."""
    if df is None:
        df = load_raw()
    X = df[ALL_FEATURES].copy()
    y = df[TARGET].astype(int).copy()
    return X, y


def build_preprocessor() -> ColumnTransformer:
    """Impute + scale numeric features; impute + one-hot encode categoricals."""
    numeric = Pipeline(steps=[
        ("imputer", SimpleImputer(strategy="median")),
        ("scaler", StandardScaler()),
    ])
    categorical = Pipeline(steps=[
        ("imputer", SimpleImputer(strategy="most_frequent")),
        ("onehot", OneHotEncoder(handle_unknown="ignore")),
    ])
    return ColumnTransformer(transformers=[
        ("num", numeric, NUMERIC_FEATURES),
        ("cat", categorical, CATEGORICAL_FEATURES),
    ])
