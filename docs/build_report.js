// Build the Project Report (.docx) for the Heart Disease ML project.
// Run:  node docs/build_report.js
const fs = require("fs");
const path = require("path");
const {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  Header, Footer, AlignmentType, HeadingLevel, BorderStyle, WidthType,
  ShadingType, PageNumber, PageBreak, ImageRun, TableOfContents, LevelFormat,
} = require("docx");

const ROOT = path.resolve(__dirname, "..");
const ASSETS = path.join(ROOT, "assets");
const metrics = JSON.parse(fs.readFileSync(path.join(ROOT, "reports", "metrics.json"), "utf-8"));

const CONTENT_W = 9360; // US Letter, 1" margins
const BLUE = "2E5C8A";
const LIGHT = "D9E2F3";

// ---- helpers --------------------------------------------------------------
const fmt = (x, d = 3) => Number(x).toFixed(d);

function h1(text) {
  return new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun(text)] });
}
function h2(text) {
  return new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun(text)] });
}
function p(text, opts = {}) {
  return new Paragraph({
    spacing: { after: 140, line: 276 },
    alignment: opts.justify === false ? AlignmentType.LEFT : AlignmentType.JUSTIFIED,
    children: [new TextRun({ text, italics: !!opts.italics })],
  });
}
function bullet(text) {
  return new Paragraph({
    numbering: { reference: "bullets", level: 0 },
    spacing: { after: 60 }, children: [new TextRun(text)],
  });
}
function numItem(text) {
  return new Paragraph({
    numbering: { reference: "nums", level: 0 },
    spacing: { after: 60 }, children: [new TextRun(text)],
  });
}
function img(file, w) {
  const data = fs.readFileSync(path.join(ASSETS, file));
  const sizes = {
    "target_distribution.png": [650, 442],
    "correlation_heatmap.png": [975, 806],
    "metric_comparison.png": [1105, 546],
    "roc_curves.png": [728, 650],
    "confusion_matrices.png": [1664, 416],
  };
  const [ow, oh] = sizes[file];
  const width = w || 600;
  const height = Math.round((oh / ow) * width);
  return new Paragraph({
    alignment: AlignmentType.CENTER, spacing: { before: 80, after: 80 },
    children: [new ImageRun({
      type: "png", data,
      transformation: { width, height },
      altText: { title: file, description: file, name: file },
    })],
  });
}
function caption(text) {
  return new Paragraph({
    alignment: AlignmentType.CENTER, spacing: { after: 160 },
    children: [new TextRun({ text, italics: true, size: 18, color: "555555" })],
  });
}

const border = { style: BorderStyle.SINGLE, size: 1, color: "AAB4C4" };
const borders = { top: border, bottom: border, left: border, right: border,
  insideHorizontal: border, insideVertical: border };

function cell(text, { header = false, w, align = AlignmentType.LEFT, bold = false } = {}) {
  return new TableCell({
    width: { size: w, type: WidthType.DXA },
    shading: header ? { fill: BLUE, type: ShadingType.CLEAR } : undefined,
    margins: { top: 60, bottom: 60, left: 110, right: 110 },
    children: [new Paragraph({
      alignment: align,
      children: [new TextRun({ text, bold: header || bold, color: header ? "FFFFFF" : "000000", size: 19 })],
    })],
  });
}

function table(headerRow, dataRows, widths) {
  const rows = [new TableRow({ tableHeader: true, children:
    headerRow.map((t, i) => cell(t, { header: true, w: widths[i],
      align: i === 0 ? AlignmentType.LEFT : AlignmentType.CENTER })) })];
  dataRows.forEach((r, ri) => {
    rows.push(new TableRow({ children: r.map((t, i) => {
      const c = cell(String(t), { w: widths[i],
        align: i === 0 ? AlignmentType.LEFT : AlignmentType.CENTER, bold: i === 0 });
      return c;
    }) }));
  });
  return new Table({ width: { size: CONTENT_W, type: WidthType.DXA }, columnWidths: widths,
    borders, rows });
}

// striped table variant for the big results table
function resultsTable() {
  const widths = [2360, 1170, 1170, 1170, 1170, 1170, 1150];
  const head = ["Model", "Accuracy", "Precision", "Recall", "F1", "ROC-AUC", "Train (s)"];
  const order = ["Logistic Regression", "Random Forest", "Support Vector Machine", "Gradient Boosting"];
  const rows = [new TableRow({ tableHeader: true, children:
    head.map((t, i) => cell(t, { header: true, w: widths[i],
      align: i === 0 ? AlignmentType.LEFT : AlignmentType.CENTER })) })];
  order.forEach((name, idx) => {
    const m = metrics.models[name];
    const best = name === metrics.best_model;
    const vals = [best ? name + " *" : name, fmt(m.accuracy), fmt(m.precision),
      fmt(m.recall), fmt(m.f1), fmt(m.roc_auc), fmt(m.train_time, 2)];
    rows.push(new TableRow({ children: vals.map((t, i) => new TableCell({
      width: { size: widths[i], type: WidthType.DXA },
      shading: best ? { fill: LIGHT, type: ShadingType.CLEAR }
                    : (idx % 2 ? { fill: "F2F5FA", type: ShadingType.CLEAR } : undefined),
      margins: { top: 60, bottom: 60, left: 110, right: 110 },
      children: [new Paragraph({ alignment: i === 0 ? AlignmentType.LEFT : AlignmentType.CENTER,
        children: [new TextRun({ text: t, bold: i === 0, size: 19 })] })],
    })) }));
  });
  return new Table({ width: { size: CONTENT_W, type: WidthType.DXA }, columnWidths: widths, borders, rows });
}

// ---- title page -----------------------------------------------------------
const titlePage = [
  new Paragraph({ spacing: { before: 1800 } }),
  new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 120 },
    children: [new TextRun({ text: "Machine Learning Course Project", size: 28, color: BLUE, bold: true })] }),
  new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 80 },
    children: [new TextRun({ text: "Heart Disease Prediction", size: 56, bold: true })] }),
  new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 400 },
    children: [new TextRun({ text: "A Web-Based Machine Learning Application with Multi-Model Comparison",
      size: 26, italics: true, color: "444444" })] }),
  new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 60 },
    children: [new TextRun({ text: "Project Report", size: 24, bold: true })] }),
  new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 800, after: 40 },
    children: [new TextRun({ text: "Submitted by: ____________________________", size: 24 })] }),
  new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 40 },
    children: [new TextRun({ text: "Student ID: ____________________________", size: 24 })] }),
  new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 40 },
    children: [new TextRun({ text: "Course: Machine Learning", size: 24 })] }),
  new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 40 },
    children: [new TextRun({ text: "Instructor: ____________________________", size: 24 })] }),
  new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 400 },
    children: [new TextRun({ text: "June 2026", size: 24, color: "444444" })] }),
  new Paragraph({ children: [new PageBreak()] }),
];

// ---- abstract + TOC -------------------------------------------------------
const front = [
  h1("Abstract"),
  p("Cardiovascular disease is one of the leading causes of death worldwide, and " +
    "early identification of at-risk patients can significantly improve outcomes. This " +
    "project presents a fully self-contained, web-based machine learning application that " +
    "predicts the presence of heart disease from eleven routine clinical measurements. Four " +
    "supervised classification algorithms — Logistic Regression, Random Forest, Support Vector " +
    "Machine and Gradient Boosting — were trained and evaluated on the combined UCI Heart " +
    "Disease dataset (920 records). All models are trained and executed locally with no external " +
    "prediction APIs. The Random Forest model achieved the highest discriminative ability with a " +
    "ROC-AUC of " + fmt(metrics.models[metrics.best_model].roc_auc) + ", while the Support Vector " +
    "Machine achieved the highest test accuracy (" + fmt(metrics.models["Support Vector Machine"].accuracy) +
    "). The application, built with Streamlit, lets a user enter patient measurements to obtain a " +
    "risk prediction and provides an interactive dashboard comparing all models across accuracy, " +
    "precision, recall, F1-score, ROC-AUC, training time and confusion matrices."),
  new Paragraph({ spacing: { before: 120 }, children: [
    new TextRun({ text: "Keywords: ", bold: true }),
    new TextRun("heart disease, classification, scikit-learn, Streamlit, model comparison, ROC-AUC."),
  ] }),
  new Paragraph({ children: [new PageBreak()] }),
  new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun("Table of Contents")] }),
  new TableOfContents("Table of Contents", { hyperlink: true, headingStyleRange: "1-1" }),
  new Paragraph({ children: [new PageBreak()] }),
];

// ---- feature table data ---------------------------------------------------
const featureRows = [
  ["age", "Numeric", "Age of the patient in years"],
  ["sex", "Categorical", "Biological sex (1 = male, 0 = female)"],
  ["cp", "Categorical", "Chest pain type (1–4)"],
  ["trestbps", "Numeric", "Resting blood pressure (mm Hg)"],
  ["chol", "Numeric", "Serum cholesterol (mg/dl)"],
  ["fbs", "Categorical", "Fasting blood sugar > 120 mg/dl (1/0)"],
  ["restecg", "Categorical", "Resting electrocardiographic results (0–2)"],
  ["thalach", "Numeric", "Maximum heart rate achieved"],
  ["exang", "Categorical", "Exercise-induced angina (1/0)"],
  ["oldpeak", "Numeric", "ST depression induced by exercise"],
  ["slope", "Categorical", "Slope of the peak exercise ST segment (1–3)"],
  ["target", "Binary", "Diagnosis: 1 = disease present, 0 = absent"],
];

// ---- body -----------------------------------------------------------------
const body = [
  h1("1. Introduction and Problem Statement"),
  p("Cardiovascular diseases (CVDs) are the number-one cause of death globally, taking an " +
    "estimated 17.9 million lives each year according to the World Health Organization. Many of " +
    "these deaths are premature and preventable when risk factors are detected early. Clinicians " +
    "routinely record measurements such as blood pressure, cholesterol, resting ECG results and " +
    "exercise response; however, manually combining these indicators into an accurate risk " +
    "assessment is difficult and subjective."),
  p("The problem addressed in this project is: given a set of routine clinical measurements for a " +
    "patient, can we automatically and reliably predict whether that patient has heart disease? " +
    "This is a binary classification problem. The goal is not to replace medical judgement but to " +
    "provide a fast, data-driven decision-support tool and, in the context of this course, to " +
    "demonstrate the full machine-learning workflow inside a usable web application."),
  h2("1.1 Objectives"),
  numItem("Build a web-based application that lets a user enter patient data and receive a heart-disease risk prediction."),
  numItem("Train and evaluate at least two machine-learning algorithms on the same dataset."),
  numItem("Keep the system fully self-contained — all models trained and executed locally, with no external prediction APIs."),
  numItem("Provide a dashboard that compares the models across accuracy, precision, recall, F1-score, ROC-AUC, training time and confusion matrices."),
  numItem("Document the complete methodology and results in this report."),

  h1("2. Literature Review"),
  p("Heart-disease prediction using machine learning is a well-studied problem, and the UCI Heart " +
    "Disease dataset is one of the most widely used benchmarks in the field. Detrano et al. (1989) " +
    "originally applied a logistic-regression-based algorithm to the Cleveland data and reported " +
    "approximately 77% diagnostic accuracy, establishing the dataset as a reference benchmark."),
  p("Subsequent studies explored a broad range of classifiers. Logistic Regression and Naive Bayes " +
    "remain popular baselines because of their interpretability, while tree-based ensembles such as " +
    "Random Forest and Gradient Boosting frequently report the strongest performance, typically in " +
    "the 80–90% accuracy range depending on preprocessing and validation strategy. Support Vector " +
    "Machines with non-linear kernels are also commonly competitive on this dataset. Across the " +
    "literature, three themes recur: (i) careful handling of missing values materially affects " +
    "results, (ii) ROC-AUC is preferred over raw accuracy for medical screening because it captures " +
    "the trade-off between sensitivity and specificity, and (iii) recall (sensitivity) is " +
    "especially important because a false negative — missing a genuinely sick patient — is more " +
    "costly than a false positive."),
  p("This project builds on those lessons: it combines all four UCI databases to enlarge the sample, " +
    "treats physiologically impossible zero values as missing, imputes them inside a leakage-free " +
    "pipeline, and reports a full suite of metrics rather than accuracy alone — with particular " +
    "attention to recall and ROC-AUC."),

  h1("3. Dataset Description"),
  p("The data used is the UCI Heart Disease Data Set (Dua & Graff, UCI Machine Learning " +
    "Repository). It is distributed as four separate databases collected at different institutions: " +
    "Cleveland Clinic (303 records), Hungarian Institute of Cardiology (294), University Hospital " +
    "Zurich/Basel, Switzerland (123) and the V.A. Medical Center, Long Beach (200). These were " +
    "combined into a single table of " + metrics.dataset.n_records + " records, comfortably " +
    "exceeding the recommended minimum of 500."),
  p("Eleven clinical features are used to predict a binary target. The original dataset codes the " +
    "diagnosis on a 0–4 scale; following standard practice this is binarised so that any value " +
    "greater than zero indicates the presence of disease. The class distribution is reasonably " +
    "balanced: " + metrics.dataset.class_balance["1"] + " patients with disease and " +
    metrics.dataset.class_balance["0"] + " without."),
  table(["Feature", "Type", "Description"], featureRows, [1700, 1900, 5760]),
  caption("Table 1. Features in the combined Heart Disease dataset."),
  img("target_distribution.png", 430),
  caption("Figure 1. Target class distribution (disease vs. no disease)."),

  h1("4. Data Preprocessing"),
  p("Several preprocessing steps were required to turn the raw UCI files into a clean, model-ready " +
    "dataset. These steps are implemented in code (src/build_dataset.py and src/preprocess.py) so " +
    "that they are fully reproducible."),
  bullet("Merging: the four institutional databases share the same 14-attribute schema and were concatenated into one table."),
  bullet("Missing-value coding: the raw files use '?' for missing entries. In addition, cholesterol and resting-blood-pressure values recorded as 0 are physiologically impossible and represent 'not measured'; these were converted to missing values (172 cholesterol and 1 blood-pressure records)."),
  bullet("Dropping sparse attributes: the 'ca' (number of major vessels) and 'thal' attributes are missing for the majority of the combined records (≈66% and ≈53% respectively) and were removed to avoid excessive imputation."),
  bullet("Imputation: remaining missing values are filled inside the modelling pipeline — the median for numeric features and the most-frequent category for categorical features."),
  bullet("Scaling and encoding: numeric features are standardised (zero mean, unit variance); categorical features are one-hot encoded."),
  p("Crucially, all imputation, scaling and encoding are wrapped in a single scikit-learn " +
    "ColumnTransformer that is fitted only on the training data and applied to the test data. This " +
    "prevents data leakage and guarantees that the exact same transformations are applied when the " +
    "live web application makes a prediction."),

  h1("5. Feature Engineering"),
  p("The eleven retained attributes are themselves clinically meaningful, so feature engineering " +
    "focused on correct representation rather than on creating many derived variables. Features were " +
    "explicitly separated into numeric and categorical groups, each receiving an appropriate " +
    "transformation. One-hot encoding allows the linear and kernel models to treat categories such " +
    "as chest-pain type without imposing a false ordinal relationship, while standardisation ensures " +
    "that distance- and gradient-based models (SVM, Logistic Regression) are not dominated by " +
    "large-scale features such as cholesterol."),
  p("Correlation analysis (Figure 2) confirms that the engineered features carry signal: maximum " +
    "heart rate (thalach) is negatively correlated with the target, while exercise-induced angina " +
    "(exang), ST depression (oldpeak) and chest-pain type show clear positive associations with the " +
    "presence of disease — relationships that are consistent with cardiology domain knowledge."),
  img("correlation_heatmap.png", 470),
  caption("Figure 2. Correlation matrix of features and target."),

  h1("6. Algorithms Used"),
  p("Four supervised classification algorithms were selected to span a range of model families — " +
    "linear, kernel-based and tree-ensemble — so that the comparison is informative:"),
  bullet("Logistic Regression — a linear, highly interpretable baseline that models the log-odds of disease as a weighted sum of the features."),
  bullet("Random Forest — an ensemble of decision trees trained on bootstrapped samples; robust to outliers and able to capture non-linear feature interactions."),
  bullet("Support Vector Machine (RBF kernel) — finds a maximum-margin decision boundary in a transformed feature space; calibrated to produce probability estimates."),
  bullet("Gradient Boosting — an additive ensemble that builds trees sequentially, each correcting the errors of the previous ones; often a strong performer on tabular data."),
  p("Every algorithm is wrapped in an identical preprocessing pipeline, so all four are trained and " +
    "evaluated on exactly the same data and the comparison is fair."),

  h1("7. Model Training"),
  p("The dataset was split into a training set and a held-out test set using an 80/20 stratified " +
    "split (" + metrics.dataset.n_train + " training and " + metrics.dataset.n_test + " test " +
    "records), preserving the class balance in both partitions. A fixed random seed (42) makes the " +
    "split and all model training fully reproducible."),
  p("Each model was trained on the training set and additionally validated with 5-fold " +
    "cross-validation to assess stability. Cross-validated accuracy ranged from " +
    fmt(metrics.models["Gradient Boosting"].cv_accuracy_mean) + " to " +
    fmt(metrics.models["Support Vector Machine"].cv_accuracy_mean) + ", confirming that the test-set " +
    "results are representative and not the product of a single lucky split. Training time was also " +
    "recorded for each model as one of the comparison metrics."),

  h1("8. Evaluation Results"),
  p("Models were evaluated on the held-out test set using the full set of metrics required by the " +
    "project brief. Table 2 summarises the results; the best value in each column is associated with " +
    "the starred Random Forest model, which was selected as the default model on the basis of " +
    "ROC-AUC."),
  resultsTable(),
  caption("Table 2. Test-set performance of all four models (* = best model by ROC-AUC)."),
  p("Confusion matrices (Figure 3) show how each model distributes its errors between false " +
    "positives and false negatives. All models keep false negatives low, which is the desirable " +
    "behaviour for a screening tool — the Support Vector Machine in particular misses only " +
    metrics.models["Support Vector Machine"].confusion_matrix[1][0] + " of the " +
    (metrics.models["Support Vector Machine"].confusion_matrix[1][0] +
     metrics.models["Support Vector Machine"].confusion_matrix[1][1]) + " diseased patients in the " +
    "test set."),
  img("confusion_matrices.png", 620),
  caption("Figure 3. Confusion matrices for each model on the test set."),
  p("The ROC curves (Figure 4) plot the trade-off between sensitivity and the false-positive rate. " +
    "All four curves lie well above the diagonal chance line, and the Random Forest curve dominates " +
    "for most of its range, consistent with its leading ROC-AUC of " +
    fmt(metrics.models[metrics.best_model].roc_auc) + "."),
  img("roc_curves.png", 430),
  caption("Figure 4. ROC curves for all models."),

  h1("9. Comparison Analysis"),
  p("Figure 5 compares all models side by side across the five core metrics. Several observations " +
    "stand out. First, the models are close in overall quality — every model exceeds 0.79 accuracy " +
    "and 0.88 ROC-AUC — which indicates that the signal in the data is captured well by all four " +
    "approaches. Second, the choice of 'best' model depends on the metric one prioritises: the " +
    "Support Vector Machine wins on accuracy, recall and F1-score, whereas the Random Forest wins on " +
    "ROC-AUC. Third, training cost varies by more than an order of magnitude, from roughly " +
    fmt(metrics.models["Logistic Regression"].train_time, 2) + " s for Logistic Regression to " +
    fmt(metrics.models["Random Forest"].train_time, 2) + " s for the Random Forest."),
  img("metric_comparison.png", 620),
  caption("Figure 5. Grouped comparison of all models across the core metrics."),
  p("For a medical screening application, ROC-AUC and recall are the most relevant criteria because " +
    "the cost of missing a sick patient (a false negative) is high. The Random Forest was therefore " +
    "selected as the default model in the application for its best-in-class ROC-AUC and strong " +
    "recall, while the Support Vector Machine remains an excellent alternative that a user can " +
    "select for its higher raw accuracy and recall. The interactive dashboard lets users weigh these " +
    "trade-offs themselves."),

  h1("10. Web Application"),
  p("The deliverable is a Streamlit web application that exposes the trained models through a " +
    "browser interface. It is organised into four pages:"),
  bullet("Home — an overview of the project and a checklist of the requirements it satisfies."),
  bullet("Predict — a form where the user enters the eleven clinical measurements and selects a model; the app returns a disease/no-disease prediction together with a probability gauge."),
  bullet("Model Dashboard — the comparison dashboard, rendering Table 2 and Figures 3–5 interactively (performance table, grouped bar chart, ROC curves, confusion matrices and training time)."),
  bullet("Data Explorer — interactive inspection of the dataset, including distributions, disease rates per category and the correlation heatmap."),
  p("Because the trained pipelines are saved to disk and loaded at start-up, predictions are " +
    "instantaneous and require no network access — satisfying the 'no external APIs' requirement. " +
    "The same preprocessing pipeline used in training is applied to user input, guaranteeing " +
    "consistency between training and inference."),

  h1("11. Conclusion and Future Work"),
  p("This project delivered a complete, self-contained machine-learning web application for heart-" +
    "disease prediction. Four classifiers were trained and rigorously compared on the combined UCI " +
    "Heart Disease dataset, with the Random Forest achieving the best ROC-AUC (" +
    fmt(metrics.models[metrics.best_model].roc_auc) + ") and the Support Vector Machine the best " +
    "accuracy (" + fmt(metrics.models["Support Vector Machine"].accuracy) + "). All mandatory " +
    "requirements — a web interface, at least two algorithms on a common dataset, no external " +
    "prediction APIs, user-driven prediction, and a model-comparison dashboard — were met."),
  p("Several avenues could extend the work:"),
  bullet("Hyperparameter tuning (e.g. grid or randomised search) to squeeze additional performance from each model."),
  bullet("Adding explainability, such as SHAP values, so users can see which measurements drove a particular prediction."),
  bullet("Incorporating the dropped 'ca' and 'thal' attributes via more sophisticated imputation, or sourcing a richer dataset."),
  bullet("Calibrating decision thresholds to a clinically chosen sensitivity, and reporting confidence intervals."),
  bullet("Deploying the application to a cloud host so it can be accessed without a local installation."),
  p("Disclaimer: this application was built for educational purposes and is not a medical device. It " +
    "must not be used for actual diagnosis or treatment decisions.", { italics: true }),

  h1("References"),
  p("1. World Health Organization. Cardiovascular diseases (CVDs) — Fact sheet. https://www.who.int/news-room/fact-sheets/detail/cardiovascular-diseases-(cvds)", { justify: false }),
  p("2. Detrano, R., et al. (1989). International application of a new probability algorithm for the diagnosis of coronary artery disease. American Journal of Cardiology, 64(5), 304–310.", { justify: false }),
  p("3. Dua, D. & Graff, C. (2019). UCI Machine Learning Repository — Heart Disease Data Set. University of California, Irvine. https://archive.ics.uci.edu/dataset/45/heart+disease", { justify: false }),
  p("4. Pedregosa, F., et al. (2011). Scikit-learn: Machine Learning in Python. Journal of Machine Learning Research, 12, 2825–2830.", { justify: false }),
  p("5. Streamlit Inc. Streamlit Documentation. https://docs.streamlit.io", { justify: false }),
];

// ---- document -------------------------------------------------------------
const doc = new Document({
  creator: "Heart Disease ML Project",
  title: "Heart Disease Prediction — Project Report",
  styles: {
    default: { document: { run: { font: "Calibri", size: 22 } } },
    paragraphStyles: [
      { id: "Heading1", name: "Heading 1", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { size: 30, bold: true, color: BLUE, font: "Calibri" },
        paragraph: { spacing: { before: 280, after: 140 }, outlineLevel: 0 } },
      { id: "Heading2", name: "Heading 2", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { size: 25, bold: true, color: "1F3A5F", font: "Calibri" },
        paragraph: { spacing: { before: 180, after: 100 }, outlineLevel: 1 } },
    ],
  },
  numbering: { config: [
    { reference: "bullets", levels: [{ level: 0, format: LevelFormat.BULLET, text: "•",
      alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 540, hanging: 270 } } } }] },
    { reference: "nums", levels: [{ level: 0, format: LevelFormat.DECIMAL, text: "%1.",
      alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 540, hanging: 270 } } } }] },
  ] },
  sections: [{
    properties: { page: { size: { width: 12240, height: 15840 },
      margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 } } },
    headers: { default: new Header({ children: [new Paragraph({
      alignment: AlignmentType.RIGHT, border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: "BBBBBB", space: 4 } },
      children: [new TextRun({ text: "Heart Disease Prediction — Project Report", size: 16, color: "777777" })] })] }) },
    footers: { default: new Footer({ children: [new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [new TextRun({ text: "Page ", size: 16, color: "777777" }),
        new TextRun({ children: [PageNumber.CURRENT], size: 16, color: "777777" }),
        new TextRun({ text: " of ", size: 16, color: "777777" }),
        new TextRun({ children: [PageNumber.TOTAL_PAGES], size: 16, color: "777777" })] })] }) },
    children: [...titlePage, ...front, ...body],
  }],
});

Packer.toBuffer(doc).then((buf) => {
  const out = path.join(ROOT, "docs", "Project_Report.docx");
  fs.writeFileSync(out, buf);
  console.log("Wrote", out, "(" + (buf.length / 1024).toFixed(0) + " KB)");
});
