const VERDICT_CONFIG = {
  TRUE:       { color: "#25D366", label: "VERIFIED TRUE" },
  FALSE:      { color: "#FF4444", label: "LIKELY FALSE"  },
  MISLEADING: { color: "#FFB800", label: "MISLEADING"    },
  UNVERIFIED: { color: "#6B8F6B", label: "UNVERIFIED"    },
};

let panel = null;

function removePanel() {
  if (panel) { panel.remove(); panel = null; }
}

function createPanel(innerHtml) {
  removePanel();
  panel = document.createElement("div");
  panel.id = "misinfo-panel";
  panel.innerHTML = innerHtml;
  document.body.appendChild(panel);

  // Close button
  panel.querySelector(".mf-close")?.addEventListener("click", removePanel);

  // Close on outside click
  setTimeout(() => {
    document.addEventListener("click", (e) => {
      if (panel && !panel.contains(e.target)) removePanel();
    }, { once: true });
  }, 200);
}

function renderLoading(text) {
  createPanel(`
    <div class="mf-header">
      <div class="mf-logo">
        <div class="mf-logo-mark"><div class="mf-logo-inner"></div></div>
        <span class="mf-title">Misinfo Firewall</span>
      </div>
      <button class="mf-close">✕</button>
    </div>
    <div class="mf-body">
      <div class="mf-loading">
        <div class="mf-spinner"></div>
        <span class="mf-loading-text">Scanning with AI + fact databases...</span>
        <span class="mf-scan-preview">"${text.substring(0, 100)}${text.length > 100 ? "..." : ""}"</span>
      </div>
    </div>
  `);
}

function renderResult(data) {
  const v = VERDICT_CONFIG[data.verdict] || VERDICT_CONFIG.UNVERIFIED;

  const redFlagsHtml = data.red_flags?.length
    ? `<div>
        <div class="mf-field-label">RED FLAGS</div>
        <div class="mf-chips">
          ${data.red_flags.map(f => `<span class="mf-chip">${f}</span>`).join("")}
        </div>
       </div>`
    : "";

  const credibleSourcesHtml = data.credible_sources?.length
    ? `<div>
        <div class="mf-field-label">CREDIBLE SOURCES</div>
        ${data.credible_sources.map(s => `
          <div class="mf-source">
            <span class="mf-source-name">${s.name}</span>
            <span class="mf-source-url">${s.url}</span>
          </div>`).join("")}
       </div>`
    : "";

  const factSourcesHtml = data.sources?.length
    ? `<div>
        <div class="mf-field-label">FACT-CHECK DATABASE</div>
        ${data.sources.map(s => `
          <div class="mf-source">
            <div class="mf-source-top">
              <span class="mf-source-name">${s.publisher}</span>
              <span class="mf-rating" style="color:${v.color};border-color:${v.color}60">${s.rating}</span>
            </div>
            <span class="mf-source-url">${s.text}</span>
          </div>`).join("")}
       </div>`
    : "";

  createPanel(`
    <div class="mf-strip" style="background:${v.color}"></div>
    <div class="mf-header">
      <div class="mf-logo">
        <div class="mf-logo-mark"><div class="mf-logo-inner"></div></div>
        <span class="mf-title">Misinfo Firewall</span>
      </div>
      <button class="mf-close">✕</button>
    </div>
    <div class="mf-body">
      <div class="mf-verdict-row">
        <span class="mf-badge" style="color:${v.color};border-color:${v.color}60;background:${v.color}18">
          ${v.label}
        </span>
        <span class="mf-score" style="color:${v.color}" id="mf-score-val">0<span class="mf-score-unit">%</span></span>
      </div>

      <div>
        <div class="mf-bar-label">CONFIDENCE</div>
        <div class="mf-bar-track">
          <div class="mf-bar-fill" id="mf-bar" style="background:${v.color}"></div>
        </div>
      </div>

      <div class="mf-divider"></div>

      <div>
        <div class="mf-field-label">ANALYSIS</div>
        <div class="mf-field-text">${data.summary}</div>
      </div>

      ${redFlagsHtml}

      <div class="mf-divider"></div>

      <div>
        <div class="mf-field-label">RECOMMENDATION</div>
        <div class="mf-field-text">${data.advice}</div>
      </div>

      ${credibleSourcesHtml}
      ${factSourcesHtml}
    </div>
  `);

  // Animate score counter
  const scoreEl = document.getElementById("mf-score-val");
  const barEl = document.getElementById("mf-bar");
  const target = data.confidence;
  let current = 0;
  const duration = 1400;
  const start = performance.now();

  function tick(now) {
    const elapsed = now - start;
    const progress = Math.min(elapsed / duration, 1);
    const ease = 1 - Math.pow(1 - progress, 3);
    current = Math.round(ease * target);
    if (scoreEl) scoreEl.innerHTML = `${current}<span class="mf-score-unit">%</span>`;
    if (barEl) barEl.style.width = `${current}%`;
    if (progress < 1) requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
}

function renderError(message) {
  createPanel(`
    <div class="mf-header">
      <div class="mf-logo">
        <div class="mf-logo-mark"><div class="mf-logo-inner"></div></div>
        <span class="mf-title">Misinfo Firewall</span>
      </div>
      <button class="mf-close">✕</button>
    </div>
    <div class="mf-body">
      <div class="mf-error">${message}</div>
    </div>
  `);
}

// Listen for messages from background.js
chrome.runtime.onMessage.addListener((msg) => {
  if (msg.type === "SHOW_LOADING") renderLoading(msg.text);
  if (msg.type === "SHOW_RESULT") {
    if (msg.error) renderError(msg.error);
    else renderResult(msg.data);
  }
});