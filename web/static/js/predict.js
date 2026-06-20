/* Prediction page: submit form to /api/predict and animate the result gauge */
(function () {
  "use strict";
  const form = document.getElementById("predict-form");
  if (!form) return;

  const CIRC = 527.8; // 2 * pi * 84
  const btn = document.getElementById("submit-btn");
  const empty = document.getElementById("result-empty");
  const result = document.getElementById("result");
  const arc = document.getElementById("gauge-arc");
  const pct = document.getElementById("gauge-pct");

  const FIELDS = ["age", "trestbps", "chol", "thalach", "oldpeak",
                  "sex", "cp", "fbs", "restecg", "exang", "slope"];

  // A representative higher-risk patient to demo quickly
  const SAMPLE = { age: 63, sex: "1.0", cp: "4.0", trestbps: 145, chol: 240, fbs: "0.0",
                   restecg: "2.0", thalach: 108, exang: "1.0", oldpeak: 2.6, slope: "2.0" };

  document.getElementById("sample-btn").addEventListener("click", () => {
    Object.entries(SAMPLE).forEach(([k, v]) => {
      const el = document.getElementById(k);
      if (el) el.value = v;
    });
    form.querySelector("input, select").focus();
  });

  function animatePct(target) {
    const start = performance.now();
    function tick(now) {
      const p = Math.min((now - start) / 1000, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      pct.textContent = (target * eased).toFixed(1) + "%";
      if (p < 1) requestAnimationFrame(tick);
      else pct.textContent = target.toFixed(1) + "%";
    }
    requestAnimationFrame(tick);
  }

  form.addEventListener("submit", async (ev) => {
    ev.preventDefault();
    const features = {};
    for (const f of FIELDS) features[f] = document.getElementById(f).value;
    const model = document.getElementById("model").value;

    btn.disabled = true;
    btn.innerHTML = '<span class="spinner"></span>';

    try {
      const res = await fetch("/api/predict", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ model, features }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Prediction failed");

      empty.style.display = "none";
      result.style.display = "grid";

      const positive = data.prediction === 1;
      result.classList.toggle("is-positive", positive);
      result.classList.toggle("is-negative", !positive);

      const badge = document.getElementById("result-badge");
      badge.className = "badge " + (positive ? "badge--danger" : "badge--ok");
      badge.textContent = positive ? "Elevated risk" : "Low risk";

      document.getElementById("result-verdict").textContent = data.label;
      document.getElementById("result-sub").textContent = positive
        ? "The model estimates this patient is likely to have heart disease. Recommend clinical follow-up."
        : "The model estimates this patient is unlikely to have heart disease.";
      document.getElementById("result-model").textContent = data.model;
      document.getElementById("result-auc").textContent = data.model_auc;
      document.getElementById("result-recall").textContent = data.model_recall;

      // The CSS transition on .gauge__value animates the arc; setting the final
      // offset directly keeps the end state correct even if rAF is throttled.
      arc.style.stroke = positive ? "var(--danger)" : "var(--success)";
      arc.setAttribute("stroke-dashoffset", CIRC * (1 - data.percent / 100));
      animatePct(data.percent);
      // Failsafe: guarantee the final number even if rAF never runs (background tab).
      setTimeout(() => { pct.textContent = data.percent.toFixed(1) + "%"; }, 1200);
      result.scrollIntoView({ behavior: "smooth", block: "nearest" });
    } catch (err) {
      empty.style.display = "block";
      empty.innerHTML = '<p style="color:var(--danger)"><strong>Something went wrong.</strong><br>' +
        (err.message || "Please check your inputs and try again.") + "</p>";
      result.style.display = "none";
    } finally {
      btn.disabled = false;
      btn.innerHTML = '<span class="btn-label">Predict risk</span>';
    }
  });
})();
