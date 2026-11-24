import {
  state,
  els,
  tr,
  formatNumber,
  setText,
  iconSvg,
  setIcon,
} from "../core/state.js";
import { ensureEducationLoaded } from "../core/loader.js";
import {
  PACK_GROUPS,
  buildCategories,
  packGroupForCategory,
  categoryIcon,
  categoryName,
  categoryTotalCount,
  getSelectedCategory,
  getSelectedPoolCount,
  filterCategories,
  getCategoryPreviewWords,
  getPackMasteryStats,
  setPackGroup,
  selectPackCategory,
  setPackBand,
  setPackDifficulty,
  formatFileSize,
  isSupportedCustomFile,
  fileBaseName,
  setCustomNotice,
  refreshCustomPackCategories,
  importCustomPackFile,
  deleteCustomPack,
} from "../data/packs.js";

import {
  openDialogModal,
  closeDialogModal,
  isDialogOpen,
  armOrConfirmDelete,
  clearArmedDelete,
} from "./dialogs.js";

function getCustomPacksApi() {
  const g = typeof window !== "undefined" ? window : globalThis;
  return g && g.PiuCustomPacks && typeof g.PiuCustomPacks.load === "function"
    ? g.PiuCustomPacks
    : null;
}

let groupLoadToken = 0;

export function isPackSheetOpen() {
  return isDialogOpen(els.packSheet);
}

export function renderPackTabs() {
  if (!els.packTabs) return;
  if (!PACK_GROUPS.some((group) => group.id === state.packGroup)) {
    state.packGroup = "themes";
  }
  if (state.packGroup === "custom" && !getCustomPacksApi()) {
    state.packGroup = "themes";
  }
  els.packTabs.querySelectorAll("[data-pack-group]").forEach((tab) => {
    const active = tab.dataset.packGroup === state.packGroup;
    tab.classList.toggle("is-active", active);
    tab.setAttribute("aria-selected", String(active));
  });
}

export function renderPackCategoryGrid() {
  if (!els.packCategoryGrid) return;
  const query = els.packSearch ? els.packSearch.value.trim() : "";
  const CustomPacks = getCustomPacksApi();
  const custom = !query && state.packGroup === "custom" && Boolean(CustomPacks);
  els.packCategoryGrid.classList.toggle("is-hidden", custom);
  if (els.customPackSection) {
    els.customPackSection.classList.toggle("is-hidden", !custom);
  }
  if (custom) {
    els.packCategoryGrid.replaceChildren();
    if (els.packGroupEmpty) els.packGroupEmpty.classList.add("is-hidden");
    renderCustomPackList();
    return;
  }

  const categories = query
    ? filterCategories(query, null)
    : state.categories.filter((category) => packGroupForCategory(category) === state.packGroup);
  els.packCategoryGrid.replaceChildren();
  if (els.packGroupEmpty) {
    els.packGroupEmpty.classList.toggle("is-hidden", categories.length > 0);
  }
  for (const category of categories) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "pack-category";
    button.dataset.categoryId = category.id;
    button.setAttribute("role", "option");
    const active = category.id === state.categoryId;
    button.classList.toggle("is-active", active);
    button.setAttribute("aria-selected", String(active));

    const icon = document.createElement("span");
    icon.className = "pack-category-icon";
    icon.setAttribute("aria-hidden", "true");
    icon.appendChild(iconSvg(categoryIcon(category)));
    const copy = document.createElement("span");
    copy.className = "pack-category-copy";
    const name = document.createElement("b");
    name.textContent = categoryName(category);
    const meta = document.createElement("small");
    const stats = getPackMasteryStats(category);
    const totalCount = categoryTotalCount(category);
    meta.textContent =
      stats.mastered > 0
        ? tr("pack.masteredShort", {
            mastered: formatNumber(stats.mastered),
            total: formatNumber(stats.total || totalCount),
          })
        : tr("pack.countShort", {
            count: formatNumber(totalCount),
          });
    copy.append(name, " ", meta);
    button.append(icon, copy);
    els.packCategoryGrid.appendChild(button);
  }
}

export function onPackSearchInput() {
  renderPackCategoryGrid();
}

export function renderCategoryOptions() {
  if (!els.categorySelect) return;
  const select = els.categorySelect;
  select.replaceChildren();

  const groups = [
    { key: "custom", labelKey: "group.custom" },
    { key: "education", labelKey: "group.education" },
    { key: "families", labelKey: "group.families" },
    { key: "phrases", labelKey: "group.phrases" },
    { key: "themes", labelKey: "group.themes" },
  ];

  for (const group of groups) {
    const categories = state.categories.filter(
      (category) =>
        (category.group || (category.education ? "education" : "themes")) === group.key,
    );
    if (!categories.length) continue;

    const optgroup = document.createElement("optgroup");
    optgroup.label = tr(group.labelKey);
    for (const category of categories) {
      const option = document.createElement("option");
      option.value = category.id;
      option.textContent = `${category.icon} ${categoryName(category)}`;
      optgroup.appendChild(option);
    }
    select.appendChild(optgroup);
  }
  select.value = state.categoryId;
}

export function renderLevelOptions(category) {
  if (!els.levelSelect) return;
  els.levelSelect.replaceChildren();
  if (!category || !Array.isArray(category.bands) || category.bands.length <= 1) return;

  const addOption = (value, labelKey) => {
    const option = document.createElement("option");
    option.value = value;
    option.textContent = tr(labelKey);
    els.levelSelect.appendChild(option);
  };

  addOption("all", "band.all");
  for (const band of category.bands) addOption(band.id, band.labelKey);
}

export function updatePackUI() {
  const category = getSelectedCategory();
  const banded = Boolean(category && Array.isArray(category.bands));
  const showLevel = banded && category.bands.length > 1;

  if (els.categorySelect) {
    els.categorySelect.value = state.categoryId;
  }
  if (els.diffGroup) {
    els.diffGroup.classList.toggle("is-hidden", banded);
    const controls = els.diffGroup.closest(".pack-controls");
    if (controls) controls.classList.toggle("single", banded);

    els.diffGroup.querySelectorAll("[data-level]").forEach((button) => {
      const level = Number(button.dataset.level);
      const available =
        level === 0 || !category || !category.levels || (category.levels[level] || []).length > 0;
      button.disabled = !available;
    });
    if (
      category &&
      category.levels &&
      state.difficulty > 0 &&
      !(category.levels[state.difficulty] || []).length
    ) {
      state.difficulty = 0;
    }
    els.diffGroup.querySelectorAll("[data-level]").forEach((button) => {
      const level = Number(button.dataset.level);
      const active = level === state.difficulty;
      button.classList.toggle("is-active", active);
      button.setAttribute("aria-pressed", String(active));
    });
  }

  if (els.levelSelect) {
    els.levelSelect.classList.toggle("is-hidden", !showLevel);
    if (banded) {
      const validBand =
        state.band === "all" || category.bands.some((band) => band.id === state.band);
      if (!validBand) state.band = "all";
      if (showLevel) {
        renderLevelOptions(category);
        els.levelSelect.value = state.band;
      }
    } else {
      renderLevelOptions(null);
    }
  }

  const count = getSelectedPoolCount();
  const countKey = category && category.countKey ? category.countKey : "pack.count";
  setText(els.packCount, tr(countKey, { count: formatNumber(count) }));

  let modeKey = "difficulty.all";
  if (banded) {
    const band = category.bands.find((item) => item.id === state.band);
    modeKey = state.band !== "all" && band ? band.labelKey : "difficulty.all";
  } else if (state.difficulty > 0) {
    modeKey = `difficulty.${state.difficulty}`;
  }

  if (category) {
    setIcon(els.packPreviewIcon, categoryIcon(category));
    setText(els.packPreviewName, categoryName(category));
    setText(els.packPreviewMeta, tr(modeKey));
    setText(els.packSummary, `${categoryName(category)} · ${tr(modeKey)}`);
    if (els.packWordPreview) {
      els.packWordPreview.replaceChildren();
      const previewWords = getCategoryPreviewWords(category, 12);
      for (const word of previewWords) {
        const chip = document.createElement("span");
        chip.className = "pack-word-chip";
        chip.textContent = word;
        els.packWordPreview.appendChild(chip);
      }
    }
  }

  renderPackTabs();
  renderPackCategoryGrid();
  renderCustomPackList();
}

export function renderCustomNotice() {
  if (!els.customPackStatus) return;
  const notice = state.customNotice;
  if (!notice) {
    setText(els.customPackStatus, "");
    els.customPackStatus.className = "custom-pack-status";
    return;
  }
  setText(els.customPackStatus, tr(notice.key, notice.vars));
  els.customPackStatus.className = `custom-pack-status is-${notice.type || "info"}`;
}

export function renderCustomPackList() {
  if (!els.customPackList) return;
  const packs = Array.isArray(state.customPacks) ? state.customPacks : [];
  const current = getSelectedCategory();
  const currentPackId = current && current.custom ? current.packId : "";
  els.customPackList.replaceChildren();
  for (const pack of packs) {
    const item = document.createElement("li");
    item.className = "custom-pack-item";
    item.dataset.customPackId = pack.id;

    const pick = document.createElement("button");
    pick.type = "button";
    pick.className = "custom-pack-pick";
    pick.dataset.customPick = pack.id;
    pick.setAttribute("aria-pressed", String(pack.id === currentPackId));
    pick.setAttribute("aria-label", tr("custom.pickAria", { name: pack.name }));

    const text = document.createElement("span");
    text.className = "custom-pack-item-text";
    const name = document.createElement("strong");
    name.textContent = pack.name;
    const meta = document.createElement("span");
    meta.textContent = tr("custom.wordCount", { count: formatNumber(pack.words.length) });
    text.append(name, meta);
    if (pack.id === currentPackId) {
      const badge = document.createElement("em");
      badge.className = "custom-pack-current";
      badge.textContent = tr("custom.current");
      text.appendChild(badge);
    }
    pick.appendChild(text);

    const remove = document.createElement("button");
    remove.type = "button";
    remove.className = "custom-pack-delete";
    remove.dataset.deletePack = pack.id;
    remove.dataset.customDelete = pack.id;
    remove.replaceChildren(iconSvg("close"));
    remove.title = tr("custom.delete");
    remove.setAttribute("aria-label", tr("custom.deleteAria", { name: pack.name }));

    item.append(pick, remove);
    els.customPackList.appendChild(item);
  }
  els.customPackList.classList.toggle("is-hidden", packs.length === 0);
  if (els.customPackEmpty) {
    els.customPackEmpty.classList.toggle("is-hidden", packs.length > 0);
  }
}

export function updateCustomPackUI() {
  if (!els.customPackSection) return;
  const CustomPacks = getCustomPacksApi();
  const packs = Array.isArray(state.customPacks) ? state.customPacks : [];
  const maxPacks = CustomPacks ? CustomPacks.MAX_PACKS : 12;
  if (els.customPackQuota) {
    setText(els.customPackQuota, tr("custom.quota", { count: packs.length, max: maxPacks }));
  }
  if (els.customPackFileInfo) {
    const file = state.customPackFile;
    setText(
      els.customPackFileInfo,
      file ? tr("custom.fileChosen", { name: file.name, size: formatFileSize(file.size) }) : "",
    );
  }
  if (els.customPackChoose) {
    els.customPackChoose.disabled = state.customPackReading || !CustomPacks;
  }
  if (els.customPackCreate) {
    const fileTooLarge =
      state.customPackFile &&
      CustomPacks &&
      state.customPackFile.size > CustomPacks.MAX_FILE_BYTES;
    const fileUnsupported =
      state.customPackFile && !isSupportedCustomFile(state.customPackFile);
    els.customPackCreate.disabled =
      state.customPackReading ||
      !CustomPacks ||
      !state.customPackFile ||
      fileTooLarge ||
      fileUnsupported ||
      packs.length >= maxPacks;
  }
  renderCustomNotice();
}

export function handlePackGroupSwitch(group) {
  const token = ++groupLoadToken;
  if (!setPackGroup(group)) return;
  if (group === "education") {
    ensureEducationLoaded()
      .then(() => {
        state.categories = buildCategories();
        renderCategoryOptions();
        // Guard against stale async overwrite if user switched tabs while loading
        if (token !== groupLoadToken || state.packGroup !== "education") return;
        updatePackUI();
      })
      .catch(() => {});
  }
}

export function handlePackCategorySelect(categoryId) {
  selectPackCategory(categoryId);
  renderCategoryOptions();
}

export function onCategoryChange() {
  if (els.categorySelect) handlePackCategorySelect(els.categorySelect.value);
}

export function onLevelChange() {
  if (els.levelSelect) setPackBand(els.levelSelect.value);
}

export function onDifficultyClick(button) {
  if (!button || button.disabled) return;
  setPackDifficulty(Number(button.dataset.level));
}

export function onCustomFileChange() {
  const CustomPacks = getCustomPacksApi();
  if (!els.customPackFile) return;
  state.customPackFile =
    els.customPackFile.files && els.customPackFile.files[0]
      ? els.customPackFile.files[0]
      : null;
  if (
    state.customPackFile &&
    isSupportedCustomFile(state.customPackFile) &&
    els.customPackName &&
    !els.customPackName.value.trim()
  ) {
    els.customPackName.value = fileBaseName(state.customPackFile.name);
  }
  if (state.customPackFile && !isSupportedCustomFile(state.customPackFile)) {
    setCustomNotice("custom.fileType", {}, "error");
  } else if (
    state.customPackFile &&
    CustomPacks &&
    state.customPackFile.size > CustomPacks.MAX_FILE_BYTES
  ) {
    setCustomNotice(
      "custom.fileTooLarge",
      { mb: Math.round(CustomPacks.MAX_FILE_BYTES / (1024 * 1024)) },
      "error",
    );
  } else {
    setCustomNotice(null);
  }
  updateCustomPackUI();
}

export async function createCustomPackFromFile() {
  const typed = els.customPackName ? els.customPackName.value.trim() : "";
  const outcome = await importCustomPackFile(state.customPackFile, typed);
  if (outcome && outcome.ok) {
    if (els.customPackName) els.customPackName.value = "";
    if (els.customPackFile) els.customPackFile.value = "";
    renderCategoryOptions();
    updateCustomPackUI();
  }
}

export function onCustomPackListClick(event) {
  const CustomPacks = getCustomPacksApi();
  if (!CustomPacks) return;
  const target = event.target;
  const pick =
    target && typeof target.closest === "function"
      ? target.closest("[data-custom-pick]")
      : null;
  if (pick) {
    handlePackCategorySelect(`custom:${pick.dataset.customPick}`);
    return;
  }
  const button =
    target && typeof target.closest === "function"
      ? target.closest("[data-delete-pack], [data-custom-delete]")
      : null;
  if (!button) return;
  const id = button.dataset.deletePack || button.dataset.customDelete;
  const pack = (state.customPacks || []).find((item) => item.id === id);
  if (!pack) return;
  armOrConfirmDelete(
    button,
    () => {
      deleteCustomPack(id);
      renderCategoryOptions();
    },
    "custom.confirmDelete",
  );
}

export function openPack() {
  if (!els.packSheet) return;
  clearArmedDelete();
  state.customNotice = null;
  if (els.packSearch) els.packSearch.value = "";
  state.categories = buildCategories();
  state.packGroup = packGroupForCategory(getSelectedCategory());
  if (getCustomPacksApi()) {
    refreshCustomPackCategories();
    renderCategoryOptions();
  } else {
    renderCategoryOptions();
    updatePackUI();
  }
  openDialogModal(els.packSheet, {
    opener: els.packBtn,
    focusEl: els.packClose,
  });
  if (state.packGroup === "education") {
    handlePackGroupSwitch("education");
  }
}

export function closePack() {
  closeDialogModal(els.packSheet);
}
