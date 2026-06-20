/* Explore page: fetch aggregated dataset views and render interactive charts */
(function () {
  "use strict";
  const TEAL = "#1FA39B", NAVY = "#0E1B2C", RED = "#E5484D";
  Chart.defaults.font.family = "Inter, Segoe UI, sans-serif";
  Chart.defaults.color = "#5B6B7E";
  const GRID = "#EEF1F6";

  fetch("/api/explore").then((r) => r.json()).then((data) => {
    balanceChart(data.balance);
    corrChart(data.correlations);
    distChart(data.numeric);
    rateChart(data.categorical);
  });

  function balanceChart(balance) {
    new Chart(document.getElementById("balance-chart"), {
      type: "doughnut",
      data: {
        labels: ["No disease", "Disease"],
        datasets: [{ data: [balance["0"], balance["1"]], backgroundColor: [TEAL, RED], borderWidth: 0, hoverOffset: 8 }],
      },
      options: {
        responsive: true, maintainAspectRatio: false, cutout: "62%",
        animation: { animateRotate: true, duration: 900 },
        plugins: { legend: { position: "bottom", labels: { boxWidth: 12, usePointStyle: true } } },
      },
    });
  }

  function corrChart(corr) {
    new Chart(document.getElementById("corr-chart"), {
      type: "bar",
      data: {
        labels: corr.labels,
        datasets: [{ data: corr.values,
          backgroundColor: corr.values.map((v) => (v >= 0 ? RED : TEAL)), borderRadius: 4 }],
      },
      options: {
        indexAxis: "y", responsive: true, maintainAspectRatio: false,
        animation: { duration: 900, easing: "easeOutQuart" },
        scales: { x: { min: -0.5, max: 0.5, grid: { color: GRID } }, y: { grid: { display: false } } },
        plugins: { legend: { display: false },
          tooltip: { callbacks: { label: (c) => "corr: " + c.raw.toFixed(3) } } },
      },
    });
  }

  let dist;
  function distChart(numeric) {
    const sel = document.getElementById("num-select");
    const render = () => {
      const d = numeric[sel.value];
      const cfg = {
        type: "bar",
        data: {
          labels: d.centers,
          datasets: [
            { label: "No disease", data: d["No disease"], backgroundColor: TEAL + "cc", borderRadius: 3 },
            { label: "Disease", data: d["Disease"], backgroundColor: RED + "cc", borderRadius: 3 },
          ],
        },
        options: {
          responsive: true, maintainAspectRatio: false,
          animation: { duration: 700 },
          scales: { x: { stacked: false, grid: { display: false }, title: { display: true, text: sel.options[sel.selectedIndex].text } },
                    y: { grid: { color: GRID }, title: { display: true, text: "patients" } } },
          plugins: { legend: { position: "bottom", labels: { boxWidth: 12, usePointStyle: true } } },
        },
      };
      if (dist) { dist.destroy(); }
      dist = new Chart(document.getElementById("dist-chart"), cfg);
    };
    sel.addEventListener("change", render);
    render();
  }

  let rate;
  function rateChart(categorical) {
    const sel = document.getElementById("cat-select");
    const render = () => {
      const d = categorical[sel.value];
      const cfg = {
        type: "bar",
        data: { labels: d.labels, datasets: [{ label: "Disease rate", data: d.rates,
          backgroundColor: NAVY, borderRadius: 5, maxBarThickness: 60 }] },
        options: {
          responsive: true, maintainAspectRatio: false,
          animation: { duration: 800, easing: "easeOutQuart" },
          scales: { y: { min: 0, max: 1, grid: { color: GRID },
            ticks: { callback: (v) => (v * 100) + "%" } }, x: { grid: { display: false } } },
          plugins: { legend: { display: false },
            tooltip: { callbacks: { label: (c) => (c.raw * 100).toFixed(1) + "% have disease" } } },
        },
      };
      if (rate) { rate.destroy(); }
      rate = new Chart(document.getElementById("rate-chart"), cfg);
    };
    sel.addEventListener("change", render);
    render();
  }
})();
