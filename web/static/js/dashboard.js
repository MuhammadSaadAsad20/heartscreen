/* Dashboard: fetch local metrics and render table, charts and confusion matrices */
(function () {
  "use strict";
  const PALETTE = ["#1FA39B", "#0E1B2C", "#E5484D", "#6E56CF"];
  const ORDER = ["Logistic Regression", "Random Forest", "Support Vector Machine", "Gradient Boosting"];
  const FONT = "Inter, Segoe UI, sans-serif";
  Chart.defaults.font.family = FONT;
  Chart.defaults.color = "#5B6B7E";

  fetch("/api/metrics").then((r) => r.json()).then((data) => {
    const models = data.models;
    const best = data.best_model;
    buildTable(models, best);
    buildConfusion(models);
    lazyChart("bar-chart", () => barChart(models));
    lazyChart("roc-chart", () => rocChart(models));
    lazyChart("time-chart", () => timeChart(models));
  });

  function fmt(x, d = 3) { return Number(x).toFixed(d); }

  function buildTable(models, best) {
    const body = document.getElementById("metrics-body");
    const cols = ["accuracy", "precision", "recall", "f1", "roc_auc", "cv_accuracy_mean"];
    // find best value per column for highlighting
    const tops = {};
    cols.forEach((c) => { tops[c] = Math.max(...ORDER.map((n) => models[n][c])); });
    ORDER.forEach((name) => {
      const m = models[name];
      const tr = document.createElement("tr");
      if (name === best) tr.className = "best";
      const cells = [
        `<td>${name}${name === best ? ' <span class="star">★</span>' : ""}</td>`,
        ...cols.map((c) => `<td class="${m[c] === tops[c] ? "top" : ""}">${fmt(m[c])}</td>`),
        `<td>${fmt(m.train_time, 2)}</td>`,
      ];
      tr.innerHTML = cells.join("");
      body.appendChild(tr);
    });
  }

  function lazyChart(canvasId, make) {
    const canvas = document.getElementById(canvasId);
    const card = canvas.closest(".chart-card") || canvas;
    let done = false;
    const run = () => { if (!done) { done = true; make(); io.disconnect(); } };
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => { if (e.isIntersecting) run(); });
    }, { threshold: 0.25 });
    io.observe(card);
    // Failsafe: render even if the observer is throttled (e.g. background tab).
    setTimeout(run, 2000);
  }

  function barChart(models) {
    const metricKeys = ["accuracy", "precision", "recall", "f1", "roc_auc"];
    const labels = ["Accuracy", "Precision", "Recall", "F1", "ROC-AUC"];
    new Chart(document.getElementById("bar-chart"), {
      type: "bar",
      data: {
        labels,
        datasets: ORDER.map((name, i) => ({
          label: name, data: metricKeys.map((k) => models[name][k]),
          backgroundColor: PALETTE[i], borderRadius: 5, maxBarThickness: 26,
        })),
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        animation: { duration: 900, easing: "easeOutQuart" },
        scales: { y: { beginAtZero: true, max: 1, grid: { color: "#EEF1F6" } }, x: { grid: { display: false } } },
        plugins: { legend: { position: "bottom", labels: { boxWidth: 12, usePointStyle: true } } },
      },
    });
  }

  function rocChart(models) {
    const ds = ORDER.map((name, i) => {
      const r = models[name].roc_curve;
      return {
        label: `${name} (${fmt(models[name].roc_auc)})`,
        data: r.fpr.map((f, j) => ({ x: f, y: r.tpr[j] })),
        borderColor: PALETTE[i], backgroundColor: PALETTE[i],
        borderWidth: 2.4, pointRadius: 0, tension: 0.15,
      };
    });
    ds.push({ label: "Chance", data: [{ x: 0, y: 0 }, { x: 1, y: 1 }],
      borderColor: "#C3CBD6", borderDash: [6, 6], borderWidth: 1.5, pointRadius: 0 });
    new Chart(document.getElementById("roc-chart"), {
      type: "line",
      data: { datasets: ds },
      options: {
        responsive: true, maintainAspectRatio: false, parsing: false,
        animation: { duration: 1000, easing: "easeOutQuart" },
        scales: {
          x: { type: "linear", min: 0, max: 1, title: { display: true, text: "False Positive Rate" }, grid: { color: "#EEF1F6" } },
          y: { min: 0, max: 1, title: { display: true, text: "True Positive Rate" }, grid: { color: "#EEF1F6" } },
        },
        plugins: { legend: { position: "bottom", labels: { boxWidth: 12, usePointStyle: true, filter: (i) => i.text !== "Chance" } } },
      },
    });
  }

  function timeChart(models) {
    new Chart(document.getElementById("time-chart"), {
      type: "bar",
      data: {
        labels: ORDER,
        datasets: [{ label: "Training time (s)", data: ORDER.map((n) => models[n].train_time),
          backgroundColor: ORDER.map((_, i) => PALETTE[i]), borderRadius: 5, maxBarThickness: 34 }],
      },
      options: {
        indexAxis: "y", responsive: true, maintainAspectRatio: false,
        animation: { duration: 900, easing: "easeOutQuart" },
        scales: { x: { beginAtZero: true, title: { display: true, text: "seconds" }, grid: { color: "#EEF1F6" } }, y: { grid: { display: false } } },
        plugins: { legend: { display: false } },
      },
    });
  }

  function buildConfusion(models) {
    const wrap = document.getElementById("cm-wrap");
    ORDER.forEach((name) => {
      const cm = models[name].confusion_matrix; // [[TN,FP],[FN,TP]]
      const max = Math.max(...cm.flat());
      const tint = (v, ok) => {
        const a = Math.max(v / max, 0.08);
        return ok ? `rgba(31,163,155,${a})` : `rgba(229,72,77,${a})`;
      };
      const el = document.createElement("div");
      el.className = "cm";
      el.innerHTML = `
        <h4>${name}</h4>
        <div class="cm__grid">
          <div class="cm__cell" style="background:${tint(cm[0][0], true)}">${cm[0][0]}</div>
          <div class="cm__cell" style="background:${tint(cm[0][1], false)}">${cm[0][1]}</div>
          <div class="cm__cell" style="background:${tint(cm[1][0], false)}">${cm[1][0]}</div>
          <div class="cm__cell" style="background:${tint(cm[1][1], true)}">${cm[1][1]}</div>
        </div>
        <div class="cm__lab">TN · FP / FN · TP &nbsp;(rows = actual)</div>`;
      wrap.appendChild(el);
    });
  }
})();
