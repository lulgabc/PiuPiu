import { state, els, tr, setText } from "../core/state.js";
import { getPetCollection, unlockEncounteredPet } from "../core/storage.js";
import { playPetVoice } from "../systems/audio.js";
import { openDialogModal, closeDialogModal, isDialogOpen } from "./dialogs.js";

function getPetsCatalog() {
  const g = typeof window !== "undefined" ? window : globalThis;
  return g && g.PiuPets && Array.isArray(g.PiuPets.PETS) ? g.PiuPets : null;
}

function validPetIdSet() {
  const Pets = getPetsCatalog();
  if (!Pets) return new Set();
  return new Set(Pets.PETS.map((p) => p.id));
}

export function getSanitizedPetCollection(profileId = state.userId || "_guest") {
  const raw = getPetCollection(profileId);
  const valid = validPetIdSet();
  const clean = Object.create(null);
  for (const [id, entry] of Object.entries(raw || {})) {
    if (valid.size === 0 || valid.has(id)) {
      clean[id] = entry;
    }
  }
  return clean;
}

export function getUnlockedPetCount(profileId = state.userId || "_guest") {
  return Object.keys(getSanitizedPetCollection(profileId)).length;
}

export function renderPetCollectionButton() {
  const Pets = getPetsCatalog();
  const total = Pets ? Pets.PETS.length : 35;
  const count = Math.min(total, getUnlockedPetCount());
  if (els.petCollectionCount) {
    setText(els.petCollectionCount, `${count}/${total}`);
  }
  if (els.petCount) {
    setText(els.petCount, `${count} / ${total}`);
  }
  if (els.petCollectionBtn) {
    els.petCollectionBtn.setAttribute(
      "aria-label",
      `${tr("pet.collectionTitle")} ${count}/${total}`,
    );
  }
}

export function unlockCurrentRoundPet() {
  const pet = state.pet;
  const petId = pet && pet.id ? pet.id : "";
  if (!petId) return null;
  const valid = validPetIdSet();
  if (valid.size > 0 && !valid.has(petId)) return null;
  const pid = state.userId || "_guest";
  const result = unlockEncounteredPet(pid, petId);
  renderPetCollectionButton();
  if (isPetSheetOpen()) renderPetGrid();
  return result;
}

let previewTimer = 0;

function showPetPreview(def, cardEl) {
  if (!def) return;
  playPetVoice(def.id);
  if (els.petGrid) {
    els.petGrid.querySelectorAll(".pet-card.is-previewing, .pet-card.is-active").forEach((el) => {
      el.classList.remove("is-previewing", "is-active");
    });
  }
  if (cardEl) {
    cardEl.classList.add("is-previewing", "is-active");
    clearTimeout(previewTimer);
    previewTimer = window.setTimeout(() => {
      cardEl.classList.remove("is-previewing");
    }, 650);
  }
  if (els.petDetailPreview) {
    els.petDetailPreview.classList.remove("is-hidden");
    const name = tr(`pet.name.${def.id}`) !== `pet.name.${def.id}` ? tr(`pet.name.${def.id}`) : def.id;
    const say = def.say ? tr(def.say) : "";
    els.petDetailPreview.replaceChildren();
    const img = document.createElement("img");
    img.src = def.image;
    img.alt = name;
    img.width = 56;
    img.height = 56;
    img.className = "pet-detail-img";
    const info = document.createElement("div");
    info.className = "pet-detail-copy";
    const title = document.createElement("strong");
    title.textContent = name;
    const sub = document.createElement("span");
    sub.textContent = say;
    info.append(title, sub);
    els.petDetailPreview.append(img, info);
  }
}

export function renderPetGrid() {
  if (!els.petGrid) return;
  const Pets = getPetsCatalog();
  if (!Pets) return;
  const unlocked = getSanitizedPetCollection();
  const total = Pets.PETS.length;
  const count = Math.min(total, Object.keys(unlocked).length);
  if (els.petCount) {
    setText(els.petCount, tr("pet.unlockedCount", { count }));
  }

  els.petGrid.replaceChildren();
  for (const def of Pets.PETS) {
    const info = unlocked[def.id] || null;
    const isUnlocked = Boolean(info);
    const card = document.createElement("button");
    card.type = "button";
    card.className = isUnlocked ? "pet-card is-unlocked" : "pet-card is-locked";
    card.dataset.petId = def.id;
    card.dataset.locked = String(!isUnlocked);
    card.setAttribute("role", "listitem");

    const img = document.createElement("img");
    img.className = "pet-card-img";
    img.src = def.image;
    img.alt = "";
    img.loading = "lazy";
    img.width = 54;
    img.height = 54;
    img.draggable = false;

    const label = document.createElement("span");
    label.className = "pet-card-name";
    const localizedName =
      tr(`pet.name.${def.id}`) !== `pet.name.${def.id}` ? tr(`pet.name.${def.id}`) : def.id;
    label.textContent = isUnlocked ? localizedName : "???";
    card.setAttribute("aria-label", isUnlocked ? localizedName : tr("pet.locked"));

    card.append(img, label);
    card.addEventListener("click", () => {
      if (!isUnlocked) return;
      showPetPreview(def, card);
    });
    els.petGrid.appendChild(card);
  }
}

export function isPetSheetOpen() {
  return isDialogOpen(els.petSheet);
}

export function openPetSheet() {
  if (!els.petSheet) return;
  if (els.petDetailPreview) els.petDetailPreview.classList.add("is-hidden");
  renderPetGrid();
  openDialogModal(els.petSheet, {
    opener: els.petCollectionBtn,
    focusEl: els.petClose,
  });
}

export function closePetSheet() {
  closeDialogModal(els.petSheet);
}
