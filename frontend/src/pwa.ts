// Registers the service worker (production only) and exposes a tiny
// pub/sub for online/offline state so the UI can show a clear banner.
// Deliberately does not touch localStorage/IndexedDB with clinical data —
// see public/sw.js for what is and isn't cached.

type OnlineListener = (online: boolean) => void;
const listeners = new Set<OnlineListener>();

export function subscribeOnlineStatus(cb: OnlineListener): () => void {
  listeners.add(cb);
  cb(navigator.onLine);
  return () => listeners.delete(cb);
}

window.addEventListener("online", () => listeners.forEach((l) => l(true)));
window.addEventListener("offline", () => listeners.forEach((l) => l(false)));

export function registerServiceWorker() {
  if (!("serviceWorker" in navigator)) return;
  // Only register in production builds served over http(s); avoids noisy
  // reloads from Vite's dev server HMR.
  if (import.meta.env.DEV) return;

  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").catch((err) => {
      console.warn("Service worker registration failed:", err);
    });
  });
}

// Captures the `beforeinstallprompt` event so the app can offer its own
// install button instead of relying only on the browser's UI.
let deferredInstallPrompt: any = null;
const installListeners = new Set<(available: boolean) => void>();

window.addEventListener("beforeinstallprompt", (e) => {
  e.preventDefault();
  deferredInstallPrompt = e;
  installListeners.forEach((l) => l(true));
});

window.addEventListener("appinstalled", () => {
  deferredInstallPrompt = null;
  installListeners.forEach((l) => l(false));
});

export function subscribeInstallAvailable(cb: (available: boolean) => void): () => void {
  installListeners.add(cb);
  cb(!!deferredInstallPrompt);
  return () => installListeners.delete(cb);
}

export async function promptInstall(): Promise<void> {
  if (!deferredInstallPrompt) return;
  deferredInstallPrompt.prompt();
  await deferredInstallPrompt.userChoice;
  deferredInstallPrompt = null;
}
