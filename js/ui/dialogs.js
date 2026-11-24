import { tr } from "../core/state.js";

const dialogMeta = new WeakMap();
let armedButton = null;
let armedTimer = 0;

export function clearArmedDelete() {
  if (armedTimer) {
    clearTimeout(armedTimer);
    armedTimer = 0;
  }
  if (armedButton) {
    delete armedButton.dataset.confirmArmed;
    armedButton.classList.remove("is-armed");
    if (armedButton._origNodes) {
      armedButton.replaceChildren(...armedButton._origNodes);
      delete armedButton._origNodes;
    }
    if (armedButton._origAria !== undefined) {
      armedButton.setAttribute("aria-label", armedButton._origAria);
      delete armedButton._origAria;
    }
    armedButton = null;
  }
}

export function armOrConfirmDelete(button, onConfirm, confirmKey = "player.confirmDelete") {
  if (!button) return false;
  if (button.dataset.confirmArmed === "true") {
    clearArmedDelete();
    onConfirm();
    return true;
  }
  clearArmedDelete();
  armedButton = button;
  button.dataset.confirmArmed = "true";
  button.classList.add("is-armed");
  button._origNodes = Array.from(button.childNodes);
  button._origAria = button.getAttribute("aria-label") || "";
  const label = tr(confirmKey);
  button.textContent = label;
  button.setAttribute("aria-label", label);
  armedTimer = window.setTimeout(() => {
    clearArmedDelete();
  }, 3000);
  return false;
}

export function isDialogOpen(el) {
  if (!el) return false;
  if (el.tagName === "DIALOG") return Boolean(el.open);
  return !el.classList.contains("is-hidden");
}

function bindDialogOnce(dialogEl) {
  if (!dialogEl || dialogMeta.has(dialogEl)) return;
  const meta = { opener: null, onClose: null };
  dialogMeta.set(dialogEl, meta);

  dialogEl.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && isDialogOpen(dialogEl)) {
      event.preventDefault();
      closeDialogModal(dialogEl);
    }
  });

  dialogEl.addEventListener("click", (event) => {
    if (!isDialogOpen(dialogEl)) return;
    if (event.target === dialogEl) {
      closeDialogModal(dialogEl);
      return;
    }
    const card = dialogEl.firstElementChild;
    if (card && typeof card.getBoundingClientRect === "function") {
      const rect = card.getBoundingClientRect();
      const x = event.clientX;
      const y = event.clientY;
      if (
        (x !== 0 || y !== 0) &&
        (x < rect.left || x > rect.right || y < rect.top || y > rect.bottom)
      ) {
        closeDialogModal(dialogEl);
      }
    }
  });

  dialogEl.addEventListener("close", () => {
    clearArmedDelete();
    if (typeof meta.onClose === "function") {
      try {
        meta.onClose();
      } catch {}
    }
    const opener = meta.opener;
    meta.opener = null;
    if (
      opener &&
      document.contains(opener) &&
      !opener.classList.contains("is-hidden") &&
      typeof opener.focus === "function"
    ) {
      opener.focus({ preventScroll: true });
    }
  });
}

export function openDialogModal(dialogEl, { opener = null, focusEl = null, onClose = null } = {}) {
  if (!dialogEl) return;
  bindDialogOnce(dialogEl);
  const meta = dialogMeta.get(dialogEl);
  meta.opener =
    opener ||
    (document.activeElement &&
    document.activeElement !== document.body &&
    typeof document.activeElement.focus === "function"
      ? document.activeElement
      : null);
  meta.onClose = onClose || null;

  dialogEl.classList.remove("is-hidden");
  dialogEl.removeAttribute("aria-hidden");
  if (dialogEl.tagName === "DIALOG") {
    if (!dialogEl.open && typeof dialogEl.showModal === "function") {
      dialogEl.showModal();
    }
  }
  const card = dialogEl.firstElementChild;
  if (card) card.scrollTop = 0;

  if (focusEl && typeof focusEl.focus === "function") {
    window.setTimeout(() => {
      if (isDialogOpen(dialogEl)) {
        focusEl.focus({ preventScroll: true });
      }
    }, 0);
  }
}

function restoreDialogFocus(dialogEl) {
  const meta = dialogMeta.get(dialogEl);
  if (!meta) return;
  const opener = meta.opener;
  meta.opener = null;
  if (
    opener &&
    document.contains(opener) &&
    !opener.classList.contains("is-hidden") &&
    typeof opener.focus === "function"
  ) {
    opener.focus({ preventScroll: true });
  }
}

export function closeDialogModal(dialogEl) {
  if (!dialogEl || !isDialogOpen(dialogEl)) return;
  clearArmedDelete();
  if (dialogEl.tagName === "DIALOG" && typeof dialogEl.close === "function") {
    dialogEl.close();
    restoreDialogFocus(dialogEl);
  } else {
    dialogEl.classList.add("is-hidden");
    dialogEl.setAttribute("aria-hidden", "true");
    restoreDialogFocus(dialogEl);
  }
}
