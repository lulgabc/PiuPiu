import {
  state,
  els,
  rewardNodes,
  tr,
  formatNumber,
  formatTime,
  setText,
  iconSvg,
  setIcon,
} from "../core/state.js";

export function syncPhaseClass() {
  if (typeof document === "undefined" || !document.body) return;
  document.body.classList.remove("phase-menu", "phase-playing", "phase-paused", "phase-over");
  document.body.classList.add(`phase-${state.phase}`);
}

export function showPanel(panel) {
  if (els.overlay) els.overlay.classList.remove("hidden");
  for (const p of [els.startPanel, els.pausePanel, els.overPanel]) {
    if (p) p.classList.toggle("hidden", p !== panel);
  }
}

export function hideOverlay() {
  if (els.overlay) els.overlay.classList.add("hidden");
}

export function toast(message, type = "info") {
  if (!els.toast) return;
  setText(els.toast, message);
  els.toast.classList.toggle("warn", type === "warn");
  els.toast.classList.add("show");
  clearTimeout(state.toastTimer);
  state.toastTimer = window.setTimeout(() => {
    if (els.toast) els.toast.classList.remove("show");
  }, 2400);
}

export function hideToast() {
  clearTimeout(state.toastTimer);
  state.toastTimer = 0;
  if (!els.toast) return;
  els.toast.classList.remove("show");
  setText(els.toast, "");
}

export function showHeard(message, iconName) {
  if (!els.heard) return;
  els.heard.replaceChildren();
  if (iconName) {
    const svg = iconSvg(iconName);
    if (svg) els.heard.appendChild(svg);
  }
  els.heard.appendChild(document.createTextNode(message));
  els.heard.classList.add("show");
  clearTimeout(state.heardTimer);
  state.heardTimer = window.setTimeout(() => {
    if (els.heard) els.heard.classList.remove("show");
  }, 1600);
}

export function hideHeard() {
  clearTimeout(state.heardTimer);
  state.heardTimer = 0;
  if (!els.heard) return;
  els.heard.classList.remove("show");
  els.heard.replaceChildren();
}

export function showPraise(keyOverride) {
  if (!els.praise) return;
  const keys = ["praise.1", "praise.2", "praise.3", "praise.4"];
  const key = keyOverride || keys[Math.floor(Math.random() * keys.length)];
  const icon = keyOverride === "easter.golden" ? "🌟" : "⭐";
  setText(els.praise, `${icon} ${tr(key)}`);
  els.praise.classList.add("show");
  clearTimeout(state.praiseTimer);
  state.praiseTimer = window.setTimeout(() => {
    if (els.praise) els.praise.classList.remove("show");
  }, 950);
}

export function hidePraise() {
  clearTimeout(state.praiseTimer);
  state.praiseTimer = 0;
  if (!els.praise) return;
  els.praise.classList.remove("show");
  setText(els.praise, "");
}

export function updateHUD(force = false) {
  const fill = state.mode === "fill";
  const paint = state.mode === "paint";
  const poem = state.mode === "poem";
  const board = fill || paint;
  setText(els.score, formatNumber(state.score));
  setText(els.correct, String(state.cleared));
  setText(els.combo, `×${state.combo}`);
  setText(
    els.level,
    poem
      ? state.poem
        ? `${state.poem.read}/${state.poem.total}`
        : "0/0"
      : board
        ? String(state.settled.length)
        : String(state.level),
  );
  setText(els.time, formatTime(state.elapsed));

  let progress = 0;
  if (poem) {
    progress =
      state.poem && state.poem.total
        ? Math.round((state.poem.read / state.poem.total) * 100)
        : 0;
  } else if (board) {
    const total = fill ? state.fillTotal : state.paintTotal;
    progress = total ? Math.min(100, Math.round((state.cleared / total) * 100)) : 0;
  } else {
    const fieldH = (els.field && els.field.clientHeight) || 1;
    let minY = fieldH;
    for (const s of state.settled) minY = Math.min(minY, s.y);
    progress = state.settled.length
      ? Math.min(100, Math.round(((fieldH - minY) / fieldH) * 100))
      : 0;
  }
  setText(els.pile, `${progress}%`);

  if (els.pileFill && (force || state.lastHud.pilePct !== progress)) {
    els.pileFill.style.height = `${progress}%`;
    state.lastHud.pilePct = progress;
  }

  const hot = state.combo >= 2;
  if (els.comboStat && (force || state.lastHud.hot !== hot)) {
    els.comboStat.classList.toggle("hot", hot);
    state.lastHud.hot = hot;
  }

  const danger = !board && !poem && progress >= 68;
  if (force || state.lastHud.danger !== danger) {
    if (els.pileStat) els.pileStat.classList.toggle("danger", danger);
    if (els.field) els.field.classList.toggle("danger", danger);
    state.lastHud.danger = danger;
  }
}

export function pulseCombo() {
  if (!els.comboStat) return;
  els.comboStat.classList.remove("pop");
  void els.comboStat.offsetWidth;
  els.comboStat.classList.add("pop");
  window.setTimeout(() => {
    if (els.comboStat) els.comboStat.classList.remove("pop");
  }, 350);
}

export function setRewardProgress(value, options = {}) {
  if (!els.rewardProgress || !els.rewardTrack || !els.rewardCount) return;
  const { ready = false, tick = false } = options;
  const clamped = Math.max(0, Math.min(5, Math.round(value)));
  state.rewardProgress = clamped;
  els.rewardProgress.style.setProperty("--p", String(clamped / 5));
  els.rewardCount.textContent = `${clamped}/5`;
  els.rewardTrack.setAttribute("aria-valuenow", String(clamped));
  rewardNodes.forEach((node, index) => {
    node.classList.toggle("is-lit", index < clamped);
  });
  els.rewardProgress.classList.toggle("is-ready", Boolean(ready));

  if (tick) {
    window.clearTimeout(state.rewardTickTimer);
    els.rewardProgress.classList.remove("is-tick");
    void els.rewardProgress.offsetWidth;
    els.rewardProgress.classList.add("is-tick");
    state.rewardTickTimer = window.setTimeout(() => {
      if (els.rewardProgress) els.rewardProgress.classList.remove("is-tick");
      state.rewardTickTimer = 0;
    }, 380);
  }
}

export function resetRewardProgress() {
  window.clearTimeout(state.rewardBarTimer);
  window.clearTimeout(state.rewardTickTimer);
  state.rewardBarTimer = 0;
  state.rewardTickTimer = 0;
  if (els.rewardProgress) els.rewardProgress.classList.remove("is-tick");
  setRewardProgress(0);
}

export function advanceRewardProgress() {
  const progress = state.cleared % 5;
  window.clearTimeout(state.rewardBarTimer);
  state.rewardBarTimer = 0;
  if (progress === 0) {
    setRewardProgress(5, { ready: true, tick: true });
    state.rewardBarTimer = window.setTimeout(() => {
      state.rewardBarTimer = 0;
      setRewardProgress(0);
    }, 900);
  } else {
    setRewardProgress(progress, { tick: true });
  }
}

export function updatePauseButton() {
  if (!els.pauseBtn) return;
  const paused = state.phase === "paused";
  setIcon(els.pauseBtn, paused ? "play" : "pause");
  els.pauseBtn.title = paused ? tr("pause.resumeTitle") : tr("pause.pauseTitle");
  els.pauseBtn.setAttribute("aria-label", paused ? tr("pause.resume") : tr("pause.pause"));
}

export function updateMuteUI() {
  if (!els.muteBtn) return;
  setIcon(els.muteBtn, state.muted ? "volume-off" : "volume");
  els.muteBtn.setAttribute("aria-pressed", String(state.muted));
  els.muteBtn.title = tr("mute.title");
  els.muteBtn.setAttribute("aria-label", state.muted ? tr("mute.on") : tr("mute.off"));
}
