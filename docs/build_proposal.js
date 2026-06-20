// Build the Project Proposal (.docx) for the Heart Disease ML project.
// Run:  node docs/build_proposal.js
const fs = require("fs");
const path = require("path");
const {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  Header, Footer, AlignmentType, HeadingLevel, BorderStyle, WidthType,
  ShadingType, PageNumber, LevelFormat,
} = require("docx");

const ROOT = path.resolve(__dirname, "..");
const CONTENT_W = 9360;
const BLUE = "2E5C8A";

function h1(text) { return new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun(text)] }); }
function p(text) {
  return new Paragraph({ spacing: { after: 130, line: 276 }, alignment: AlignmentType.JUSTIFIED,
    children: [new TextRun(text)] });
}
function bullet(text) {
  return new Paragraph({ numbering: { reference: "pb", level: 0 }, spacing: { after: 50 },
    children: [new TextRun(text)] });
}

const border = { style: BorderStyle.SINGLE, size: 1, color: "AAB4C4" };
const borders = { top: border, bottom: border, left: border, right: border,
  insideHorizontal: border, insideVertical: border };
function cell(text, { header = false, w, align = AlignmentType.LEFT } = {}) {
  return new TableCell({ width: { size: w, type: WidthType.DXA },
    shading: header ? { fill: BLUE, type: ShadingType.CLEAR } : undefined,
    margins: { top: 60, bottom: 60, left: 110, right: 110 },
    children: [new Paragraph({ alignment: align, children: [
      new TextRun({ text, bold: header, color: header ? "FFFFFF" : "000000", size: 19 })] })] });
}
function table(head, rows, widths) {
  const trs = [new TableRow({ tableHeader: true, children:
    head.map((t, i) => cell(t, { header: true, w: widths[i],
      align: i === 0 ? AlignmentType.LEFT : AlignmentType.CENTER })) })];
  rows.forEach((r) => trs.push(new TableRow({ children:
    r.map((t, i) => cell(String(t), { w: widths[i],
      align: i === 0 ? AlignmentType.LEFT : AlignmentType.CENTER })) })));
  return new Table({ width: { size: CONTENT_W, type: WidthType.DXA }, columnWidths: widths, borders, rows: trs });
}

const header = [
  new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 200, after: 40 },
    children: [new TextRun({ text: "Machine Learning Course — Project Proposal", size: 24, color: BLUE, bold: true })] }),
  new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 120 },
    children: [new TextRun({ text: "Heart Disease Prediction: A Web-Based Machine Learning Application", size: 36, bold: true })] }),
  table(["Student Name", "________________", "Student ID", "____________"],
    [["Course", "Machine Learning", "Instructor", "____________"],
     ["Date", "June 2026", "Proposed duration", "4 weeks"]],
    [1900, 2780, 1900, 2780]),
  new Paragraph({ spacing: { after: 120 } }),
];

const body = [
  h1("1. Introduction and Problem Statement"),
  p("Cardiovascular disease is the leading cause of death worldwide, responsible for an estimated " +
    "17.9 million deaths each year. Early identification of at-risk patients allows timely " +
    "intervention and saves lives, yet combining many clinical indicators into an accurate risk " +
    "assessment by hand is difficult and subjective. This project proposes a web-based machine-" +
    "learning application that predicts whether a patient has heart disease from routine clinical " +
    "measurements. Framed as a binary classification problem, it serves as a data-driven decision-" +
    "support tool and demonstrates a complete machine-learning workflow."),

  h1("2. Objectives"),
  bullet("Develop a browser-based application in which a user enters patient measurements and receives a heart-disease risk prediction."),
  bullet("Train and evaluate at least two machine-learning algorithms on the same dataset."),
  bullet("Keep the system fully self-contained — all models trained and run locally, with no external prediction APIs."),
  bullet("Build a dashboard comparing the models on accuracy, precision, recall, F1-score, ROC-AUC, training time and confusion matrices."),

  h1("3. Proposed Methodology"),
  p("The project will follow the standard supervised-learning pipeline:"),
  bullet("Data collection: download and combine the four UCI Heart Disease databases into a single dataset."),
  bullet("Preprocessing: handle missing and zero-coded values, impute, scale numeric features and one-hot encode categorical features inside a leakage-free scikit-learn pipeline."),
  bullet("Modelling: train four classifiers — Logistic Regression, Random Forest, Support Vector Machine and Gradient Boosting — on an 80/20 stratified split, validated with 5-fold cross-validation."),
  bullet("Evaluation: compute all required metrics on a held-out test set and select the best model by ROC-AUC."),
  bullet("Application: expose the trained models through a Streamlit web app with prediction, dashboard and data-exploration pages."),

  h1("4. Dataset"),
  p("The UCI Heart Disease Data Set will be used (Cleveland, Hungarian, Switzerland and VA Long " +
    "Beach databases), giving roughly 920 records — above the recommended 500-record minimum. Eleven " +
    "clinical features (age, sex, chest-pain type, resting blood pressure, cholesterol, fasting " +
    "blood sugar, resting ECG, maximum heart rate, exercise-induced angina, ST depression and ST " +
    "slope) predict a binary target. Source: UCI Machine Learning Repository, dataset 45."),

  h1("5. Tools and Technologies"),
  table(["Component", "Technology"],
    [["Programming language", "Python 3.12"],
     ["ML library", "scikit-learn"],
     ["Web framework", "Streamlit"],
     ["Data handling", "pandas, NumPy"],
     ["Visualisation", "Plotly, Matplotlib"],
     ["Model persistence", "joblib"]],
    [4680, 4680]),
  new Paragraph({ spacing: { after: 120 } }),

  h1("6. Expected Outcomes"),
  bullet("A working web application that predicts heart-disease risk from user input."),
  bullet("At least two (in fact four) trained and compared models, with the best achieving an expected accuracy of roughly 80–85% and ROC-AUC near 0.90."),
  bullet("An interactive model-comparison dashboard."),
  bullet("A documented source-code repository and an 8–15 page final report."),

  h1("7. Project Timeline"),
  table(["Week", "Milestone"],
    [["Week 1", "Dataset collection, cleaning and exploratory data analysis"],
     ["Week 2", "Preprocessing pipeline and training of all models"],
     ["Week 3", "Evaluation, model comparison and dashboard development"],
     ["Week 4", "Web app finalisation, report writing and live demo preparation"]],
    [1600, 7760]),
  new Paragraph({ spacing: { after: 120 } }),

  h1("8. References"),
  p("1. World Health Organization — Cardiovascular diseases (CVDs) fact sheet."),
  p("2. Dua, D. & Graff, C. (2019). UCI Machine Learning Repository — Heart Disease Data Set."),
  p("3. Pedregosa, F., et al. (2011). Scikit-learn: Machine Learning in Python. JMLR 12, 2825–2830."),
];

const doc = new Document({
  creator: "Heart Disease ML Project",
  title: "Heart Disease Prediction — Project Proposal",
  styles: {
    default: { document: { run: { font: "Calibri", size: 22 } } },
    paragraphStyles: [
      { id: "Heading1", name: "Heading 1", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { size: 26, bold: true, color: BLUE, font: "Calibri" },
        paragraph: { spacing: { before: 240, after: 120 }, outlineLevel: 0 } },
    ],
  },
  numbering: { config: [
    { reference: "pb", levels: [{ level: 0, format: LevelFormat.BULLET, text: "•",
      alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 540, hanging: 270 } } } }] },
  ] },
  sections: [{
    properties: { page: { size: { width: 12240, height: 15840 },
      margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 } } },
    footers: { default: new Footer({ children: [new Paragraph({ alignment: AlignmentType.CENTER,
      children: [new TextRun({ text: "Project Proposal — Page ", size: 16, color: "777777" }),
        new TextRun({ children: [PageNumber.CURRENT], size: 16, color: "777777" })] })] }) },
    children: [...header, ...body],
  }],
});

Packer.toBuffer(doc).then((buf) => {
  const out = path.join(ROOT, "docs", "Project_Proposal.docx");
  fs.writeFileSync(out, buf);
  console.log("Wrote", out, "(" + (buf.length / 1024).toFixed(0) + " KB)");
});
