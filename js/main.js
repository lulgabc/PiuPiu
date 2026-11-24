import {
  state,
  els,
  initEls,
  SPEED_LEVELS,
  THEMES,
  GAME_MODES,
  PAD,
  GAME_FPS,
  PET_FALLBACK,
  SpeechRec,
  tr,
} from "./core/state.js";
import { events } from "./core/events.js";
import { ensurePixiLoaded } from "./core/loader.js";
import {
  getLang,
  getTheme,
  getSpeed,
  getMode,
  setHighScore,
  setMuted,
  setSpeed,
  exportBackupJson,
  importBackupJson,
} from "./core/storage.js";
import {
  getWordBank,
  buildCategories,
  setPackUiBridge,
  getSelectedCategory,
  getSelectedPool,
  ensureCategoryPoolLoaded,
  loadPackSelection,
  packGroupForCategory,
  resetBag,
} from "./data/packs.js";
import {
  ensureAudio,
  tone,
  playStart,
  playPause,
  playResume,
  playOver,
  playSecret,
} from "./systems/audio.js";
import {
  rebuildPhysicsWalls,
  destroyPhysics,
  wakePhysicsPile,
  syncPhysicsPile,
  clampPhysicsBodies,
} from "./systems/physics.js";
import {
  initFx,
  cancelMeteor,
  startMeteor,
  updateMeteor,
  explodeWord,
  clearPaintCanvas,
  redrawPaintCanvas,
} from "./systems/fx.js";
import {
  initPetSystem,
  clearPets,
  resetPets,
  updatePets,
  petStartle,
  petCheer,
  petNuzzle,
  petSqueak,
  petInfo,
} from "./systems/pet.js";
import {
  setSpeechUiBridge,
  findMatch,
  resolveSpeechHit,
  lowestFallingWord,
  clearFocus,
  focusWord,
  stopHelpSpeech,
  speakHelp,
  triggerHelp,
  setupHelp,
  syncSpeechPhrases,
  setupSpeech,
  startSpeech,
  stopSpeech,
  updateMicUI,
  toggleMic,
  updateSpeechNote,
  previewVoice,
  onVoiceChange,
  refreshVoiceCatalog,
  getSpeechStats,
} from "./systems/speech.js";
import {
  startRainRound,
  applyFallingSpeed,
  updateWordFace,
  settleWord,
  spawnWord,
  stepRainFrame,
  bindRainEvents,
  resetRainRound,
} from "./modes/rain.js";
import {
  buildFillBoard,
  stepFillFrame,
  bindFillEvents,
  resetFillRound,
} from "./modes/fill.js";
import {
  buildPaintBoard,
  bindPaintEvents,
  resetPaintRound,
} from "./modes/paint.js";
import {
  loadPoetryLibrary,
  setPoetryCategory,
  selectPoetryPoem,
  shufflePoetryPoem,
  nextPoetryPoem,
  importPoetryFile,
  resetPoemRound,
  buildPoemRound,
  bindPoemEvents,
  stopPoemListenAll,
} from "./modes/poem.js";
import {
  syncPhaseClass,
  showPanel,
  hideOverlay,
  toast,
  hideToast,
  showHeard,
  hideHeard,
  showPraise,
  hidePraise,
  updateHUD,
  pulseCombo,
  resetRewardProgress,
  advanceRewardProgress,
  updatePauseButton,
  updateMuteUI,
} from "./ui/feedback.js";
import {
  currentProfile,
  renderBestLine,
  renderAvatarPicker,
  renderPlayerList,
  renderBoard,
  renderPlayerUI,
  addProfilePoints,
  finishProfileRound,
  selectProfile,
  syncPlayerFormMode,
  startAvatarEdit,
  cancelAvatarEdit,
  createPlayerFromForm,
  deleteProfile,
  openPlayerSheet,
  closePlayerSheet,
  openBoard,
  closeBoard,
  loadPlayerState,
  maybeShowPlayerPicker,
  setSelectedAvatar,
  handleGuestRename,
  isPlayerSheetOpen,
  isBoardSheetOpen,
} from "./ui/profiles.js";
import {
  renderPetCollectionButton,
  renderPetGrid,
  unlockCurrentRoundPet,
  openPetSheet,
  closePetSheet,
  isPetSheetOpen,
} from "./ui/pets-ui.js";
import {
  renderPackTabs,
  renderPackCategoryGrid,
  onPackSearchInput,
  renderCategoryOptions,
  updatePackUI,
  renderCustomNotice,
  renderCustomPackList,
  updateCustomPackUI,
  handlePackGroupSwitch,
  handlePackCategorySelect,
  onCategoryChange,
  onLevelChange,
  onDifficultyClick,
  onCustomFileChange,
  createCustomPackFromFile,
  onCustomPackListClick,
  openPack,
  closePack,
  isPackSheetOpen,
} from "./ui/packs-ui.js";
import {
  poetryStatus,
  renderPoetrySummary,
  renderPoetryList,
  renderPoetryLibrary,
  openPoetrySheet,
  closePoetrySheet,
  isPoetrySheetOpen,
} from "./ui/poetry-ui.js";
import {
  applyTheme,
  setTheme,
  updateThemeUI,
  updateSpeedUI,
  cycleSpeed,
  scatterPlaySteps,
  updateModeUI,
  setMode,
  openSetup,
  closeSetup,
  isSetupSheetOpen,
  maybeShowIntro,
  renderOverPanel,
} from "./ui/settings-ui.js";

let roundStartToken = 0;
let mascotTaps = 0;
let mascotTapTimer = 0;
let eventsBound = false;

function getAmbientApi() {
  const g = typeof window !== "undefined" ? window : globalThis;
  return (g && (g.PiuPixiAmbient || g.PiuAmbient)) || null;
}

function setAmbientRunning(running) {
  const api = getAmbientApi();
  if (api && typeof api.setRunning === "function") {
    api.setRunning(Boolean(running));
  }
}

function startAmbientLazy(token) {
  const existing = getAmbientApi();
  if (existing && typeof existing.setRunning === "function") {
    existing.setRunning(true);
    window.dispatchEvent(new CustomEvent("piupiu:roundstart"));
    return;
  }
  ensurePixiLoaded()
    .then(() => {
      if (token !== roundStartToken || state.phase !== "playing") return;
      const api = getAmbientApi();
      if (api && typeof api.setRunning === "function") {
        api.setRunning(true);
        window.dispatchEvent(new CustomEvent("piupiu:roundstart"));
      }
    })
    .catch(() => {
      /* Offline or WebGL disabled: gameplay continues without ambient layer */
    });
}

function resetGame() {
  cancelAnimationFrame(state.raf);
  state.raf = 0;
  cancelMeteor();
  destroyPhysics();
  state.lastSurpriseAt = 0;
  clearFocus();
  stopHelpSpeech();
  hideHeard();
  hidePraise();
  hideToast();
  for (const w of state.words) w.el?.remove();
  for (const s of state.settled) s.el?.remove();
  state.words = [];
  state.settled = [];
  resetBag();
  state.lastWord = "";
  resetRainRound();
  resetFillRound();
  resetPaintRound();
  syncSpeechPhrases();
  state.score = 0;
  state.roundRecorded = true;
  state.combo = 0;
  state.bestCombo = 0;
  state.cleared = 0;
  state.missed = 0;
  state.missedWords = [];
  state.newRecord = false;
  state.lastEffect = null;
  state.elapsed = 0;
  state.level = 1;
  state.spawnTimer = 0.85;
  state.lastFrame = 0;
  state.lastHud = {};
  if (els.pileFill) els.pileFill.style.height = "0%";
  if (els.wordLayer) els.wordLayer.replaceChildren();
  if (els.fxLayer) els.fxLayer.replaceChildren();
  clearPaintCanvas();
  if (els.paintLayer) els.paintLayer.replaceChildren();
  if (els.field) els.field.classList.remove("danger", "shake");
  state.pointer = null;
  if (els.typeInput) {
    els.typeInput.value = "";
    els.typeInput.classList.remove("wrong");
  }
  if (els.correctStat) els.correctStat.classList.remove("reward");
  resetRewardProgress();
  resetPoemRound();
  clearPets();
  updateHUD(true);
}

function frame(timestamp) {
  if (state.phase !== "playing") return;
  if (state.lastFrame && timestamp - state.lastFrame < 1000 / GAME_FPS - 1) {
    state.raf = requestAnimationFrame(frame);
    return;
  }
  if (!state.lastFrame) state.lastFrame = timestamp;
  const dt = Math.min(0.05, Math.max(0, (timestamp - state.lastFrame) / 1000));
  state.lastFrame = timestamp;

  state.elapsed += dt;
  if (state.mode === "rain") {
    if (stepRainFrame(dt)) return;
  } else if (state.mode === "fill") {
    stepFillFrame(dt);
  }

  if (state.phase !== "playing") return;
  updateMeteor(dt);
  if (state.phase !== "playing") return;
  updatePets(dt);
  updateHUD();
  state.raf = requestAnimationFrame(frame);
}

async function startGame({ keepPractice = false } = {}) {
  const Profiles = window.PiuProfiles || null;
  if (Profiles && !currentProfile()) {
    loadPlayerState();
  }
  if (!keepPractice) {
    state.practiceWords = [];
  }

  const token = ++roundStartToken;
  closeSetup();
  closePack();
  closePoetrySheet();
  closePetSheet();
  ensureAudio();
  playStart();

  const cat = getSelectedCategory();
  if (cat && cat.lazy && !cat.loaded && !state.practiceWords.length) {
    await ensureCategoryPoolLoaded(cat.id).catch(() => {});
    if (token !== roundStartToken) return;
  }

  state.pool = getSelectedPool();
  resetGame();
  resetPets();
  if (state.mode === "poem" && els.poemStage) {
    els.poemStage.classList.remove("is-hidden");
  }
  state.phase = "playing";
  syncPhaseClass();
  hideOverlay();
  if (els.pauseBtn) els.pauseBtn.disabled = false;
  updatePauseButton();

  startAmbientLazy(token);

  if (state.mode === "rain") {
    startRainRound().catch(() => {});
  } else if (state.mode === "fill") {
    await buildFillBoard();
    if (token !== roundStartToken || state.phase !== "playing") return;
  } else if (state.mode === "paint") {
    buildPaintBoard();
  } else if (state.mode === "poem") {
    const built = await buildPoemRound();
    if (token !== roundStartToken || state.phase !== "playing" || !built) return;
  }

  state.lastFrame = 0;
  state.raf = requestAnimationFrame(frame);
  if (state.micEnabled) startSpeech();
  updateMicUI();
  if (els.typeInput) els.typeInput.blur();
  if (document.activeElement && typeof document.activeElement.blur === "function") {
    document.activeElement.blur();
  }
  toast(
    tr(
      state.mode === "paint"
        ? "toast.paintStart"
        : state.mode === "fill"
          ? "toast.fillStart"
          : state.mode === "poem"
            ? "toast.poemStart"
            : "toast.start",
    ),
  );
  events.emit("game:started", { mode: state.mode });
}

function endGame() {
  if (state.phase === "over") return;
  roundStartToken += 1;
  state.phase = "over";
  syncPhaseClass();
  stopPoemListenAll(true);
  hideMicTip();
  cancelMeteor();
  stopHelpSpeech();
  clearFocus();
  stopSpeech();
  setAmbientRunning(false);
  cancelAnimationFrame(state.raf);
  state.raf = 0;
  hidePraise();
  if (els.pauseBtn) els.pauseBtn.disabled = true;
  updatePauseButton();

  const isRecord = state.score > state.highScore;
  state.newRecord = isRecord;
  if (isRecord) {
    state.highScore = state.score;
    setHighScore(state.highScore);
  }

  unlockCurrentRoundPet();
  finishProfileRound();
  renderOverPanel();
  renderBestLine();
  updateHUD(true);
  updateMicUI();
  showPanel(els.overPanel);
  playOver();
  events.emit("game:over", { mode: state.mode, score: state.score });
}

function pauseGame() {
  if (state.phase !== "playing") return;
  state.phase = "paused";
  syncPhaseClass();
  stopPoemListenAll(true);
  hideMicTip();
  cancelAnimationFrame(state.raf);
  state.raf = 0;
  stopHelpSpeech();
  clearFocus();
  stopSpeech();
  setAmbientRunning(false);
  playPause();
  updatePauseButton();
  updateMicUI();
  showPanel(els.pausePanel);
}

function resumeGame() {
  if (state.phase !== "paused") return;
  state.phase = "playing";
  syncPhaseClass();
  hideOverlay();
  setAmbientRunning(true);
  playResume();
  updatePauseButton();
  state.lastFrame = 0;
  state.raf = requestAnimationFrame(frame);
  if (state.micEnabled) startSpeech();
  updateMicUI();
  if (els.typeInput) els.typeInput.blur();
}

function goHome() {
  roundStartToken += 1;
  const wasRound = state.phase === "playing" || state.phase === "paused";
  if (wasRound) finishProfileRound();
  state.phase = "menu";
  syncPhaseClass();
  stopPoemListenAll(true);
  hideMicTip();
  stopSpeech();
  setAmbientRunning(false);
  resetGame();
  if (els.pauseBtn) els.pauseBtn.disabled = true;
  updatePauseButton();
  renderBestLine();
  updateMicUI();
  showPanel(els.startPanel);
}

function togglePause() {
  if (state.phase === "playing") pauseGame();
  else if (state.phase === "paused") resumeGame();
}

function toggleMute() {
  state.muted = !state.muted;
  setMuted(state.muted);
  updateMuteUI();
  if (!state.muted) tone(760, 0.09, "triangle", 0.03);
}

function handleTyped(event) {
  event.preventDefault();
  if (!els.typeInput) return;
  const value = els.typeInput.value.trim();
  if (!value) return;
  if (state.phase !== "playing") {
    const message =
      state.phase === "paused"
        ? tr("toast.continueFirst")
        : state.phase === "over"
          ? tr("toast.gameOverFirst")
          : tr("toast.startFirst");
    toast(message, "warn");
    return;
  }
  const hit = findMatch(value);
  if (hit) {
    els.typeInput.value = "";
    resolveSpeechHit(hit);
  } else {
    els.typeInput.classList.remove("wrong");
    void els.typeInput.offsetWidth;
    els.typeInput.classList.add("wrong");
    if (state.mode === "poem") {
      showHeard(tr("poem.toast.noMatch"), "book");
    } else {
      showHeard(tr("toast.notOnScreen", { word: value }));
    }
    window.setTimeout(() => {
      if (els.typeInput) els.typeInput.classList.remove("wrong");
    }, 320);
  }
}

function refreshLanguage() {
  updateModeUI();
  updateHUD(true);
  updateMicUI();
  updatePauseButton();
  updateMuteUI();
  renderBestLine();
  renderPlayerUI();
  renderPlayerList();
  renderBoard();
  renderAvatarPicker();
  syncPlayerFormMode();
  renderCategoryOptions();
  updatePackUI();
  updateCustomPackUI();
  updateSpeedUI();
  updateThemeUI();
  updateSpeechNote();
  refreshVoiceCatalog();
  renderPoetrySummary();
  if (isPoetrySheetOpen()) renderPoetryLibrary();
  renderPetCollectionButton();
  if (isPetSheetOpen()) renderPetGrid();
  if (state.phase === "over") renderOverPanel();
}

function handleResize() {
  if (!els.field) return;
  const fieldW = els.field.clientWidth;
  const fieldH = els.field.clientHeight;
  if (!fieldW || !fieldH) return;

  if (state.mode === "paint") {
    redrawPaintCanvas();
  }

  if (state.physics) {
    rebuildPhysicsWalls(fieldW, fieldH);
    clampPhysicsBodies(fieldW, fieldH);
    wakePhysicsPile();
    syncPhysicsPile();
  } else if (state.lastFieldH && Math.abs(fieldH - state.lastFieldH) > 4) {
    const ratio = fieldH / state.lastFieldH;
    for (const s of state.settled) {
      s.y = Math.max(0, fieldH - (state.lastFieldH - s.y) * ratio);
      const rot = typeof s.rot === "number" ? ` rotate(${s.rot.toFixed(2)}deg)` : "";
      if (s.el) s.el.style.transform = `translate3d(${s.x}px, ${s.y}px, 0)${rot}`;
    }
  }
  if (state.lastFieldH && Math.abs(fieldH - state.lastFieldH) > 4) {
    for (const w of state.words) {
      w.y = Math.min(w.y, fieldH - w.h);
      if (w.el) w.el.style.transform = `translate3d(${w.x}px, ${w.y}px, 0)`;
    }
  }
  for (const word of state.words) {
    if (word.x + word.w > fieldW - 4) {
      word.x = Math.max(PAD, fieldW - word.w - PAD);
      if (word.el) word.el.style.transform = `translate3d(${word.x}px, ${word.y}px, 0)`;
    }
  }
  state.lastFieldW = fieldW;
  state.lastFieldH = fieldH;
  updateHUD(true);
}

function showMicTip() {
  if (!els.micTip) return;
  els.micTip.textContent = tr("mic.noSpeechTip");
  els.micTip.classList.remove("is-hidden");
}

function hideMicTip() {
  if (!els.micTip) return;
  els.micTip.classList.add("is-hidden");
}

function handleBackupExport() {
  const json = exportBackupJson();
  const blob = new Blob([json], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "piupiu-backup.json";
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  if (els.backupStatus) els.backupStatus.textContent = tr("setup.backupExport");
}

async function handleBackupImport(file) {
  if (!file) return;
  try {
    const text = await file.text();
    const res = importBackupJson(text);
    if (!res || !res.ok) {
      if (els.backupStatus) els.backupStatus.textContent = tr("setup.backupError");
      toast(tr("setup.backupError"), "warn");
      return;
    }
    loadPlayerState();
    loadPackSelection();
    applyTheme(getTheme("candy"));
    const savedSpeed = getSpeed("normal");
    state.speed = SPEED_LEVELS[savedSpeed] ? savedSpeed : "normal";
    const savedMode = getMode("rain");
    state.mode = GAME_MODES.includes(savedMode) ? savedMode : "rain";
    loadVoiceChoice();
    if (window.PiuI18n && typeof window.PiuI18n.setLang === "function") {
      const savedLang = getLang("");
      if (savedLang) window.PiuI18n.setLang(savedLang);
    }
    refreshLanguage();
    renderPetCollectionButton();
    if (isPetSheetOpen()) renderPetGrid();
    if (els.backupStatus) els.backupStatus.textContent = tr("setup.backupSuccess");
    toast(tr("setup.backupSuccess"));
  } catch {
    if (els.backupStatus) els.backupStatus.textContent = tr("setup.backupError");
    toast(tr("setup.backupError"), "warn");
  } finally {
    if (els.backupFile) els.backupFile.value = "";
  }
}

function registerBridges() {
  const sharedHooks = {
    updateHUD,
    pulseCombo,
    advanceRewardProgress,
    toast,
    showHeard,
    showPraise,
    addProfilePoints,
    endGame,
    goHome,
    renderOverPanel,
    updatePackUI,
    renderCustomNotice,
    updateCustomPackUI,
    renderPoetrySummary,
    renderPoetryLibrary,
    poetryStatus,
    onNoSpeech(streak) {
      if (streak >= 2) showMicTip();
      else hideMicTip();
    },
    onSpeechActive() {
      hideMicTip();
    },
    onProfileChanged() {
      state.categories = buildCategories();
      updatePackUI();
      renderPetCollectionButton();
      if (isPetSheetOpen()) renderPetGrid();
    },
  };
  state.uiHooks = Object.assign(state.uiHooks || {}, sharedHooks);
  setPackUiBridge(sharedHooks);
  setSpeechUiBridge(sharedHooks);
  initFx(sharedHooks);
}

function bindEvents() {
  if (eventsBound) return;
  eventsBound = true;

  if (els.startBtn) els.startBtn.addEventListener("click", () => startGame());
  if (els.restartBtn) els.restartBtn.addEventListener("click", () => startGame());
  for (const button of els.modeOptions || []) {
    button.addEventListener("click", () => setMode(button.dataset.mode));
  }
  if (els.resumeBtn) els.resumeBtn.addEventListener("click", resumeGame);
  if (els.quitBtn) els.quitBtn.addEventListener("click", goHome);
  if (els.homeBtn) els.homeBtn.addEventListener("click", goHome);
  if (els.pauseBtn) els.pauseBtn.addEventListener("click", togglePause);
  if (els.muteBtn) els.muteBtn.addEventListener("click", toggleMute);
  if (els.micBtn) els.micBtn.addEventListener("click", toggleMic);
  if (els.typeForm) els.typeForm.addEventListener("submit", handleTyped);
  if (els.categorySelect) els.categorySelect.addEventListener("change", onCategoryChange);
  if (els.levelSelect) els.levelSelect.addEventListener("change", onLevelChange);
  if (els.voiceSelect) {
    els.voiceSelect.addEventListener("change", () => onVoiceChange(els.voiceSelect.value));
  }
  if (els.voicePreview) {
    els.voicePreview.addEventListener("click", () => {
      window.clearTimeout(state.voicePreviewTimer);
      state.voicePreviewTimer = 0;
      previewVoice();
    });
  }

  if (els.startMascot) {
    els.startMascot.addEventListener("pointerdown", () => {
      mascotTaps += 1;
      window.clearTimeout(mascotTapTimer);
      if (mascotTaps >= 5) {
        mascotTaps = 0;
        playSecret();
        els.startMascot.classList.add("is-secret");
        if (els.secretNote) {
          els.secretNote.classList.add("show");
          els.secretNote.setAttribute("aria-hidden", "false");
        }
        window.setTimeout(() => els.startMascot?.classList.remove("is-secret"), 900);
        window.setTimeout(() => {
          if (els.secretNote) {
            els.secretNote.classList.remove("show");
            els.secretNote.setAttribute("aria-hidden", "true");
          }
        }, 2800);
      } else {
        mascotTapTimer = window.setTimeout(() => {
          mascotTaps = 0;
        }, 1200);
      }
    });
  }

  if (els.playerBtn) els.playerBtn.addEventListener("click", openPlayerSheet);
  if (els.playerClose) els.playerClose.addEventListener("click", closePlayerSheet);
  if (els.playerDone) els.playerDone.addEventListener("click", closePlayerSheet);
  if (els.playerForm) els.playerForm.addEventListener("submit", createPlayerFromForm);
  if (els.guestRenameForm) els.guestRenameForm.addEventListener("submit", handleGuestRename);
  if (els.homePlayerChips) {
    els.homePlayerChips.addEventListener("click", (event) => {
      const Profiles = window.PiuProfiles || null;
      const target = event.target;
      const btn =
        target && typeof target.closest === "function"
          ? target.closest("[data-switch-player], [data-player-id]")
          : null;
      if (!btn || !Profiles) return;
      const id = btn.dataset.switchPlayer || btn.dataset.playerId;
      const profile = Profiles.find(state.profiles, id);
      if (profile) selectProfile(profile, { close: false });
    });
  }
  if (els.playerList) {
    els.playerList.addEventListener("click", (event) => {
      const Profiles = window.PiuProfiles || null;
      const target = event.target;
      if (!target || typeof target.closest !== "function") return;
      const remove = target.closest("[data-delete-player]");
      if (remove) {
        deleteProfile(
          Profiles ? Profiles.find(state.profiles, remove.dataset.deletePlayer) : null,
          remove,
        );
        return;
      }
      const edit = target.closest("[data-edit-player]");
      if (edit) {
        startAvatarEdit(Profiles ? Profiles.find(state.profiles, edit.dataset.editPlayer) : null);
        return;
      }
      const pick = target.closest("[data-select-player]");
      if (pick) {
        selectProfile(Profiles ? Profiles.find(state.profiles, pick.dataset.selectPlayer) : null);
      }
    });
  }
  if (els.petCollectionBtn) els.petCollectionBtn.addEventListener("click", openPetSheet);
  if (els.petClose) els.petClose.addEventListener("click", closePetSheet);
  if (els.petDone) els.petDone.addEventListener("click", closePetSheet);
  if (els.missedList) {
    els.missedList.addEventListener("click", (event) => {
      const target = event.target;
      const chip =
        target && typeof target.closest === "function"
          ? target.closest("[data-speak-word]")
          : null;
      if (!chip) return;
      speakHelp(chip.dataset.speakWord);
    });
  }
  if (els.practiceMissedBtn) {
    els.practiceMissedBtn.addEventListener("click", () => {
      const uniqueMissed = [...new Set(state.missedWords)];
      if (!uniqueMissed.length) return;
      state.practiceWords = uniqueMissed;
      startGame({ keepPractice: true });
    });
  }
  if (els.overNextPoemBtn) {
    els.overNextPoemBtn.addEventListener("click", () => {
      nextPoetryPoem();
      startGame();
    });
  }
  if (els.avatarEditCancel) {
    els.avatarEditCancel.addEventListener("click", () => cancelAvatarEdit());
  }
  if (els.avatarPicker) {
    els.avatarPicker.addEventListener("click", (event) => {
      const target = event.target;
      if (!target || typeof target.closest !== "function") return;
      const choice = target.closest("[data-avatar]");
      if (!choice) return;
      setSelectedAvatar(choice.dataset.avatar);
      for (const button of els.avatarPicker.querySelectorAll(".avatar-choice")) {
        const active = button.dataset.avatar === choice.dataset.avatar;
        button.classList.toggle("is-selected", active);
        button.setAttribute("aria-checked", String(active));
      }
    });
  }

  if (els.boardBtn) els.boardBtn.addEventListener("click", openBoard);
  if (els.overBoardBtn) els.overBoardBtn.addEventListener("click", openBoard);
  if (els.boardClose) els.boardClose.addEventListener("click", closeBoard);
  if (els.boardDone) els.boardDone.addEventListener("click", closeBoard);
  if (els.boardSheet) {
    els.boardSheet.addEventListener("click", (event) => {
      if (event.target === els.boardSheet) closeBoard();
    });
  }

  if (els.packBtn) els.packBtn.addEventListener("click", openPack);
  if (els.packClose) els.packClose.addEventListener("click", closePack);
  if (els.packDone) els.packDone.addEventListener("click", closePack);
  if (els.packSearch) els.packSearch.addEventListener("input", onPackSearchInput);
  if (els.packTabs) {
    els.packTabs.addEventListener("click", (event) => {
      const target = event.target;
      const tab =
        target && typeof target.closest === "function"
          ? target.closest("[data-pack-group]")
          : null;
      if (tab) handlePackGroupSwitch(tab.dataset.packGroup);
    });
  }
  if (els.packCategoryGrid) {
    els.packCategoryGrid.addEventListener("click", (event) => {
      const target = event.target;
      const card =
        target && typeof target.closest === "function"
          ? target.closest("[data-category-id]")
          : null;
      if (card) {
        handlePackCategorySelect(card.dataset.categoryId);
      }
    });
  }
  if (els.customPackChoose) {
    els.customPackChoose.addEventListener("click", () => {
      if (els.customPackFile) els.customPackFile.click();
    });
  }
  if (els.customPackFile) els.customPackFile.addEventListener("change", onCustomFileChange);
  if (els.customPackName) {
    els.customPackName.addEventListener("keydown", (event) => {
      if (event.key !== "Enter") return;
      event.preventDefault();
      createCustomPackFromFile();
    });
  }
  if (els.customPackCreate) els.customPackCreate.addEventListener("click", createCustomPackFromFile);
  if (els.customPackList) els.customPackList.addEventListener("click", onCustomPackListClick);
  if (els.packSheet) {
    els.packSheet.addEventListener("click", (event) => {
      if (event.target === els.packSheet) closePack();
    });
  }

  if (els.poetryBtn) els.poetryBtn.addEventListener("click", openPoetrySheet);
  if (els.poetryClose) els.poetryClose.addEventListener("click", closePoetrySheet);
  if (els.poetryDone) {
    els.poetryDone.addEventListener("click", () => {
      closePoetrySheet();
    });
  }
  if (els.overPoetryBtn) els.overPoetryBtn.addEventListener("click", openPoetrySheet);
  if (els.poetrySheet) {
    els.poetrySheet.addEventListener("click", (event) => {
      if (event.target === els.poetrySheet) closePoetrySheet();
    });
  }
  if (els.poetryTabs) {
    els.poetryTabs.addEventListener("click", (event) => {
      const target = event.target;
      const tab =
        target && typeof target.closest === "function"
          ? target.closest("[data-poetry-category]")
          : null;
      if (tab) setPoetryCategory(tab.dataset.poetryCategory);
    });
  }
  if (els.poetryList) {
    els.poetryList.addEventListener("click", (event) => {
      const target = event.target;
      const item =
        target && typeof target.closest === "function"
          ? target.closest("[data-poem-id]")
          : null;
      if (item) selectPoetryPoem(item.dataset.poemId);
    });
  }
  if (els.poetrySearch) els.poetrySearch.addEventListener("input", renderPoetryList);
  if (els.poetryShuffle) els.poetryShuffle.addEventListener("click", shufflePoetryPoem);
  if (els.poetryImport) {
    els.poetryImport.addEventListener("click", () => {
      if (els.poetryFile) els.poetryFile.click();
    });
  }
  if (els.poetryFile) {
    els.poetryFile.addEventListener("change", () => {
      importPoetryFile(els.poetryFile.files && els.poetryFile.files[0]);
    });
  }

  if (els.setupBtn) els.setupBtn.addEventListener("click", openSetup);
  if (els.setupClose) els.setupClose.addEventListener("click", closeSetup);
  if (els.setupDone) els.setupDone.addEventListener("click", closeSetup);
  if (els.backupExportBtn) els.backupExportBtn.addEventListener("click", handleBackupExport);
  if (els.backupImportBtn) {
    els.backupImportBtn.addEventListener("click", () => {
      if (els.backupFile) els.backupFile.click();
    });
  }
  if (els.backupFile) {
    els.backupFile.addEventListener("change", () => {
      handleBackupImport(els.backupFile.files && els.backupFile.files[0]);
    });
  }
  if (els.setupSheet) {
    els.setupSheet.addEventListener("click", (event) => {
      if (event.target === els.setupSheet) closeSetup();
    });
  }

  if (els.diffGroup) {
    els.diffGroup.querySelectorAll("[data-level]").forEach((button) => {
      button.addEventListener("click", () => onDifficultyClick(button));
    });
  }
  if (els.speedBtn) els.speedBtn.addEventListener("click", cycleSpeed);
  if (els.themeGroup) {
    els.themeGroup.addEventListener("click", (event) => {
      const target = event.target;
      if (!target || typeof target.closest !== "function") return;
      const choice = target.closest("[data-theme-choice]");
      if (choice) setTheme(choice.dataset.themeChoice);
    });
  }

  window.addEventListener("keydown", (event) => {
    const target = event.target;
    const typing = target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA");
    const anyDialogOpen =
      isPlayerSheetOpen() ||
      isBoardSheetOpen() ||
      isPackSheetOpen() ||
      isSetupSheetOpen() ||
      isPoetrySheetOpen() ||
      isPetSheetOpen() ||
      Boolean(document.querySelector("dialog[open]"));
    if (anyDialogOpen) return;

    if (event.key === "Escape" || (event.key.toLowerCase() === "p" && !typing)) {
      if (state.phase === "playing" || state.phase === "paused") {
        event.preventDefault();
        togglePause();
      }
      return;
    }

    const rawInteractive =
      target && typeof target.closest === "function"
        ? target.closest("button, input, textarea, select, a, [contenteditable='true']")
        : null;
    const interactive =
      rawInteractive && rawInteractive.offsetParent !== null ? rawInteractive : null;
    if ((event.code === "Space" || event.key === " ") && state.phase === "playing" && !interactive) {
      event.preventDefault();
      triggerHelp();
      return;
    }

    if (
      event.key === "Enter" &&
      state.phase === "menu" &&
      !typing &&
      target &&
      target.tagName !== "BUTTON" &&
      target.tagName !== "SELECT"
    ) {
      event.preventDefault();
      startGame();
    }
  });

  if (els.field) {
    els.field.addEventListener("pointermove", (event) => {
      if (state.phase !== "playing") return;
      const rect = els.field.getBoundingClientRect();
      state.pointer = {
        x: Math.max(0, Math.min(rect.width, event.clientX - rect.left)),
        y: Math.max(0, Math.min(rect.height, event.clientY - rect.top)),
        at: performance.now(),
      };
    });
    els.field.addEventListener("pointerleave", () => {
      state.pointer = null;
    });
    els.field.addEventListener("pointerdown", (event) => {
      if (state.phase !== "playing") return;
      if (event.button !== undefined && event.button !== 0) return;
      const target = event.target;
      if (
        target &&
        typeof target.closest === "function" &&
        target.closest("button, input, textarea, select, a, .overlay, .fill-word, .word")
      ) {
        return;
      }
      const rect = els.field.getBoundingClientRect();
      const px = Math.max(0, Math.min(rect.width, event.clientX - rect.left));
      state.pointer = {
        x: px,
        y: Math.max(0, Math.min(rect.height, event.clientY - rect.top)),
        at: performance.now(),
      };
      petNuzzle(px);
      triggerHelp();
    });
  }

  document.addEventListener("visibilitychange", () => {
    if (document.hidden && state.phase === "playing") pauseGame();
  });
  document.addEventListener("piupiu:langchange", refreshLanguage);
  window.addEventListener("beforeunload", () => {
    stopHelpSpeech();
    stopSpeech();
  });
  window.addEventListener("resize", handleResize);

  bindRainEvents();
  bindFillEvents();
  bindPaintEvents();
  bindPoemEvents();
  initPetSystem();
}

function setupDebugApi() {
  if (!new URLSearchParams(location.search).has("debug")) return;
  const Pets = window.PiuPets || null;
  const Profiles = window.PiuProfiles || null;

  window.__PIU__ = {
    state,
    events,
    startGame,
    pauseGame,
    resumeGame,
    endGame,
    spawnWord,
    buildFillBoard,
    setMode,
    getMode: () => state.mode,
    getFill: () =>
      state.mode === "fill"
        ? {
            total: state.fillTotal,
            remaining: state.settled.length,
            cleared: state.cleared,
            bonus: state.fillBonus,
            finishing: state.fillFinishing,
            words: state.settled.map((s) => s.word),
          }
        : null,
    getPaint: () =>
      state.mode === "paint"
        ? {
            total: state.paintTotal,
            remaining: state.settled.length,
            cleared: state.cleared,
            bonus: state.paintBonus,
            finishing: state.paintFinishing,
            splats: state.paintSplats.length,
            words: state.settled.map((s) => s.word),
          }
        : null,
    settleWord,
    explodeWord,
    findMatch,
    goHome,
    refreshLanguage,
    triggerHelp,
    speakHelp,
    focusWord,
    clearFocus,
    lowestFallingWord,
    getSelectedPool,
    getProfiles: () =>
      state.profiles.map((profile) => ({
        id: profile.id,
        name: profile.name,
        avatar: profile.avatar,
        total: profile.total,
        best: profile.best,
        correct: profile.correct,
        rounds: profile.rounds,
      })),
    startMeteor,
    getMeteor: () =>
      state.meteor
        ? {
            x: state.meteor.x,
            y: state.meteor.y,
            bounces: state.meteor.bounces,
            edgeHits: { ...state.meteor.edgeHits },
            cleared: state.meteor.cleared,
            vx: state.meteor.vx,
            vy: state.meteor.vy,
          }
        : null,
    getTheme: () => state.theme,
    setTheme,
    getPet: () => (state.pet ? petInfo(state.pet) : null),
    getPets: () => state.pets.map(petInfo),
    getPetCatalog: () => (Pets ? Pets.PETS.map((pet) => ({ ...pet })) : []),
    getPetAccessories: () => (Pets ? Pets.ACCESSORIES.map((acc) => ({ ...acc })) : []),
    randomPet: () => (Pets ? Pets.random(state.lastPetId).id : PET_FALLBACK.id),
    setPet: (id) => {
      if (!Pets) return null;
      const def = Pets.byId(id);
      if (!def) return null;
      resetPets(def);
      return state.pet ? petInfo(state.pet) : null;
    },
    petStartle: (x) => petStartle(x == null ? (state.pet ? state.pet.x : 0) : x),
    petCheer: () => petCheer(),
    petNuzzle: (x) => petNuzzle(x == null ? (state.pet ? state.pet.x : 0) : x),
    petSqueak: () => {
      if (state.pet) petSqueak(state.pet, true);
    },
    getSpeed: () => state.speed,
    setSpeed: (key) => {
      if (!(key in SPEED_LEVELS)) return state.speed;
      const previous = state.speed;
      state.speed = key;
      setSpeed(key);
      applyFallingSpeed(previous, key);
      updateSpeedUI();
      return state.speed;
    },
    getActiveProfile: () => {
      const profile = currentProfile();
      return profile ? { ...profile } : null;
    },
    selectPlayer: (id) => selectProfile(Profiles ? Profiles.find(state.profiles, id) : null),
    createPlayer: (name, avatar) => {
      if (avatar) setSelectedAvatar(avatar);
      if (els.playerNameInput) els.playerNameInput.value = name == null ? "" : String(name);
      createPlayerFromForm(null);
      return currentProfile();
    },
    deletePlayer: (id) => deleteProfile(Profiles ? Profiles.find(state.profiles, id) : null),
    openPlayerSheet,
    closePlayerSheet,
    openBoard,
    closeBoard,
    getPack: () => ({
      category: state.categoryId,
      difficulty: state.difficulty,
      band: state.band,
      count: state.pool.length,
      pool: state.pool.slice(),
    }),
    getCategories: () =>
      state.categories.map((category) => ({
        id: category.id,
        nameKey: category.nameKey,
        education: Boolean(category.education),
        group: category.group || (category.education ? "education" : "themes"),
        counts: category.levels
          ? {
              1: (category.levels[1] || []).length,
              2: (category.levels[2] || []).length,
              3: (category.levels[3] || []).length,
            }
          : null,
        bands: category.bands
          ? category.bands.map((band) => ({
              id: band.id,
              labelKey: band.labelKey,
              count: (band.words || []).length,
            }))
          : null,
      })),
    getSpeechStats,
    getFalling: () =>
      state.words.map((w) => ({
        word: w.word,
        x: w.x,
        y: w.y,
        w: w.w,
        h: w.h,
        emoji: w.emoji,
        showEmoji: w.showEmoji,
        golden: Boolean(w.golden),
      })),
    updateWordFace,
    getSettled: () =>
      state.settled.map((s) => ({
        word: s.word,
        x: s.x,
        y: s.y,
        w: s.w,
        h: s.h,
        angle: s.body ? s.body.angle : 0,
        sleeping: s.body ? Boolean(s.body.isSleeping) : true,
      })),
    getPhysics: () =>
      state.physics
        ? {
            bodies: state.physics.engine.world.bodies.length,
            settled: state.settled.length,
            awake: state.settled.filter((s) => s.body && !s.body.isSleeping).length,
            gravity: state.physics.engine.gravity.y,
          }
        : null,
  };
}

function init() {
  initEls();
  registerBridges();
  bindEvents();
  setupDebugApi();

  syncPhaseClass();
  loadPackSelection();
  if (!(state.speed in SPEED_LEVELS)) state.speed = "normal";
  if (!THEMES.includes(state.theme)) state.theme = "candy";
  if (!GAME_MODES.includes(state.mode)) state.mode = "rain";

  applyTheme(state.theme);
  updateModeUI();
  scatterPlaySteps();
  renderCategoryOptions();
  updatePackUI();
  state.packGroup = packGroupForCategory(getSelectedCategory());
  renderPackTabs();
  renderPackCategoryGrid();

  if (window.PiuCustomPacks) {
    renderCustomPackList();
    updateCustomPackUI();
  } else if (els.customPackSection) {
    els.customPackSection.classList.add("is-hidden");
  }

  if (state.mode === "poem") {
    loadPoetryLibrary().catch(() => {});
  }

  updateSpeedUI();
  renderBestLine();
  loadPlayerState();
  updateMuteUI();

  if (!getWordBank().length) {
    console.error("PiuPiu: word bank failed to load");
    toast(tr("toast.wordBank"), "warn");
    updateMicUI();
    updatePauseButton();
    return;
  }

  if (SpeechRec) {
    setupSpeech();
  } else {
    state.micEnabled = false;
  }
  updateSpeechNote();
  setupHelp();

  if (els.field) {
    state.lastFieldW = els.field.clientWidth;
    state.lastFieldH = els.field.clientHeight;
  }
  resetRewardProgress();
  updateHUD(true);
  updateMicUI();
  updatePauseButton();
  maybeShowIntro();
  maybeShowPlayerPicker();
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init, { once: true });
} else {
  init();
}
