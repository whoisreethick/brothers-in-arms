const API_URL = "https://attitude-triangle-tinsel.ngrok-free.dev";

const VERDICT_CONFIG = {
  TRUE:       { color: "#25D366", label: "VERIFIED TRUE" },
  FALSE:      { color: "#FF4444", label: "LIKELY FALSE"  },
  MISLEADING: { color: "#FFB800", label: "MISLEADING"    },
  UNVERIFIED: { color: "#6B8F6B", label: "UNVERIFIED"    },
};

const inputState   = document.getElementById("input-state");
const loadingState = document.getElementById("loading-state");
const resultState  = document.getElementById("result-state");
const msgInput     = document.getElementById("msg-input");
const checkBtn     = document.getElementById("check-btn");
const errorMsg     = document.getElementById("error-msg");
const resetBtn     = document.getElementById("reset-btn");

function showError(msg) {
  errorMsg.textContent = msg;
  errorMsg.style.display = "block";
}

function hideError() {
  errorMsg.style.display = "none";
}

function showLoading() {
  inputState.style.display = "none";
  loadingState.style.display = "flex";
  resultState.style.display = "none";
}

function showInput() {
  inputState.style.display = "block";
  loadingState.style.display = "none";
  resultState.style.display = "none";
}

function showResult(data) {
  const v = VERDICT_CONFIG[data.verdict] || VERDICT_CONFIG.UNVERIFIED;

  inputState.style.display = "none";
  loadingState.style.display = "none";
  resultState.style.display = "flex";

  document.getElementById("result-strip").style.background = v.color;
  
  const badge = document.getElementById("result-badge");
  badge.textContent = v.label;
  badge.style.color = v.color;
  badge.style.borderColor = v.color + "60";
  badge.style.background = v.color + "18";

  const scoreEl = document.getElementById("result-score");
  const barEl = document.getElementById("result-bar");
  scoreEl.style.color = v.color;
  barEl.style.background = v.color;

  document.getElementById("result-summary").textContent = data.summary;
  document.getElementById("result-advice").textContent = data.advice;

  // Red flags
  const flagsSection = document.getElementById("result-flags-section");
  const flagsEl = document.getElementById("result-flags");
  if (data.red_flags?.length) {
    flagsSection.style.display = "block";
    flagsEl.innerHTML = data.red_flags.map(f => `<span class="chip">${f}</span>`).join("");
  } else {
    flagsSection.style.display = "none";
  }

  // Animate score
  const target = data.confidence;
  const duration = 1400;
  const start = performance.now();
  function tick(now) {
    const elapsed = now - start;
    const progress = Math.min(elapsed / duration, 1);
    const ease = 1 - Math.pow(1 - progress, 3);
    const current = Math.round(ease * target);
    scoreEl.innerHTML = `${current}<span class="score-unit">%</span>`;
    barEl.style.width = `${current}%`;
    if (progress < 1) requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
}

checkBtn.addEventListener("click", async () => {
  const message = msgInput.value.trim();
  hideError();

  if (!message || message.length < 10) {
    showError("Please enter a longer message to fact-check.");
    return;
  }

  showLoading();

  try {
    const res = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message }),
    });
    if (!res.ok) throw new Error(`Server error: ${res.status}`);
    const data = await res.json();
    showResult(data);
  } catch (err) {
    showInput();
    showError("Could not reach the server. Make sure backend is running.");
  }
});

resetBtn.addEventListener("click", () => {
  msgInput.value = "";
  hideError();
  showInput();
});