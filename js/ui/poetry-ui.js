import {
  state,
  els,
  tr,
  formatNumber,
  setText,
  iconSvg,
  setIcon,
} from "../core/state.js";
import {
  loadPoetryLibrary,
  poetryCategoryMeta,
  poetryCategoryName,
  selectedPoetryPoem,
} from "../modes/poem.js";

import { openDialogModal, closeDialogModal, isDialogOpen } from "./dialogs.js";

export function isPoetrySheetOpen() {
  return isDialogOpen(els.poetrySheet);
}

export function poetryStatus(message, kind = "") {
  state.poetry.status = message;
  state.poetry.statusKind = kind;
  if (!els.poetryStatus) return;
  els.poetryStatus.textContent = message;
  els.poetryStatus.classList.toggle("is-ok", kind === "ok");
  els.poetryStatus.classList.toggle("is-error", kind === "error");
}

export function renderPoetrySummary() {
  const poem = selectedPoetryPoem();
  if (els.poetrySummary) {
    setText(els.poetrySummary, poem ? poem.title : tr("poem.select"));
  }
  if (els.poetryBtn) {
    const label = poem
      ? `${tr("poem.libraryOpen")}: ${poem.title}`
      : tr("poem.libraryOpen");
    els.poetryBtn.setAttribute("aria-label", label);
    els.poetryBtn.setAttribute("title", label);
    els.poetryBtn.classList.toggle("is-hidden", state.mode !== "poem");
  }
}

export function renderPoetryTabs() {
  if (!els.poetryTabs) return;
  const library = state.poetry.library;
  if (!library) return;
  if (!library.categories.some((category) => category.id === state.poetry.categoryId)) {
    state.poetry.categoryId = library.categories[0].id;
  }
  els.poetryTabs.replaceChildren();
  for (const category of library.categories) {
    const count = library.poems.filter((poem) => poem.category === category.id).length;
    const button = document.createElement("button");
    button.type = "button";
    button.className =
      category.id === state.poetry.categoryId ? "poetry-tab is-active" : "poetry-tab";
    button.dataset.poetryCategory = category.id;
    button.setAttribute("role", "tab");
    button.setAttribute("aria-selected", String(category.id === state.poetry.categoryId));
    button.style.setProperty("--poem-tab-color", `hsl(${category.hue} 88% 68%)`);
    button.textContent = `${poetryCategoryName(category.id)} · ${count}`;
    els.poetryTabs.appendChild(button);
  }
}

export function renderPoetryPreview() {
  const poem = selectedPoetryPoem();
  if (!poem) {
    setText(els.poetryPreviewTitle, tr("poem.select"));
    setText(els.poetryPreviewMeta, tr("poem.libraryTitle"));
    setText(els.poetryPreviewCount, "");
    return;
  }
  const category = poetryCategoryMeta(poem.category);
  setIcon(els.poetryPreviewIcon, category.icon);
  setText(els.poetryPreviewTitle, poem.title);
  setText(els.poetryPreviewMeta, `${poetryCategoryName(poem.category)} · ${poem.author}`);
  setText(els.poetryPreviewCount, tr("poem.count", { count: formatNumber(poem.lines.length) }));
}

export function renderPoetryList() {
  if (!els.poetryList) return;
  const library = state.poetry.library;
  if (!library) return;
  const query = (els.poetrySearch ? els.poetrySearch.value : "").trim().toLowerCase();
  const poems = library.poems.filter((poem) => {
    if (!query && poem.category !== state.poetry.categoryId) return false;
    if (!query) return true;
    return (
      poem.title.toLowerCase().includes(query) ||
      poem.author.toLowerCase().includes(query)
    );
  });
  els.poetryList.replaceChildren();
  for (const poem of poems) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "poetry-item";
    button.dataset.poemId = poem.id;
    button.setAttribute("role", "option");
    button.setAttribute("aria-selected", String(poem.id === state.poetry.selectedId));
    if (poem.id === state.poetry.selectedId) button.classList.add("is-active");
    if (state.poetry.completed.has(poem.id)) button.classList.add("is-done");

    const copy = document.createElement("span");
    copy.className = "poetry-item-copy";
    const title = document.createElement("span");
    title.className = "poetry-item-title";
    title.textContent = poem.title;
    const author = document.createElement("span");
    author.className = "poetry-item-author";
    author.textContent = poem.author;
    copy.append(title, author);

    const meta = document.createElement("span");
    meta.className = "poetry-item-meta";
    const count = document.createElement("span");
    count.textContent = tr("poem.count", { count: formatNumber(poem.lines.length) });
    meta.appendChild(count);
    if (state.poetry.completed.has(poem.id)) {
      const done = document.createElement("span");
      done.className = "poetry-item-done";
      done.appendChild(iconSvg("check"));
      done.appendChild(document.createTextNode(tr("poem.done")));
      meta.appendChild(done);
    }

    button.append(copy, meta);
    els.poetryList.appendChild(button);
  }
  const empty = poems.length === 0;
  if (els.poetryEmpty) els.poetryEmpty.classList.toggle("is-hidden", !empty);
  if (els.poetryList) els.poetryList.classList.toggle("is-hidden", empty);
}

export function renderPoetryLibrary() {
  renderPoetryTabs();
  renderPoetryPreview();
  renderPoetryList();
  const count = state.poetry.library ? state.poetry.library.poems.length : 0;
  if (state.poetry.status) {
    poetryStatus(state.poetry.status, state.poetry.statusKind);
  } else {
    const done = state.poetry.completed.size;
    if (done) {
      poetryStatus(tr("poem.completedCount", { count: formatNumber(done) }), "ok");
    } else {
      poetryStatus("", "");
    }
  }
  if (els.poetryNote) {
    setText(
      els.poetryNote,
      tr(state.poetry.library && state.poetry.library.demo ? "poem.libraryNote" : "poem.fullNote"),
    );
  }
  if (els.poetryStatus) {
    els.poetryStatus.title = state.poetry.library ? state.poetry.library.source : "";
  }
  if (els.poetryPreviewCount && !state.poetry.library) {
    setText(els.poetryPreviewCount, "");
  }
  if (count === 0 && els.poetryEmpty) {
    els.poetryEmpty.classList.remove("is-hidden");
  }
}

export function openPoetrySheet() {
  if (!els.poetrySheet) return;
  state.poetry.status = "";
  state.poetry.statusKind = "";
  if (els.poetrySearch) els.poetrySearch.value = "";
  if (state.poetry.loaded) {
    renderPoetryLibrary();
  }
  openDialogModal(els.poetrySheet, {
    opener:
      document.activeElement && document.activeElement !== document.body
        ? document.activeElement
        : els.poetryBtn,
    focusEl: els.poetryClose,
  });
  if (!state.poetry.loaded) {
    loadPoetryLibrary()
      .then(() => {
        renderPoetrySummary();
        if (isPoetrySheetOpen()) renderPoetryLibrary();
      })
      .catch(() => {
        if (isPoetrySheetOpen()) renderPoetryLibrary();
      });
  }
}

export function closePoetrySheet() {
  closeDialogModal(els.poetrySheet);
}
