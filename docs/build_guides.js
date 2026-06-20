// Build two .docx guides:
//   1) Technical_Documentation.docx  — how the web app works / what was built
//   2) Viva_Preparation_Guide.docx   — Q&A + demo script for the viva
// Run:  node docs/build_guides.js
const fs = require("fs");
const path = require("path");
const {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  Header, Footer, AlignmentType, HeadingLevel, BorderStyle, WidthType,
  ShadingType, PageNumber, PageBreak, TableOfContents, LevelFormat,
} = require("docx");

const ROOT = path.resolve(__dirname, "..");
const M = JSON.parse(fs.readFileSync(path.join(ROOT, "reports", "metrics.json"), "utf-8"));
const CONTENT_W = 9360;
const TEAL = "1FA39B", NAVY = "0E1B2C", INK = "1F3A5F";
const fmt = (x, d = 3) => Number(x).toFixed(d);

// ---- shared helpers -------------------------------------------------------
const h1 = (t) => new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun(t)] });
const h2 = (t) => new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun(t)] });
const p = (t, opts = {}) => new Paragraph({
  spacing: { after: 130, line: 274 },
  alignment: opts.justify === false ? AlignmentType.LEFT : AlignmentType.JUSTIFIED,
  children: Array.isArray(t) ? t : [new TextRun({ text: t, italics: !!opts.italics })],
});
const bullet = (t) => new Paragraph({ numbering: { reference: "b", level: 0 }, spacing: { after: 56 },
  children: Array.isArray(t) ? t : [new TextRun(t)] });
const numItem = (t) => new Paragraph({ numbering: { reference: "n", level: 0 }, spacing: { after: 56 },
  children: Array.isArray(t) ? t : [new TextRun(t)] });
const run = (t, o = {}) => new TextRun({ text: t, bold: o.b, italics: o.i, color: o.c, font: o.mono ? "Consolas" : undefined });

const border = { style: BorderStyle.SINGLE, size: 1, color: "AAB4C4" };
const borders = { top: border, bottom: border, left: border, right: border, insideHorizontal: border, insideVertical: border };
function cell(text, { header = false, w, align = AlignmentType.LEFT, mono = false } = {}) {
  return new TableCell({
    width: { size: w, type: WidthType.DXA },
    shading: header ? { fill: NAVY, type: ShadingType.CLEAR } : undefined,
    margins: { top: 60, bottom: 60, left: 110, right: 110 },
    children: [new Paragraph({ alignment: align, children: [
      new TextRun({ text, bold: header, color: header ? "FFFFFF" : "000000", size: 19, font: mono ? "Consolas" : undefined })] })],
  });
}
function table(head, rows, widths, opts = {}) {
  const trs = [new TableRow({ tableHeader: true, children:
    head.map((t, i) => cell(t, { header: true, w: widths[i], align: i === 0 ? AlignmentType.LEFT : AlignmentType.CENTER })) })];
  rows.forEach((r) => trs.push(new TableRow({ children:
    r.map((t, i) => cell(String(t), { w: widths[i], align: i === 0 ? AlignmentType.LEFT : AlignmentType.CENTER,
      mono: opts.mono && i === 0 })) })));
  return new Table({ width: { size: CONTENT_W, type: WidthType.DXA }, columnWidths: widths, borders, rows: trs });
}
function callout(title, body) {
  return new Table({ width: { size: CONTENT_W, type: WidthType.DXA }, columnWidths: [CONTENT_W],
    borders: { top: { style: BorderStyle.SINGLE, size: 1, color: "BBD9D5" }, bottom: { style: BorderStyle.SINGLE, size: 1, color: "BBD9D5" },
      left: { style: BorderStyle.SINGLE, size: 18, color: TEAL }, right: { style: BorderStyle.SINGLE, size: 1, color: "BBD9D5" } },
    rows: [new TableRow({ children: [new TableCell({
      width: { size: CONTENT_W, type: WidthType.DXA }, shading: { fill: "F0F8F7", type: ShadingType.CLEAR },
      margins: { top: 100, bottom: 100, left: 160, right: 160 },
      children: [new Paragraph({ spacing: { after: 40 }, children: [new TextRun({ text: title, bold: true, color: INK })] }),
        new Paragraph({ children: [new TextRun({ text: body })] })] })] })] });
}
// Q&A block
function qa(q, ansLines) {
  const out = [new Paragraph({ spacing: { before: 140, after: 60 },
    children: [new TextRun({ text: "Q. ", bold: true, color: TEAL }), new TextRun({ text: q, bold: true, color: NAVY })] })];
  ansLines.forEach((a) => {
    if (typeof a === "string") out.push(new Paragraph({ spacing: { after: 70, line: 270 }, alignment: AlignmentType.JUSTIFIED,
      children: [new TextRun({ text: "A. ", bold: true, color: "8794A5" }), new TextRun(a)] }));
    else out.push(new Paragraph({ numbering: { reference: "b", level: 0 }, spacing: { after: 46 }, children: [new TextRun(a.li)] }));
  });
  return out;
}

function baseDoc(titleText, sections) {
  return new Document({
    creator: "Heart Disease ML Project",
    title: titleText,
    styles: {
      default: { document: { run: { font: "Calibri", size: 22 } } },
      paragraphStyles: [
        { id: "Heading1", name: "Heading 1", basedOn: "Normal", next: "Normal", quickFormat: true,
          run: { size: 29, bold: true, color: NAVY, font: "Calibri" },
          paragraph: { spacing: { before: 280, after: 130 }, outlineLevel: 0 } },
        { id: "Heading2", name: "Heading 2", basedOn: "Normal", next: "Normal", quickFormat: true,
          run: { size: 24, bold: true, color: INK, font: "Calibri" },
          paragraph: { spacing: { before: 170, after: 90 }, outlineLevel: 1 } },
      ],
    },
    numbering: { config: [
      { reference: "b", levels: [{ level: 0, format: LevelFormat.BULLET, text: "•", alignment: AlignmentType.LEFT,
        style: { paragraph: { indent: { left: 540, hanging: 270 } } } }] },
      { reference: "n", levels: [{ level: 0, format: LevelFormat.DECIMAL, text: "%1.", alignment: AlignmentType.LEFT,
        style: { paragraph: { indent: { left: 540, hanging: 270 } } } }] },
    ] },
    sections: [{
      properties: { page: { size: { width: 12240, height: 15840 }, margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 } } },
      headers: { default: new Header({ children: [new Paragraph({ alignment: AlignmentType.RIGHT,
        border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: "BBBBBB", space: 4 } },
        children: [new TextRun({ text: titleText, size: 16, color: "777777" })] })] }) },
      footers: { default: new Footer({ children: [new Paragraph({ alignment: AlignmentType.CENTER,
        children: [new TextRun({ text: "Page ", size: 16, color: "777777" }),
          new TextRun({ children: [PageNumber.CURRENT], size: 16, color: "777777" }),
          new TextRun({ text: " of ", size: 16, color: "777777" }),
          new TextRun({ children: [PageNumber.TOTAL_PAGES], size: 16, color: "777777" })] })] }) },
      children: sections,
    }],
  });
}

function titlePage(kicker, title, subtitle) {
  return [
    new Paragraph({ spacing: { before: 2000 } }),
    new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 100 },
      children: [new TextRun({ text: kicker, size: 26, color: TEAL, bold: true })] }),
    new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 80 },
      children: [new TextRun({ text: title, size: 52, bold: true, color: NAVY })] }),
    new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 600 },
      children: [new TextRun({ text: subtitle, size: 26, italics: true, color: "555555" })] }),
    new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "HeartScreen — Heart Disease Prediction Web Application", size: 22, color: "444444" })] }),
    new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 40 }, children: [new TextRun({ text: "Machine Learning Course Project · June 2026", size: 22, color: "444444" })] }),
    new Paragraph({ children: [new PageBreak()] }),
  ];
}

// =========================================================================
// DOCUMENT 1 — TECHNICAL DOCUMENTATION
// =========================================================================
const tech = [
  ...titlePage("Technical Documentation", "How the App Works", "Architecture, components and data flow — explained"),
  h1("Table of Contents"),
  new TableOfContents("Table of Contents", { hyperlink: true, headingStyleRange: "1-1" }),
  new Paragraph({ children: [new PageBreak()] }),

  h1("1. What this project is"),
  p("HeartScreen is a web-based machine-learning application that predicts whether a patient has heart " +
    "disease from eleven routine clinical measurements. It trains four different models on the same dataset, " +
    "compares them, and serves the predictions through a modern, animated web interface. Everything runs " +
    "locally on the machine — there are no external prediction APIs, no cloud calls, and no internet " +
    "dependency at run time."),
  p("The project is split into two clear layers: a machine-learning layer (Python scripts that clean the " +
    "data, train the models and save them to disk) and a web layer (a Flask server that loads those saved " +
    "models and exposes them through web pages and a small JSON API)."),

  h1("2. Technology stack"),
  table(["Layer", "Technology", "Why"],
    [["Language", "Python 3.12", "Mature data-science ecosystem"],
     ["ML library", "scikit-learn", "Models, pipelines, metrics"],
     ["Data handling", "pandas, NumPy", "Loading and transforming the dataset"],
     ["Model storage", "joblib", "Saving / loading trained pipelines"],
     ["Web server", "Flask", "Serves pages and the JSON API"],
     ["Templating", "Jinja2", "HTML templates rendered by Flask"],
     ["Frontend", "HTML, CSS, vanilla JS", "Custom UI, animations, no framework"],
     ["Charts", "Chart.js (vendored locally)", "Interactive dashboard charts"],
     ["Backup UI", "Streamlit", "Original simpler interface, kept as fallback"]],
    [1900, 3200, 4260]),

  h1("3. Architecture and data flow"),
  p("There are two separate moments in the life of the project: training time (done once, ahead of the demo) " +
    "and request time (every time a user asks for a prediction)."),
  h2("3.1 Training time (offline)"),
  numItem("build_dataset.py merges the four UCI databases into data/heart.csv (920 records)."),
  numItem("train.py loads that CSV, builds a preprocessing + model pipeline for each of the four algorithms, trains them on 80% of the data, and evaluates them on the remaining 20%."),
  numItem("Each trained pipeline is saved to models/*.joblib, and all the metrics are written to reports/metrics.json."),
  numItem("make_figures.py renders the charts used in the written report."),
  h2("3.2 Request time (live)"),
  numItem("The Flask server (web/server.py) starts and loads the four .joblib pipelines and metrics.json once into memory."),
  numItem("The user opens a page in the browser. Flask renders an HTML template and sends it back."),
  numItem("On the Predict page the user fills the form and presses Predict. JavaScript collects the values and sends them as JSON to the /api/predict endpoint."),
  numItem("Flask feeds those values into the chosen model pipeline, which preprocesses them exactly as during training and returns a probability."),
  numItem("Flask sends the probability back as JSON; JavaScript animates the result card and the risk gauge."),
  callout("Key idea: one pipeline, used twice",
    "Because preprocessing (imputation, scaling, encoding) is bundled inside the same scikit-learn Pipeline " +
    "that contains the model, the identical transformations are applied during training and during live " +
    "prediction. This prevents the classic 'works in training, breaks in production' bug."),

  h1("4. Project structure (file by file)"),
  table(["Path", "What it does"],
    [["data/heart.csv", "The cleaned, combined dataset (920 rows)"],
     ["src/build_dataset.py", "Merges the 4 raw UCI files into heart.csv"],
     ["src/preprocess.py", "Feature definitions + the shared preprocessing pipeline"],
     ["src/train.py", "Trains the 4 models, evaluates, saves models + metrics"],
     ["src/make_figures.py", "Generates report figures into assets/"],
     ["models/*.joblib", "The 4 trained model pipelines (loaded by the web app)"],
     ["reports/metrics.json", "All metrics, consumed by the dashboard"],
     ["web/server.py", "The Flask application (routes + JSON API)"],
     ["web/templates/*.html", "Page templates (base, index, predict, dashboard, explore)"],
     ["web/static/css/styles.css", "The full design system and animations"],
     ["web/static/js/*.js", "Frontend logic (reveal, predict, dashboard, explore)"],
     ["app.py", "The backup Streamlit version of the app"],
     ["docs/", "Report, proposal, and these guides"]],
    [3100, 6260], { mono: true }),

  h1("5. The machine-learning layer"),
  p("Four algorithms are trained on exactly the same 80/20 stratified split so the comparison is fair: " +
    "Logistic Regression, Random Forest, Support Vector Machine and Gradient Boosting. Each is wrapped in a " +
    "pipeline that first imputes missing values (median for numbers, most-frequent for categories), then " +
    "scales numbers and one-hot encodes categories, then applies the classifier."),
  p("The best model is chosen automatically by ROC-AUC and flagged in metrics.json. With the current data the " +
    "best model is " + M.best_model + " (ROC-AUC " + fmt(M.models[M.best_model].roc_auc) + "), while the " +
    "Support Vector Machine reaches the highest accuracy (" + fmt(M.models["Support Vector Machine"].accuracy) + ")."),

  h1("6. The web application, page by page"),
  h2("6.1 Home"),
  p("A landing page that explains the project, shows animated headline statistics (records, features, models, " +
    "best ROC-AUC) and walks through the four-step workflow. Numbers count up when they scroll into view."),
  h2("6.2 Predict"),
  p("The core interactive page. A form renders the eleven clinical inputs (auto-generated from the feature " +
    "definitions in preprocess.py) plus a model selector. On submit, JavaScript posts the values to " +
    "/api/predict and animates a circular risk gauge — green for low risk, red for elevated risk — together " +
    "with the model's recall and ROC-AUC. A 'Load sample patient' button fills a realistic high-risk example " +
    "for a quick demo."),
  h2("6.3 Dashboard"),
  p("Fetches /api/metrics and renders the full comparison: a performance table (best value in each column " +
    "highlighted, best model starred), a grouped bar chart of all metrics, overlaid ROC curves, a training-" +
    "time chart, and a confusion matrix for every model. Charts animate as they scroll into view."),
  h2("6.4 Explore"),
  p("Fetches /api/explore and lets the user inspect the data: class balance, each feature's correlation with " +
    "the diagnosis, per-feature distributions split by outcome, and disease rate by category — all interactive."),

  h1("7. The JSON API"),
  p("The Flask server exposes a small local API. These endpoints are what make the front-end dynamic; they " +
    "are served from the same process and never call the internet."),
  table(["Route", "Method", "Purpose", "Returns"],
    [["/", "GET", "Home page", "HTML"],
     ["/predict", "GET", "Prediction form page", "HTML"],
     ["/dashboard", "GET", "Dashboard page", "HTML"],
     ["/explore", "GET", "Data explorer page", "HTML"],
     ["/api/predict", "POST", "Run a prediction", "JSON (probability, verdict)"],
     ["/api/metrics", "GET", "All model metrics", "JSON"],
     ["/api/explore", "GET", "Aggregated dataset views", "JSON"]],
    [1900, 1100, 3160, 3200], { mono: true }),

  h1("8. Design system and animations"),
  p("The interface uses a clean, clinical look inspired by modern medical products: an off-white background, " +
    "deep-navy text, a single teal accent and a red danger colour, bold headings and generous whitespace. No " +
    "emojis are used. The complete design lives in one CSS file using CSS custom properties (variables) for " +
    "colours, spacing and motion."),
  p("Animations implemented:"),
  bullet([run("Page transitions", { b: true }), run(" — content fades and lifts in on every page load, and fades out on navigation.")]),
  bullet([run("Scroll reveals", { b: true }), run(" — sections fade up as they enter the viewport (IntersectionObserver), with a failsafe so content always appears.")]),
  bullet([run("Button press", { b: true }), run(" — buttons lift on hover and visibly depress on click, with a moving arrow on the call-to-action.")]),
  bullet([run("Counters", { b: true }), run(" — headline numbers count up from zero.")]),
  bullet([run("Animated risk gauge", { b: true }), run(" — the SVG ring fills smoothly to the predicted percentage and the number tween-counts up.")]),
  bullet([run("Chart entrance", { b: true }), run(" — dashboard and explorer charts animate in when scrolled into view.")]),
  p("Accessibility: a 'prefers-reduced-motion' media query disables animation for users who request it, and " +
    "all content is readable without JavaScript."),

  h1("9. Running the project"),
  p("The project was built with Python 3.12. From the project folder:", { justify: false }),
  p([run("Modern Flask app:  ", { b: true }), run("py -3.12 web/server.py", { mono: true }), run("  then open http://localhost:5000")], { justify: false }),
  p([run("Backup Streamlit app:  ", { b: true }), run("py -3.12 -m streamlit run app.py", { mono: true })], { justify: false }),
  p([run("Retrain the models:  ", { b: true }), run("py -3.12 src/train.py", { mono: true })], { justify: false }),
  callout("Self-contained by design",
    "Chart.js is vendored into web/static/vendor (not loaded from a CDN), the fonts fall back to the system " +
    "font, and the models run in-process. The whole app therefore works with no internet connection — ideal " +
    "for a live demo."),

  h1("10. Results at a glance"),
  table(["Model", "Accuracy", "Recall", "F1", "ROC-AUC"],
    [["Logistic Regression", fmt(M.models["Logistic Regression"].accuracy), fmt(M.models["Logistic Regression"].recall), fmt(M.models["Logistic Regression"].f1), fmt(M.models["Logistic Regression"].roc_auc)],
     ["Random Forest (best)", fmt(M.models["Random Forest"].accuracy), fmt(M.models["Random Forest"].recall), fmt(M.models["Random Forest"].f1), fmt(M.models["Random Forest"].roc_auc)],
     ["Support Vector Machine", fmt(M.models["Support Vector Machine"].accuracy), fmt(M.models["Support Vector Machine"].recall), fmt(M.models["Support Vector Machine"].f1), fmt(M.models["Support Vector Machine"].roc_auc)],
     ["Gradient Boosting", fmt(M.models["Gradient Boosting"].accuracy), fmt(M.models["Gradient Boosting"].recall), fmt(M.models["Gradient Boosting"].f1), fmt(M.models["Gradient Boosting"].roc_auc)]],
    [2900, 1615, 1615, 1615, 1615]),
  p("Disclaimer: HeartScreen is an educational project and is not a medical device. It must not be used for " +
    "real diagnosis.", { italics: true }),
];

// =========================================================================
// DOCUMENT 2 — VIVA PREPARATION GUIDE
// =========================================================================
const rf = M.models["Random Forest"], svm = M.models["Support Vector Machine"];
const viva = [
  ...titlePage("Viva Preparation Guide", "Ace Your Viva", "Talking points, a demo script and 30+ questions with answers"),
  h1("Table of Contents"),
  new TableOfContents("Table of Contents", { hyperlink: true, headingStyleRange: "1-1" }),
  new Paragraph({ children: [new PageBreak()] }),

  h1("1. How to use this guide"),
  p("This guide prepares you to present and defend the project confidently. Start with the 60-second pitch and " +
    "the key numbers (memorise these), rehearse the live-demo script once or twice, then read the questions and " +
    "answers. The examiner mainly wants to see that you understand what you built and why — not that you " +
    "memorised definitions. Answer in your own words."),

  h1("2. Your 60-second pitch"),
  callout("Memorise this",
    "“I built HeartScreen, a web application that predicts heart-disease risk from eleven routine clinical " +
    "measurements. I combined four UCI heart-disease databases into one cleaned dataset of 920 patients, then " +
    "trained and compared four models — Logistic Regression, Random Forest, SVM and Gradient Boosting — all on " +
    "the same data. The best model, Random Forest, reaches a ROC-AUC of " + fmt(rf.roc_auc) + ". Everything runs " +
    "locally with no external APIs: a Flask backend loads the trained models and serves predictions to a custom " +
    "animated front-end, which also has a dashboard comparing every model on accuracy, precision, recall, F1, " +
    "ROC-AUC, training time and confusion matrices.”"),

  h1("3. Key numbers to memorise"),
  table(["Item", "Value"],
    [["Dataset size", M.dataset.n_records + " records, " + M.dataset.n_features + " features"],
     ["Train / test split", M.dataset.n_train + " / " + M.dataset.n_test + " (80/20, stratified)"],
     ["Class balance", M.dataset.class_balance["1"] + " disease / " + M.dataset.class_balance["0"] + " no disease"],
     ["Models compared", "4 (LogReg, Random Forest, SVM, Gradient Boosting)"],
     ["Best model (ROC-AUC)", M.best_model + " — " + fmt(rf.roc_auc)],
     ["Best accuracy", "SVM — " + fmt(svm.accuracy)],
     ["Best recall (sensitivity)", "SVM — " + fmt(svm.recall)],
     ["Why these metrics", "Recall & ROC-AUC matter most for medical screening"]],
    [3200, 6160]),

  h1("4. Live demo script"),
  p("Keep the demo to about two minutes and narrate as you click:"),
  numItem("Start the app (py -3.12 web/server.py) and open http://localhost:5000. Say: ‘This is fully local — no internet needed.’"),
  numItem("On the Home page, point to the animated stats: 920 records, 4 models, best ROC-AUC " + fmt(rf.roc_auc) + "."),
  numItem("Go to Predict, click ‘Load sample patient’, choose a model, press Predict. Point at the risk gauge and verdict."),
  numItem("Change the model in the dropdown and predict again — show that different models can disagree."),
  numItem("Open the Dashboard: walk through the metrics table, the ROC curves and the confusion matrices."),
  numItem("Open Explore: change a feature in the distribution chart to show how it relates to the diagnosis."),
  numItem("Close by repeating the one-line disclaimer: ‘It’s an educational tool, not a medical device.’"),

  h1("5. Questions & answers — Project and dataset"),
  ...qa("What problem does your project solve?",
    ["It predicts whether a patient is likely to have heart disease from routine clinical measurements, as a " +
     "fast, data-driven decision-support tool. Early detection of cardiovascular risk saves lives, and combining " +
     "many indicators by hand is hard and subjective."]),
  ...qa("Where did your data come from and how big is it?",
    ["The UCI Heart Disease dataset — four databases (Cleveland, Hungarian, Switzerland, VA Long Beach) which I " +
     "combined into " + M.dataset.n_records + " records with " + M.dataset.n_features + " features. That is above " +
     "the recommended 500-record minimum."]),
  ...qa("Is the dataset balanced?",
    ["Reasonably — " + M.dataset.class_balance["1"] + " patients with disease and " + M.dataset.class_balance["0"] +
     " without, roughly 55/45. Because it is close to balanced, accuracy is meaningful, but I still report recall " +
     "and ROC-AUC because in a medical setting missing a sick patient is the costly error."]),
  ...qa("What does the target variable represent?",
    ["The original data grades disease from 0 to 4. I binarised it: 0 means no disease, and any value 1–4 means " +
     "disease is present. So it is a binary classification problem."]),

  h1("6. Questions & answers — Preprocessing"),
  ...qa("How did you handle missing values?",
    ["Two ways. The raw files use '?' for missing entries. I also found that cholesterol and resting blood " +
     "pressure were sometimes recorded as 0, which is physiologically impossible and really means ‘not measured’ — " +
     "172 cholesterol values — so I treated those as missing too. All missing values are then imputed inside the " +
     "pipeline: the median for numeric features and the most-frequent value for categorical ones."]),
  ...qa("Why did you drop the 'ca' and 'thal' columns?",
    ["In the combined dataset they are missing for the majority of records (about 66% and 53%). Imputing that much " +
     "data would inject more guesswork than signal, so I dropped them and kept the eleven well-populated features."]),
  ...qa("What is the difference between scaling and encoding, and why both?",
    ["Scaling (standardisation) puts numeric features on the same scale — zero mean, unit variance — so that " +
     "distance- and gradient-based models like SVM and Logistic Regression are not dominated by large-valued " +
     "features such as cholesterol. Encoding (one-hot) turns categories like chest-pain type into separate 0/1 " +
     "columns so the model does not assume a false numeric order between categories."]),
  ...qa("What is a scikit-learn Pipeline and why use one?",
    ["A Pipeline chains preprocessing and the model into a single object. It guarantees the same transformations " +
     "at training and prediction time, and — crucially — it is fitted only on the training data, which prevents " +
     "data leakage from the test set."]),

  h1("7. Questions & answers — Models"),
  ...qa("Why did you use four models instead of one?",
    ["The brief asked for at least two, and comparing several lets me show which family of model suits this data. " +
     "I chose models from different families: linear (Logistic Regression), kernel-based (SVM) and tree ensembles " +
     "(Random Forest, Gradient Boosting)."]),
  ...qa("Explain Logistic Regression in one sentence.",
    ["It models the probability of disease as a weighted sum of the features passed through a sigmoid function, so " +
     "it is linear, fast and easy to interpret."]),
  ...qa("How does a Random Forest work?",
    ["It trains many decision trees, each on a random bootstrap sample of the data and a random subset of " +
     "features, then averages their votes. This reduces overfitting and captures non-linear interactions."]),
  ...qa("How does an SVM work?",
    ["It finds the decision boundary that maximises the margin between the two classes. With an RBF kernel it can " +
     "separate classes that are not linearly separable. I wrapped it so it also outputs calibrated probabilities."]),
  ...qa("What is the difference between Random Forest and Gradient Boosting?",
    ["Both are tree ensembles, but Random Forest builds trees independently and in parallel and averages them " +
     "(bagging), whereas Gradient Boosting builds trees sequentially, each one correcting the previous trees’ " +
     "errors (boosting)."]),

  h1("8. Questions & answers — Evaluation metrics"),
  ...qa("Define accuracy, precision, recall and F1.",
    [{ li: "Accuracy: fraction of all predictions that are correct." },
     { li: "Precision: of the patients predicted to have disease, how many actually do." },
     { li: "Recall (sensitivity): of the patients who actually have disease, how many we caught." },
     { li: "F1: the harmonic mean of precision and recall — a single balanced score." }]),
  ...qa("What is a confusion matrix?",
    ["A 2x2 table of true negatives, false positives, false negatives and true positives. It shows not just how " +
     "many errors a model makes but what kind. For screening I focus on keeping false negatives (missed sick " +
     "patients) low."]),
  ...qa("What is ROC-AUC and why do you prefer it here?",
    ["The ROC curve plots true-positive rate against false-positive rate across all decision thresholds; AUC is " +
     "the area under it. AUC of 1.0 is perfect, 0.5 is random guessing. It measures how well the model ranks " +
     "patients by risk independently of any single threshold, which is ideal for medical screening. My best " +
     "model scores " + fmt(rf.roc_auc) + "."]),
  ...qa("Why not just rely on accuracy?",
    ["Accuracy can hide important errors, especially with imbalance, and it depends on a fixed 0.5 threshold. Two " +
     "models can have the same accuracy but very different recall. ROC-AUC and recall tell the fuller story for a " +
     "medical use case."]),
  ...qa("Why did you choose Random Forest as the default if SVM has higher accuracy?",
    ["Because for screening, ranking risk well matters most, and Random Forest has the best ROC-AUC (" + fmt(rf.roc_auc) +
     ") with strong recall. The app still lets the user pick SVM, which has the highest accuracy and recall — I " +
     "present it as a trade-off rather than hiding it."]),

  h1("9. Questions & answers — Validation and pitfalls"),
  ...qa("How did you split your data and why stratified?",
    ["An 80/20 train/test split (" + M.dataset.n_train + " / " + M.dataset.n_test + "). Stratified means the split " +
     "preserves the disease/no-disease ratio in both parts, so the test set is representative."]),
  ...qa("What is cross-validation and did you use it?",
    ["Yes — 5-fold cross-validation on the training set. The data is split into five folds; the model trains on " +
     "four and validates on the fifth, rotating five times. It checks that results are stable and not the product " +
     "of one lucky split."]),
  ...qa("What is overfitting and how did you guard against it?",
    ["Overfitting is when a model memorises the training data and fails to generalise. I guard against it with a " +
     "held-out test set, cross-validation, and ensembles like Random Forest that are inherently more robust."]),
  ...qa("What is data leakage and how did you avoid it?",
    ["Leakage is when information from the test set sneaks into training, giving over-optimistic results. I avoid " +
     "it by fitting the preprocessing only on the training data inside the pipeline, never on the full dataset."]),
  ...qa("What are the limitations of your project?",
    [{ li: "It is trained on a few hundred patients from the 1980s–90s; it may not generalise to today’s populations." },
     { li: "I dropped two features and imputed missing values, which loses some information." },
     { li: "It is a decision-support demo, not a validated clinical tool." }]),
  ...qa("How would you improve it?",
    ["Hyperparameter tuning, adding explainability (e.g. SHAP) to show why a prediction was made, a larger and " +
     "more recent dataset, threshold calibration to a chosen sensitivity, and cloud deployment."]),

  h1("10. Questions & answers — Web application"),
  ...qa("Walk me through what happens when a user clicks Predict.",
    ["JavaScript gathers the eleven inputs and the chosen model and sends them as JSON to the /api/predict " +
     "endpoint. Flask passes them into that model’s pipeline, which imputes, scales and encodes them exactly as in " +
     "training, then outputs a probability. Flask returns the probability as JSON and the page animates the gauge " +
     "and verdict."]),
  ...qa("The brief says no external APIs — how do you satisfy that?",
    ["All four models are trained and run locally inside the Flask process; predictions never leave the machine. " +
     "Even the chart library is stored locally rather than loaded from a CDN, so the app works fully offline."]),
  ...qa("Why Flask and a custom front-end instead of Streamlit?",
    ["Streamlit was great for the first version and I kept it as a backup, but a custom Flask + HTML/CSS/JS " +
     "front-end gives full control over the user experience — the animations, the risk gauge and the page " +
     "transitions — which Streamlit cannot do."]),
  ...qa("How does the dashboard get its numbers?",
    ["At training time all metrics are written to reports/metrics.json. The dashboard page fetches them from the " +
     "/api/metrics endpoint and renders the table and charts with Chart.js. Nothing is hard-coded."]),

  h1("11. Common viva mistakes to avoid"),
  bullet("Don’t claim it diagnoses disease — say it estimates risk and is a decision-support demo."),
  bullet("Don’t confuse precision and recall — recall is about catching the sick patients."),
  bullet("Don’t say ‘the model is 90% accurate’ loosely — quote the metric and the model."),
  bullet("Don’t describe it as using AI/ChatGPT — it uses classical ML trained locally, no external APIs."),
  bullet("If you don’t know an answer, reason out loud from what you do know rather than guessing wildly."),
];

// ---- write both -----------------------------------------------------------
Promise.all([
  Packer.toBuffer(baseDoc("Technical Documentation — HeartScreen", tech)),
  Packer.toBuffer(baseDoc("Viva Preparation Guide — HeartScreen", viva)),
]).then(([t, v]) => {
  fs.writeFileSync(path.join(ROOT, "docs", "Technical_Documentation.docx"), t);
  fs.writeFileSync(path.join(ROOT, "docs", "Viva_Preparation_Guide.docx"), v);
  console.log("Wrote Technical_Documentation.docx (" + (t.length / 1024).toFixed(0) + " KB) and " +
              "Viva_Preparation_Guide.docx (" + (v.length / 1024).toFixed(0) + " KB)");
});
