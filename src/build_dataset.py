"""
Build a clean, combined Heart Disease dataset from the four original
UCI Heart Disease databases (Cleveland, Hungarian, Switzerland, VA Long Beach).

Source: UCI Machine Learning Repository - Heart Disease Data Set
        https://archive.ics.uci.edu/dataset/45/heart+disease

The four `processed.*.data` files share the same 14-attribute schema. We
combine them into a single 920-record table, give the columns readable names,
binarise the diagnosis target, and drop two attributes (`ca`, `thal`) that are
missing for the majority of the combined records. Remaining missing values are
left as blanks and imputed later inside the modelling pipeline.

Run:  py -3.12 src/build_dataset.py
"""
import os
import csv

RAW_FILES = [
    "data/_processed.cleveland.data",
    "data/_processed.hungarian.data",
    "data/_processed.switzerland.data",
    "data/_processed.va.data",
]

# Original 14-column order of the UCI processed files
RAW_COLS = ["age", "sex", "cp", "trestbps", "chol", "fbs", "restecg",
            "thalach", "exang", "oldpeak", "slope", "ca", "thal", "num"]

# Columns we keep (ca and thal dropped: >50% missing in the combined set)
KEEP = ["age", "sex", "cp", "trestbps", "chol", "fbs", "restecg",
        "thalach", "exang", "oldpeak", "slope"]


def main():
    here = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    os.chdir(here)

    rows = []
    for path in RAW_FILES:
        with open(path, encoding="utf-8") as fh:
            for line in fh:
                line = line.strip()
                if not line:
                    continue
                parts = line.replace(",", " ").split()
                if len(parts) != 14:
                    continue
                rows.append(dict(zip(RAW_COLS, parts)))

    out_path = "data/heart.csv"
    with open(out_path, "w", newline="", encoding="utf-8") as fh:
        writer = csv.writer(fh)
        writer.writerow(KEEP + ["target"])
        for r in rows:
            # '?' -> blank (treated as missing downstream)
            values = ["" if r[c] == "?" else r[c] for c in KEEP]
            # Binarise: 0 = no disease, 1-4 = presence of disease -> 1
            target = "0" if r["num"] in ("0", "0.0") else "1"
            writer.writerow(values + [target])

    print(f"Wrote {out_path} with {len(rows)} records and {len(KEEP)} features + target.")


if __name__ == "__main__":
    main()
