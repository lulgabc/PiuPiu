(() => {
  "use strict";

  const standaloneQuery =
    typeof window.matchMedia === "function"
      ? window.matchMedia("(display-mode: standalone)")
      : null;
  const ua = navigator.userAgent || "";
  const isIOS =
    /iphone|ipad|ipod/i.test(ua) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  const isAndroid = /android/i.test(ua);
  const isFirefox = /firefox|fxios/i.test(ua);

  let deferredPrompt = null;
  window.addEventListener("beforeinstallprompt", (event) => {
    event.preventDefault();
    deferredPrompt = event;
    window.__PIUPIU_INSTALL_PROMPT__ = event;
  });
  deferredPrompt = window.__PIUPIU_INSTALL_PROMPT__ || null;

  const installBtn = document.getElementById("installBtn");
  const installSheet = document.getElementById("installSheet");
  const installBody = document.getElementById("installBody");
  const installClose = document.getElementById("installClose");
  const installDone = document.getElementById("installDone");

  function t(key) {
    return window.PiuI18n && typeof window.PiuI18n.t === "function"
      ? window.PiuI18n.t(key)
      : key;
  }

  function isStandalone() {
    return (
      Boolean(standaloneQuery && standaloneQuery.matches) ||
      navigator.standalone === true
    );
  }

  function renderHelp() {
    if (!installBody) return;
    installBody.replaceChildren();

    if (isIOS) {
      const lead = document.createElement("p");
      lead.className = "install-lead";
      lead.textContent = t("install.ios");
      installBody.appendChild(lead);

      const steps = document.createElement("ol");
      steps.className = "install-steps";
      for (const key of ["install.ios1", "install.ios2", "install.ios3"]) {
        const item = document.createElement("li");
        item.textContent = t(key);
        steps.appendChild(item);
      }
      installBody.appendChild(steps);
      return;
    }

    const hint = document.createElement("p");
    hint.className = "install-lead";
    if (isFirefox) hint.textContent = t("install.unsupported");
    else if (isAndroid) hint.textContent = t("install.android");
    else hint.textContent = t("install.desktop");
    installBody.appendChild(hint);
  }

  function isSheetOpen() {
    if (!installSheet) return false;
    return installSheet.tagName === "DIALOG"
      ? Boolean(installSheet.open)
      : !installSheet.classList.contains("is-hidden");
  }

  function openHelp() {
    if (!installSheet) return;
    renderHelp();
    installSheet.classList.remove("is-hidden");
    installSheet.removeAttribute("aria-hidden");
    if (installSheet.tagName === "DIALOG" && typeof installSheet.showModal === "function") {
      if (!installSheet.open) installSheet.showModal();
    }
    window.setTimeout(() => {
      if (installClose && isSheetOpen()) {
        installClose.focus({ preventScroll: true });
      }
    }, 0);
  }

  function restoreInstallFocus() {
    if (installBtn && !installBtn.classList.contains("is-hidden")) {
      installBtn.focus({ preventScroll: true });
    } else if (document.activeElement && typeof document.activeElement.blur === "function") {
      document.activeElement.blur();
    }
  }

  function closeHelp(restoreFocus = true) {
    if (!installSheet || !isSheetOpen()) return;
    if (installSheet.tagName === "DIALOG" && typeof installSheet.close === "function") {
      installSheet._skipRestoreFocus = !restoreFocus;
      installSheet.close();
      return;
    }
    installSheet.classList.add("is-hidden");
    installSheet.setAttribute("aria-hidden", "true");
    if (restoreFocus) restoreInstallFocus();
  }

  function hideInstallButton() {
    if (!installBtn) return;
    installBtn.classList.add("is-hidden");
    installBtn.setAttribute("aria-hidden", "true");
  }

  function updateInstallVisibility() {
    const standalone = isStandalone();
    document.documentElement.classList.toggle("is-standalone", standalone);
    if (!installBtn) return;
    if (standalone) {
      hideInstallButton();
      closeHelp(false);
      return;
    }
    installBtn.classList.remove("is-hidden");
    installBtn.removeAttribute("aria-hidden");
  }

  async function runInstall() {
    if (deferredPrompt) {
      const prompt = deferredPrompt;
      deferredPrompt = null;
      window.__PIUPIU_INSTALL_PROMPT__ = null;
      try {
        prompt.prompt();
        const choice = await prompt.userChoice;
        if (choice && choice.outcome === "accepted") hideInstallButton();
      } catch {
        openHelp();
      }
      return;
    }
    openHelp();
  }

  if (installBtn) installBtn.addEventListener("click", runInstall);
  if (installClose) installClose.addEventListener("click", () => closeHelp());
  if (installDone) installDone.addEventListener("click", () => closeHelp());
  if (installSheet) {
    installSheet.addEventListener("click", (event) => {
      if (event.target === installSheet) {
        closeHelp();
        return;
      }
      const card = installSheet.firstElementChild;
      if (card && typeof card.getBoundingClientRect === "function") {
        const rect = card.getBoundingClientRect();
        if (
          (event.clientX !== 0 || event.clientY !== 0) &&
          (event.clientX < rect.left ||
            event.clientX > rect.right ||
            event.clientY < rect.top ||
            event.clientY > rect.bottom)
        ) {
          closeHelp();
        }
      }
    });
    installSheet.addEventListener("close", () => {
      const skip = Boolean(installSheet._skipRestoreFocus);
      installSheet._skipRestoreFocus = false;
      if (!skip) restoreInstallFocus();
    });
  }

  document.addEventListener("piupiu:langchange", () => {
    if (isSheetOpen()) renderHelp();
  });

  window.addEventListener("appinstalled", () => {
    deferredPrompt = null;
    window.__PIUPIU_INSTALL_PROMPT__ = null;
    closeHelp(false);
    hideInstallButton();
  });

  if (standaloneQuery) {
    if (typeof standaloneQuery.addEventListener === "function") {
      standaloneQuery.addEventListener("change", updateInstallVisibility);
    } else if (typeof standaloneQuery.addListener === "function") {
      standaloneQuery.addListener(updateInstallVisibility);
    }
  }

  updateInstallVisibility();

  let updateToastEl = null;

  function ensureUpdateToast() {
    if (updateToastEl && document.contains(updateToastEl)) return updateToastEl;
    const existing = document.getElementById("pwaUpdateToast");
    if (existing) {
      updateToastEl = existing;
      return existing;
    }
    const toast = document.createElement("div");
    toast.id = "pwaUpdateToast";
    toast.className = "pwa-update-toast is-hidden";
    toast.dataset.pwaUpdate = "true";
    toast.setAttribute("role", "status");
    toast.setAttribute("aria-live", "polite");
    toast.style.cssText =
      "position:fixed;left:50%;bottom:18px;transform:translateX(-50%);z-index:900;display:flex;align-items:center;gap:10px;padding:10px 14px;border-radius:14px;background:#162040;color:#fff;border:1px solid rgba(110,214,255,0.45);box-shadow:0 10px 28px rgba(0,0,0,0.45);font:600 14px/1.3 system-ui,sans-serif;";

    const text = document.createElement("span");
    text.className = "pwa-update-text";
    text.textContent = "PiuPiu has an update ready";

    const reloadBtn = document.createElement("button");
    reloadBtn.type = "button";
    reloadBtn.className = "pwa-update-reload";
    reloadBtn.textContent = "Reload";
    reloadBtn.style.cssText =
      "border:0;border-radius:10px;padding:6px 12px;background:#5cf2d6;color:#0a1024;font:700 13px/1 system-ui,sans-serif;cursor:pointer;";
    reloadBtn.addEventListener("click", () => location.reload());

    const dismissBtn = document.createElement("button");
    dismissBtn.type = "button";
    dismissBtn.className = "pwa-update-dismiss";
    dismissBtn.setAttribute("aria-label", "Dismiss");
    dismissBtn.textContent = "×";
    dismissBtn.style.cssText =
      "border:0;background:transparent;color:#cbd5f5;font:700 18px/1 system-ui,sans-serif;cursor:pointer;padding:2px 6px;";
    dismissBtn.addEventListener("click", () => {
      toast.classList.add("is-hidden");
      toast.style.display = "none";
    });

    toast.append(text, reloadBtn, dismissBtn);
    document.body.appendChild(toast);
    updateToastEl = toast;
    return toast;
  }

  function showUpdateNotice() {
    const toast = ensureUpdateToast();
    if (!toast) return;
    toast.classList.remove("is-hidden", "hidden");
    toast.style.display = "flex";
  }

  if ("serviceWorker" in navigator && /^https?:$/.test(location.protocol)) {
    let hasController = Boolean(navigator.serviceWorker.controller);
    navigator.serviceWorker.addEventListener("controllerchange", () => {
      if (hasController) showUpdateNotice();
      else hasController = true;
    });

    const registerSw = () => {
      navigator.serviceWorker
        .register("./sw.js", { scope: "./", updateViaCache: "none" })
        .then((registration) => {
          if (registration.waiting && navigator.serviceWorker.controller) {
            showUpdateNotice();
          }
          registration.addEventListener("updatefound", () => {
            const wasControlled = hasController || Boolean(navigator.serviceWorker.controller);
            const installing = registration.installing;
            if (!installing) return;
            installing.addEventListener("statechange", () => {
              if (
                (installing.state === "installed" || installing.state === "activated") &&
                wasControlled
              ) {
                showUpdateNotice();
              }
            });
          });
        })
        .catch(() => {
          /* installation still works in browsers without a service worker */
        });
    };

    if (document.readyState === "complete") registerSw();
    else window.addEventListener("load", registerSw);
  }

  if (new URLSearchParams(location.search).get("debug") === "1") {
    window.__PIU_PWA__ = {
      isStandalone,
      hasPrompt: () => Boolean(deferredPrompt),
      install: runInstall,
      showHelp: openHelp,
      hideHelp: () => closeHelp(false),
      hideButton: hideInstallButton,
      showUpdateNotice,
    };
  }
})();
