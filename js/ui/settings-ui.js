import {
  state,
  els,
  THEMES,
  THEME_COLORS,
  SPEED_LEVELS,
  SPEED_ORDER,
  GAME_MODES,
  shuffle,
  tr,
  formatNumber,
  formatTime,
  setText,
  iconSvg,
  setIcon,
  setUseIcon,
} from "../core/state.js";
import {
  setTheme as saveTheme,
  setSpeed as saveSpeed,
  setMode as saveMode,
  getIntroSeen,
  setIntroSeen,
} from "../core/storage.js";
import { refreshPetPalette } from "../systems/pet.js";
import { applyFallingSpeed } from "../modes/rain.js";
import { poetryCategoryName, loadPoetryLibrary } from "../modes/poem.js";
import { toast, updateHUD } from "./feedback.js";
import { updateSessionTotal, renderGuestRenameBanner } from "./profiles.js";
import { renderPoetrySummary } from "./poetry-ui.js";
import { openDialogModal, closeDialogModal, isDialogOpen } from "./dialogs.js";

export function isSetupSheetOpen() {
  return isDialogOpen(els.setupSheet);
}

export function applyTheme(key) {
  const theme = THEMES.includes(key) ? key : "candy";
  state.theme = theme;
  if (typeof document !== "undefined") {
    document.documentElement.dataset.theme = theme;
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute("content", THEME_COLORS[theme] || THEME_COLORS.candy);
  }
  refreshPetPalette();
  if (els.themeGroup) {
    els.themeGroup.querySelectorAll("[data-theme-choice]").forEach((button) => {
      const active = button.dataset.themeChoice === theme;
      button.classList.toggle("is-active", active);
      button.setAttribute("aria-checked", String(active));
    });
  }
}

export function setTheme(key) {
  if (!THEMES.includes(key)) return state.theme;
  saveTheme(key);
  applyTheme(key);
  toast(tr("theme.set", { theme: tr(`theme.${key}`) }));
  return state.theme;
}

export function updateThemeUI() {
  if (!els.themeGroup) return;
  els.themeGroup.querySelectorAll("[data-theme-choice]").forEach((button) => {
    const active = button.dataset.themeChoice === state.theme;
    button.classList.toggle("is-active", active);
    button.setAttribute("aria-checked", String(active));
  });
}

export function updateSpeedUI() {
  if (!els.speedBtn) return;
  const key = SPEED_LEVELS[state.speed] ? state.speed : "normal";
  els.speedBtn.dataset.speed = key;
  setText(els.speedLabel, tr(`speed.${key}`));
  const label = tr("speed.pillAria", { speed: tr(`speed.${key}`) });
  els.speedBtn.setAttribute("aria-label", label);
  els.speedBtn.setAttribute("title", label);
}

export function cycleSpeed() {
  const previous = state.speed;
  const index = SPEED_ORDER.indexOf(state.speed);
  state.speed = SPEED_ORDER[(index + 1) % SPEED_ORDER.length] || "normal";
  saveSpeed(state.speed);
  applyFallingSpeed(previous, state.speed);
  updateSpeedUI();
  toast(tr("speed.set", { speed: tr(`speed.${state.speed}`) }));
}

export function scatterPlaySteps() {
  // Legacy play-steps removed in F09
}

export function updateModeUI() {
  const fill = state.mode === "fill";
  const paint = state.mode === "paint";
  const poem = state.mode === "poem";
  if (typeof document !== "undefined" && document.body) {
    document.body.classList.toggle("mode-fill", fill);
    document.body.classList.toggle("mode-paint", paint);
    document.body.classList.toggle("mode-poem", poem);
    document.body.classList.toggle("mode-rain", state.mode === "rain");
  }
  for (const button of els.modeOptions || []) {
    const active = button.dataset.mode === state.mode;
    button.classList.toggle("is-active", active);
    button.setAttribute("aria-pressed", String(active));
  }
  setIcon(els.stepIcon1, poem ? "book" : paint ? "palette" : fill ? "grid" : "rain");
  setText(
    els.stepLabel1,
    tr(poem ? "mode.poemStep1" : paint ? "mode.paintStep1" : fill ? "mode.fillStep1" : "start.step1"),
  );
  setText(els.stepLabel2, tr("start.step2"));
  setText(
    els.stepLabel3,
    tr(poem ? "mode.poemStep3" : paint ? "mode.paintStep3" : fill ? "mode.fillStep3" : "start.step3"),
  );
  setText(
    els.correctLabel,
    tr(poem ? "poem.overLine" : paint ? "hud.hits" : fill ? "hud.cleared" : "hud.correct"),
  );
  setText(els.levelLabel, tr(poem ? "hud.lines" : fill || paint ? "hud.remaining" : "hud.level"));
  setText(
    els.pileLabel,
    tr(poem ? "hud.lines" : paint ? "hud.paint" : fill ? "hud.progress" : "hud.pile"),
  );
  setText(
    els.gaugeLabel,
    tr(poem ? "hud.lines" : paint ? "gauge.paint" : fill ? "gauge.progress" : "gauge.label"),
  );
  if (els.typeInput) {
    const placeholder = tr(poem ? "poem.inputPlaceholder" : "footer.placeholder");
    els.typeInput.placeholder = placeholder;
    els.typeInput.setAttribute("aria-label", placeholder);
  }
  renderPoetrySummary();
}

export function setMode(mode) {
  if (!GAME_MODES.includes(mode) || mode === state.mode) {
    updateModeUI();
    if (state.mode === "poem" && !state.poetry.loaded) {
      loadPoetryLibrary().catch(() => {});
    }
    return state.mode;
  }
  state.mode = mode;
  saveMode(mode);
  updateModeUI();
  scatterPlaySteps();
  updateHUD(true);
  if (mode === "poem" && !state.poetry.loaded) {
    loadPoetryLibrary().catch(() => {});
  }
  if (state.phase === "over") renderOverPanel();
  return state.mode;
}

export function openSetup() {
  if (!els.setupSheet) return;
  openDialogModal(els.setupSheet, {
    opener: els.setupBtn,
    focusEl: els.setupClose,
  });
}

export function closeSetup() {
  closeDialogModal(els.setupSheet);
}

export function maybeShowIntro() {
  if (getIntroSeen(false)) return;
  setIntroSeen(true);
}

export function renderMissedList() {
  if (!els.missedList) return;
  const uniqueMissed = [...new Set(state.missedWords)].slice(0, 18);
  els.missedList.replaceChildren();
  if (!uniqueMissed.length) {
    const chip = document.createElement("span");
    chip.className = "empty";
    chip.textContent = tr("over.emptyMissed");
    els.missedList.appendChild(chip);
    return;
  }
  for (const miss of uniqueMissed) {
    const chip = document.createElement("button");
    chip.type = "button";
    chip.className = "missed-chip";
    chip.dataset.speakWord = miss;
    chip.textContent = miss;
    chip.setAttribute("aria-label", tr("help.listen", { word: miss }));
    els.missedList.appendChild(chip);
  }
}

export function renderOverPanel() {
  const fill = state.mode === "fill";
  const paint = state.mode === "paint";
  const poem = state.mode === "poem" && state.poem;
  const board = fill || paint;

  setText(
    els.overEyebrow,
    poem
      ? tr("poem.overEyebrow")
      : tr(paint ? "paint.overEyebrow" : fill ? "fill.overEyebrow" : "over.eyebrow"),
  );
  setUseIcon(
    els.overEyebrowIcon,
    poem ? "book" : paint ? "palette" : fill ? "grid" : state.newRecord ? "trophy" : "burst",
  );
  setText(
    els.overTitle,
    poem
      ? tr("poem.overTitle")
      : tr(paint ? "paint.overTitle" : fill ? "fill.overTitle" : "over.title"),
  );
  setText(
    els.overTagline,
    poem
      ? tr("poem.overTagline")
      : tr(paint ? "paint.overTagline" : fill ? "fill.overTagline" : "over.tagline"),
  );
  setText(els.overScoreLabel, tr("over.score"));
  setText(
    els.overClearedLabel,
    poem
      ? tr("poem.overLine")
      : tr(paint ? "paint.clearedLabel" : fill ? "fill.clearedLabel" : "over.cleared"),
  );
  setText(els.overComboLabel, poem ? tr("poem.overCombo") : tr("over.combo"));
  setText(
    els.overTimeLabel,
    poem
      ? tr("poem.overTime")
      : tr(paint ? "paint.timeLabel" : fill ? "fill.timeLabel" : "over.time"),
  );
  if (els.restartBtn) {
    els.restartBtn.textContent = tr(
      poem ? "poem.again" : paint ? "paint.again" : fill ? "fill.again" : "over.cta",
    );
  }
  if (els.poemResult) {
    els.poemResult.classList.toggle("is-hidden", !poem);
    if (poem) {
      setText(els.poemResultCategory, poetryCategoryName(poem.category.id));
      setText(els.poemResultTitle, poem.poem.title);
      setText(els.poemResultAuthor, poem.poem.author);
    }
  }
  if (els.overPoetryBtn) {
    els.overPoetryBtn.classList.toggle("is-hidden", !poem);
  }
  if (els.overNextPoemBtn) {
    els.overNextPoemBtn.classList.toggle("is-hidden", !poem);
  }
  if (els.practiceMissedBtn) {
    const hasMissed = !poem && state.missedWords.length > 0;
    els.practiceMissedBtn.classList.toggle("is-hidden", !hasMissed);
    els.practiceMissedBtn.disabled = !hasMissed;
  }
  setText(
    els.missedTitle,
    tr(
      board && !state.missedWords.length
        ? paint
          ? "paint.allClear"
          : "fill.allClear"
        : "over.missedTitle",
    ),
  );
  if (els.missedList) {
    els.missedList.classList.toggle("is-hidden", board && !state.missedWords.length);
  }
  if (els.fillBonusLine) {
    els.fillBonusLine.classList.toggle("is-hidden", !board || Boolean(poem));
    const bonus = paint ? state.paintBonus : state.fillBonus;
    els.fillBonusLine.textContent =
      board && !poem ? tr(paint ? "paint.bonus" : "fill.bonus", { score: formatNumber(bonus) }) : "";
  }
  setText(els.finalScore, formatNumber(state.score));
  setText(els.finalCleared, String(state.cleared));
  setText(els.finalCombo, `×${state.bestCombo}`);
  setText(els.finalTime, formatTime(state.elapsed));
  renderMissedList();
  renderGuestRenameBanner();
  if (els.recordLine) {
    els.recordLine.classList.toggle("new", state.newRecord);
    els.recordLine.replaceChildren();
    if (state.newRecord) els.recordLine.appendChild(iconSvg("trophy"));
    els.recordLine.appendChild(
      document.createTextNode(
        state.newRecord
          ? tr("over.record")
          : tr("over.best", { score: formatNumber(state.highScore) }),
      ),
    );
  }
  updateSessionTotal();
}
