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

  function openHelp() {
    if (!installSheet) return;
    renderHelp();
    installSheet.classList.remove("is-hidden");
    installSheet.setAttribute("aria-hidden", "false");
    window.setTimeout(() => {
      if (installClose && !installSheet.classList.contains("is-hidden")) {
        installClose.focus({ preventScroll: true });
      }
    }, 0);
  }

  function closeHelp(restoreFocus = true) {
    if (!installSheet || installSheet.classList.contains("is-hidden")) return;
    installSheet.classList.add("is-hidden");
    installSheet.setAttribute("aria-hidden", "true");
    if (!restoreFocus) return;
    if (installBtn && !installBtn.classList.contains("is-hidden")) {
      installBtn.focus({ preventScroll: true });
    } else if (document.activeElement && typeof document.activeElement.blur === "function") {
      document.activeElement.blur();
    }
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
      if (event.target === installSheet) closeHelp();
    });
  }

  document.addEventListener(
    "keydown",
    (event) => {
      if (event.key !== "Escape" || !installSheet) return;
      if (installSheet.classList.contains("is-hidden")) return;
      event.preventDefault();
      event.stopPropagation();
      closeHelp();
    },
    true,
  );

  document.addEventListener("piupiu:langchange", () => {
    if (installSheet && !installSheet.classList.contains("is-hidden")) renderHelp();
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

  if ("serviceWorker" in navigator && /^https?:$/.test(location.protocol)) {
    window.addEventListener("load", () => {
      navigator.serviceWorker
        .register("./sw.js", { scope: "./", updateViaCache: "none" })
        .catch(() => {
          /* installation still works in browsers without a service worker */
        });
    });
  }

  if (new URLSearchParams(location.search).get("debug") === "1") {
    window.__PIU_PWA__ = {
      isStandalone,
      hasPrompt: () => Boolean(deferredPrompt),
      install: runInstall,
      showHelp: openHelp,
      hideHelp: () => closeHelp(false),
      hideButton: hideInstallButton,
    };
  }
})();
