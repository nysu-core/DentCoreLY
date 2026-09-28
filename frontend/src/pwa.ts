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
interface InstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

let deferredInstallPrompt: InstallPromptEvent | null = null;
const installListeners = new Set<(available: boolean) => void>();

function notifyInstallAvailability(available: boolean) {
  installListeners.forEach((listener) => listener(available));
}

window.addEventListener("beforeinstallprompt", (e) => {
  e.preventDefault();
  deferredInstallPrompt = e as InstallPromptEvent;
  notifyInstallAvailability(true);
});

window.addEventListener("appinstalled", () => {
  deferredInstallPrompt = null;
  notifyInstallAvailability(false);
});

export function subscribeInstallAvailable(cb: (available: boolean) => void): () => void {
  installListeners.add(cb);
  cb(!!deferredInstallPrompt);
  return () => installListeners.delete(cb);
}

export async function promptInstall(): Promise<"accepted" | "dismissed" | "unavailable"> {
  const prompt = deferredInstallPrompt;
  if (!prompt) return "unavailable";

  deferredInstallPrompt = null;
  notifyInstallAvailability(false);
  await prompt.prompt();
  const choice = await prompt.userChoice;
  return choice.outcome;
}
