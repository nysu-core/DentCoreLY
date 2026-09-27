import { useEffect, useState } from "react";
import { promptInstall, subscribeInstallAvailable } from "../pwa";

type Props = { variant?: "light" | "dark" };

function getInstallInstructions() {
  const userAgent = navigator.userAgent;
  const isAppleMobile = /iPhone|iPad|iPod/i.test(userAgent) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);

  if (isAppleMobile) {
    return "In Safari, tap Share, then choose Add to Home Screen.";
  }
  if (/Android/i.test(userAgent)) {
    return "Open your browser menu and choose Install app or Add to Home screen.";
  }
  return "Open your browser menu and choose Install OrthoBen or Install app.";
}

export function InstallAppButton({ variant = "light" }: Props) {
  const [promptAvailable, setPromptAvailable] = useState(false);
  const [showInstructions, setShowInstructions] = useState(false);
  const buttonClass = variant === "dark"
    ? "w-full rounded-md border border-amber-200/40 px-4 py-3 text-sm font-semibold text-amber-100 hover:bg-amber-200/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-300"
    : "w-full rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-900 hover:bg-amber-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-500";

  useEffect(() => subscribeInstallAvailable(setPromptAvailable), []);

  async function handleInstall() {
    if (promptAvailable) {
      try {
        await promptInstall();
      } catch {
        setShowInstructions(true);
      }
      return;
    }
    setShowInstructions(true);
  }

  return (
    <>
      <button type="button" onClick={handleInstall} className={buttonClass}>
        Install OrthoBen
      </button>

      {showInstructions && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-4"
          onClick={() => setShowInstructions(false)}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="install-title"
            className="w-full max-w-sm border border-amber-200/25 bg-[#111217] p-6 text-white shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mb-4 flex items-start justify-between gap-4">
              <h2 id="install-title" className="text-lg font-semibold text-amber-100">Install OrthoBen</h2>
              <button
                type="button"
                onClick={() => setShowInstructions(false)}
                aria-label="Close install instructions"
                className="text-xl leading-none text-slate-400 hover:text-white"
              >
                ×
              </button>
            </div>
            <p className="text-sm leading-6 text-slate-300">{getInstallInstructions()}</p>
            <button
              type="button"
              onClick={() => setShowInstructions(false)}
              className="mt-5 w-full rounded-md bg-amber-300 px-4 py-2.5 text-sm font-semibold text-[#171307] hover:bg-amber-200"
            >
              Done
            </button>
          </section>
        </div>
      )}
    </>
  );
}