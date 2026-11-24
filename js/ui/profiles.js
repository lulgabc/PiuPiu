import {
  state,
  els,
  STORAGE_KEYS,
  tr,
  formatNumber,
  setText,
  setStarValue,
  iconSvg,
} from "../core/state.js";
import { setHighScore, clearHighScore, getJson, setJson } from "../core/storage.js";
import { events } from "../core/events.js";
import { toast } from "./feedback.js";
import {
  openDialogModal,
  closeDialogModal,
  isDialogOpen,
  armOrConfirmDelete,
  clearArmedDelete,
} from "./dialogs.js";
import { renderPetCollectionButton } from "./pets-ui.js";

function getProfilesApi() {
  const g = typeof window !== "undefined" ? window : globalThis;
  return g && g.PiuProfiles && typeof g.PiuProfiles.load === "function" ? g.PiuProfiles : null;
}

let selectedAvatar = "🦊";
let editingProfileId = "";

export function getSelectedAvatar() {
  return selectedAvatar;
}

export function setSelectedAvatar(avatar) {
  const Profiles = getProfilesApi();
  if (Profiles && Profiles.AVATARS.includes(avatar)) {
    selectedAvatar = avatar;
  }
}

export function currentProfile() {
  const Profiles = getProfilesApi();
  return Profiles ? Profiles.find(state.profiles, state.userId) : null;
}

export function isPlayerSheetOpen() {
  return isDialogOpen(els.playerSheet);
}

export function isBoardSheetOpen() {
  return isDialogOpen(els.boardSheet);
}

function createGuestProfile() {
  const Profiles = getProfilesApi();
  if (!Profiles) return null;
  const baseName = tr("player.guestName") || "Player";
  const result = Profiles.create(state.profiles, baseName, Profiles.AVATARS[0], {
    best: state.pendingLegacyBest,
    isGuest: true,
  });
  if (result.profile) {
    state.pendingLegacyBest = 0;
    state.userId = result.profile.id;
    Profiles.save(state.profiles);
    Profiles.setActiveId(result.profile.id);
    return result.profile;
  }
  return null;
}

function cleanupOrphanedProfileData(profileId) {
  if (!profileId) return;
  for (const key of [STORAGE_KEYS.srs, STORAGE_KEYS.pets]) {
    const store = getJson(key, null);
    if (store && typeof store === "object" && Object.hasOwn(store, profileId)) {
      delete store[profileId];
      setJson(key, store);
    }
  }
}

export function renderBestLine() {
  if (!els.bestLine || !els.bestLineValue) return;
  const score = formatNumber(state.highScore);
  const label = tr("start.bestLabel", { score });
  setText(els.bestLineValue, score);
  els.bestLine.setAttribute("aria-label", label);
  els.bestLine.setAttribute("title", label);
}

export function renderHomePlayerChips() {
  const Profiles = getProfilesApi();
  if (!els.homePlayerChips || !Profiles) return;
  const list = Profiles.rank(state.profiles);
  if (list.length < 2) {
    els.homePlayerChips.classList.add("is-hidden");
    els.homePlayerChips.replaceChildren();
    return;
  }
  els.homePlayerChips.classList.remove("is-hidden");
  els.homePlayerChips.replaceChildren();
  for (const profile of list) {
    const chip = document.createElement("button");
    chip.type = "button";
    chip.className =
      profile.id === state.userId ? "home-player-chip is-active" : "home-player-chip";
    chip.dataset.switchPlayer = profile.id;
    chip.dataset.playerId = profile.id;
    chip.setAttribute("aria-pressed", String(profile.id === state.userId));
    chip.textContent = `${profile.avatar} ${profile.name}`;
    els.homePlayerChips.appendChild(chip);
  }
}

export function renderGuestRenameBanner() {
  if (!els.guestRenameBanner) return;
  const profile = currentProfile();
  const show = Boolean(profile && profile.isGuest && state.phase === "over");
  els.guestRenameBanner.classList.toggle("is-hidden", !show);
  if (show && els.guestRenameInput && !els.guestRenameInput.value) {
    els.guestRenameInput.placeholder = tr("player.renamePlaceholder");
  }
}

export function handleGuestRename(event) {
  if (event) event.preventDefault();
  const Profiles = getProfilesApi();
  const profile = currentProfile();
  if (!Profiles || !profile || !els.guestRenameInput) return false;
  const cleaned = Profiles.sanitizeName(els.guestRenameInput.value);
  if (!cleaned) {
    els.guestRenameInput.focus();
    return false;
  }
  const duplicate = state.profiles.some(
    (item) => item.id !== profile.id && item.name.toLocaleLowerCase() === cleaned.toLocaleLowerCase(),
  );
  if (duplicate) {
    toast(tr("player.errorDuplicate"), "warn");
    els.guestRenameInput.focus();
    return false;
  }
  profile.name = cleaned;
  delete profile.isGuest;
  profile.updatedAt = Date.now();
  Profiles.save(state.profiles);
  els.guestRenameInput.value = "";
  renderPlayerUI();
  renderPlayerList();
  renderBoard();
  renderGuestRenameBanner();
  toast(tr("player.created", { name: profile.name }));
  return true;
}

export function renderAvatarPicker() {
  const Profiles = getProfilesApi();
  if (!els.avatarPicker || !Profiles) return;
  els.avatarPicker.replaceChildren();
  for (const avatar of Profiles.AVATARS) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = avatar === selectedAvatar ? "avatar-choice is-selected" : "avatar-choice";
    button.dataset.avatar = avatar;
    button.textContent = avatar;
    button.setAttribute("role", "radio");
    button.setAttribute("aria-checked", String(avatar === selectedAvatar));
    button.setAttribute("aria-label", avatar);
    els.avatarPicker.appendChild(button);
  }
}

export function renderPlayerList() {
  const Profiles = getProfilesApi();
  if (!els.playerList || !Profiles) return;
  clearArmedDelete();
  els.playerList.replaceChildren();
  for (const profile of Profiles.rank(state.profiles)) {
    const row = document.createElement("div");
    row.className = profile.id === state.userId ? "player-option is-current" : "player-option";

    const main = document.createElement("button");
    main.type = "button";
    main.className = "player-option-main";
    main.dataset.selectPlayer = profile.id;

    const avatar = document.createElement("span");
    avatar.className = "player-option-avatar";
    avatar.setAttribute("aria-hidden", "true");
    avatar.textContent = profile.avatar;

    const text = document.createElement("span");
    text.className = "player-option-text";
    const name = document.createElement("span");
    name.className = "player-option-name";
    name.textContent = profile.name;
    const meta = document.createElement("span");
    meta.className = "player-option-meta";
    meta.textContent = `${tr("board.best", { score: formatNumber(profile.best) })} · ${tr("board.correct", { count: formatNumber(profile.correct) })}`;
    text.append(name, meta);

    const total = document.createElement("span");
    total.className = "player-option-total";
    setStarValue(total, profile.total);

    main.append(avatar, text, total);
    if (profile.id === state.userId) {
      const badge = document.createElement("span");
      badge.className = "player-option-current";
      badge.textContent = tr("player.current");
      main.appendChild(badge);
    }

    row.appendChild(main);

    const actions = document.createElement("div");
    actions.className = "player-row-actions";

    const edit = document.createElement("button");
    edit.type = "button";
    edit.className = "player-option-edit";
    edit.dataset.editPlayer = profile.id;
    edit.replaceChildren(iconSvg("pencil"));
    edit.setAttribute("aria-label", `${tr("player.editAvatar")} ${profile.name}`);
    edit.title = tr("player.editAvatar");
    actions.appendChild(edit);

    const remove = document.createElement("button");
    remove.type = "button";
    remove.className = "player-option-delete";
    remove.dataset.deletePlayer = profile.id;
    remove.replaceChildren(iconSvg("close"));
    remove.setAttribute("aria-label", `${tr("player.delete")} ${profile.name}`);
    remove.title = tr("player.delete");
    actions.appendChild(remove);

    row.appendChild(actions);
    els.playerList.appendChild(row);
  }
}

export function renderBoard() {
  const Profiles = getProfilesApi();
  if (!els.boardList || !Profiles) return;
  const ranked = Profiles.rank(state.profiles);
  els.boardList.replaceChildren();
  if (els.boardEmpty) els.boardEmpty.classList.toggle("is-hidden", ranked.length > 0);

  ranked.forEach((profile, index) => {
    const row = document.createElement("li");
    row.className = profile.id === state.userId ? "board-row is-current" : "board-row";

    const rank = document.createElement("span");
    rank.className = "board-rank";
    if (index < 3) {
      rank.classList.add("board-rank-icon", `rank-${index + 1}`);
      rank.replaceChildren(iconSvg("medal"));
    } else {
      rank.textContent = String(index + 1);
    }

    const avatar = document.createElement("span");
    avatar.className = "board-row-avatar";
    avatar.setAttribute("aria-hidden", "true");
    avatar.textContent = profile.avatar;

    const text = document.createElement("span");
    text.className = "board-row-text";
    const name = document.createElement("span");
    name.className = "board-row-name";
    name.textContent = profile.name;
    if (profile.id === state.userId) {
      const me = document.createElement("span");
      me.className = "board-me";
      me.textContent = tr("player.current");
      name.appendChild(me);
    }
    const meta = document.createElement("span");
    meta.className = "board-row-meta";
    meta.textContent = `${tr("board.best", { score: formatNumber(profile.best) })} · ${tr("board.correct", { count: formatNumber(profile.correct) })}`;
    text.append(name, meta);

    const total = document.createElement("span");
    total.className = "board-row-total";
    setStarValue(total, profile.total);

    row.setAttribute(
      "aria-label",
      `${profile.name}: ${tr("board.total", { score: formatNumber(profile.total) })}, ${tr("board.best", { score: formatNumber(profile.best) })}, ${tr("board.correct", { count: formatNumber(profile.correct) })}${profile.id === state.userId ? `, ${tr("player.current")}` : ""}`,
    );

    row.append(rank, avatar, text, total);
    els.boardList.appendChild(row);
  });
}

export function renderPlayerUI() {
  if (!els.playerBtn) return;
  const profile = currentProfile();
  setText(els.playerAvatar, profile ? profile.avatar : "＋");
  setText(els.playerName, profile ? profile.name : tr("player.none"));
  setText(els.playerTotal, profile ? formatNumber(profile.total) : "");
  const label = profile
    ? tr("player.openAria", { name: profile.name, score: formatNumber(profile.total) })
    : tr("player.none");
  els.playerBtn.setAttribute("aria-label", label);
  els.playerBtn.setAttribute("title", label);
  els.playerBtn.classList.toggle("is-empty", !profile);
  if (profile) state.highScore = profile.best;
  renderBestLine();
  renderHomePlayerChips();
  renderPetCollectionButton();
}

export function updateSessionTotal() {
  if (!els.sessionTotal) return;
  const profile = currentProfile();
  setText(
    els.sessionTotal,
    profile ? tr("over.session", { score: formatNumber(profile.total) }) : "",
  );
}

export function updatePlayerTotals() {
  const profile = currentProfile();
  setText(els.playerTotal, formatNumber(profile ? profile.total : 0));
  if (isBoardSheetOpen()) renderBoard();
  if (state.phase === "over") updateSessionTotal();
}

export function addProfilePoints(points) {
  const Profiles = getProfilesApi();
  const profile = currentProfile();
  if (!profile || !Profiles) return;
  Profiles.addPoints(state.profiles, profile.id, points, 1);
  Profiles.save(state.profiles);
  updatePlayerTotals();
  events.emit("profile:pointsAdded", { profileId: profile.id, points, total: profile.total });
}

export function finishProfileRound() {
  if (!state.roundRecorded) return;
  state.roundRecorded = false;
  const Profiles = getProfilesApi();
  const profile = currentProfile();
  if (!profile || !Profiles) return;
  Profiles.finishRound(state.profiles, profile.id, state.score);
  Profiles.save(state.profiles);
  state.highScore = profile.best;
  setHighScore(profile.best);
  renderBestLine();
  updatePlayerTotals();
  events.emit("profile:roundFinished", { profileId: profile.id, score: state.score });
}

export function syncPlayerFormMode() {
  const Profiles = getProfilesApi();
  if (!els.playerForm) return;
  const profile =
    editingProfileId && Profiles ? Profiles.find(state.profiles, editingProfileId) : null;
  const editing = Boolean(profile);
  els.playerForm.classList.toggle("is-editing", editing);
  setText(els.playerFormTitle, editing ? tr("player.editTitle") : tr("player.createTitle"));
  if (els.avatarEditNote) els.avatarEditNote.classList.toggle("is-hidden", !editing);
  if (editing) setText(els.avatarEditText, tr("player.editingAvatar", { name: profile.name }));
  if (els.playerSubmitLabel) {
    els.playerSubmitLabel.textContent = editing ? tr("player.saveAvatar") : tr("player.create");
  }
  if (els.playerNameInput) {
    els.playerNameInput.disabled = false;
    if (editing) els.playerNameInput.value = profile.name;
  }
}

export function cancelAvatarEdit({ clearInput = true } = {}) {
  const Profiles = getProfilesApi();
  editingProfileId = "";
  if (Profiles) selectedAvatar = Profiles.AVATARS[state.profiles.length % Profiles.AVATARS.length];
  if (clearInput && els.playerNameInput) {
    els.playerNameInput.value = "";
    els.playerNameInput.disabled = false;
  }
  setText(els.playerError, "");
  renderAvatarPicker();
  syncPlayerFormMode();
}

export function startAvatarEdit(profile) {
  const Profiles = getProfilesApi();
  if (!profile || !Profiles) return;
  editingProfileId = profile.id;
  selectedAvatar = profile.avatar;
  setText(els.playerError, "");
  renderAvatarPicker();
  syncPlayerFormMode();
  window.setTimeout(() => {
    const selected =
      els.avatarPicker && els.avatarPicker.querySelector(".avatar-choice.is-selected");
    if (selected && isPlayerSheetOpen()) {
      selected.focus({ preventScroll: true });
    }
  }, 20);
}

export function saveAvatarEdit() {
  const Profiles = getProfilesApi();
  const profile = Profiles ? Profiles.find(state.profiles, editingProfileId) : null;
  if (!profile) {
    cancelAvatarEdit();
    return;
  }
  if (els.playerNameInput) {
    const rawName = els.playerNameInput.value.trim();
    if (rawName) {
      const cleanName =
        typeof Profiles.sanitizeName === "function"
          ? Profiles.sanitizeName(rawName)
          : rawName.slice(0, 12);
      if (cleanName) {
        const lower = cleanName.toLowerCase();
        const dup = state.profiles.some(
          (p) => p.id !== profile.id && String(p.name || "").trim().toLowerCase() === lower,
        );
        if (dup) {
          setText(els.playerError, tr("player.errorDuplicate"));
          els.playerNameInput.focus();
          return;
        }
        profile.name = cleanName;
        profile.isGuest = false;
      }
    }
  }
  profile.avatar = selectedAvatar;
  profile.updatedAt = Date.now();
  Profiles.save(state.profiles);
  if (profile.id === state.userId) renderPlayerUI();
  renderPlayerList();
  renderBoard();
  toast(tr("player.avatarSaved"));
  cancelAvatarEdit();
}

export function selectProfile(profile, { close = true } = {}) {
  const Profiles = getProfilesApi();
  if (!profile || !Profiles) return;
  if (editingProfileId) cancelAvatarEdit();
  state.userId = profile.id;
  Profiles.setActiveId(profile.id);
  state.highScore = profile.best;
  setHighScore(profile.best);
  renderPlayerUI();
  renderPlayerList();
  state.uiHooks?.onProfileChanged?.(profile.id);
  if (state.phase === "over") state.uiHooks?.renderOverPanel?.();
  if (close) closePlayerSheet();
  events.emit("profile:selected", { profileId: profile.id });
}

export function createPlayerFromForm(event) {
  if (event) event.preventDefault();
  const Profiles = getProfilesApi();
  if (!Profiles) return;
  if (editingProfileId) {
    saveAvatarEdit();
    return;
  }
  const result = Profiles.create(
    state.profiles,
    els.playerNameInput ? els.playerNameInput.value : "",
    selectedAvatar,
    { best: state.pendingLegacyBest },
  );
  if (result.error) {
    const key =
      result.error === "duplicate"
        ? "player.errorDuplicate"
        : result.error === "full"
          ? "player.errorFull"
          : "player.errorEmpty";
    setText(els.playerError, tr(key));
    if (els.playerNameInput) els.playerNameInput.focus();
    return;
  }

  state.pendingLegacyBest = 0;
  Profiles.save(state.profiles);
  selectedAvatar = Profiles.AVATARS[state.profiles.length % Profiles.AVATARS.length];
  if (els.playerNameInput) els.playerNameInput.value = "";
  setText(els.playerError, "");
  selectProfile(result.profile, { close: false });
  renderAvatarPicker();
  renderPlayerList();
  toast(tr("player.created", { name: result.profile.name }));
}

function executeDeleteProfile(profile) {
  const Profiles = getProfilesApi();
  if (!profile || !Profiles) return;
  if (editingProfileId === profile.id) cancelAvatarEdit();
  state.profiles = Profiles.remove(state.profiles, profile.id);
  cleanupOrphanedProfileData(profile.id);
  Profiles.save(state.profiles);

  if (state.userId === profile.id) {
    const next = Profiles.rank(state.profiles)[0] || null;
    if (next) {
      state.userId = next.id;
      Profiles.setActiveId(state.userId);
      state.highScore = next.best;
      setHighScore(next.best);
    } else {
      const guest = createGuestProfile();
      state.userId = guest ? guest.id : "";
      state.highScore = 0;
      clearHighScore();
    }
  }

  renderPlayerUI();
  renderPlayerList();
  renderBoard();
  toast(tr("player.deleted", { name: profile.name }));
}

export function deleteProfile(profile, triggerButton = null) {
  if (!profile) return;
  if (triggerButton) {
    armOrConfirmDelete(triggerButton, () => executeDeleteProfile(profile), "player.confirmDelete");
    return;
  }
  executeDeleteProfile(profile);
}

export function openPlayerSheet() {
  if (!els.playerSheet) return;
  cancelAvatarEdit();
  renderPlayerList();
  renderAvatarPicker();
  setText(els.playerError, "");
  openDialogModal(els.playerSheet, {
    opener: els.playerBtn,
    focusEl: !currentProfile() && els.playerNameInput ? els.playerNameInput : els.playerClose,
    onClose: () => setText(els.playerError, ""),
  });
}

export function closePlayerSheet() {
  closeDialogModal(els.playerSheet);
}

export function openBoard() {
  if (!els.boardSheet) return;
  renderBoard();
  openDialogModal(els.boardSheet, {
    opener: document.activeElement && document.activeElement !== document.body ? document.activeElement : els.boardBtn,
    focusEl: els.boardClose,
  });
}

export function closeBoard() {
  closeDialogModal(els.boardSheet);
}

export function loadPlayerState() {
  const Profiles = getProfilesApi();
  if (!Profiles) return;
  state.profiles = Profiles.load();
  state.userId = Profiles.getActiveId(state.profiles);

  if (!state.profiles.length) {
    createGuestProfile();
  } else if (!state.userId) {
    const first = Profiles.rank(state.profiles)[0];
    state.userId = first.id;
    Profiles.setActiveId(first.id);
  }

  const active = currentProfile();
  if (active) {
    state.highScore = active.best;
    setHighScore(active.best);
    selectedAvatar = Profiles.AVATARS[state.profiles.length % Profiles.AVATARS.length];
  } else if (state.highScore > 0) {
    state.pendingLegacyBest = state.highScore;
  }

  renderAvatarPicker();
  renderPlayerList();
  renderPlayerUI();
}

export function maybeShowPlayerPicker() {
  // Instant Play (F11): never auto-block first launch with a modal player picker.
}
