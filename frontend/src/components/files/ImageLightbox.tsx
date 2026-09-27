import { useEffect, useCallback } from "react";
import { ClinicalFile, CATEGORY_LABELS } from "../../types";

interface Props {
  files: ClinicalFile[];
  activeIndex: number;
  onClose: () => void;
  onNavigate: (idx: number) => void;
}

function formatBytes(n: number) {
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

export function ImageLightbox({ files, activeIndex, onClose, onNavigate }: Props) {
  const file = files[activeIndex];
  const isImage = file?.mimeType.startsWith("image/");
  const isPdf = file?.mimeType === "application/pdf";

  const prev = useCallback(() => {
    if (activeIndex > 0) onNavigate(activeIndex - 1);
  }, [activeIndex, onNavigate]);

  const next = useCallback(() => {
    if (activeIndex < files.length - 1) onNavigate(activeIndex + 1);
  }, [activeIndex, files.length, onNavigate]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft") prev();
      if (e.key === "ArrowRight") next();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, prev, next]);

  if (!file) return null;

  return (
    <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center">
      {/* Close */}
      <button
        onClick={onClose}
        className="absolute top-4 right-4 text-white/70 hover:text-white text-2xl z-10"
      >
        ✕
      </button>

      {/* Prev */}
      <button
        onClick={prev}
        disabled={activeIndex === 0}
        className="absolute left-4 top-1/2 -translate-y-1/2 text-white/70 hover:text-white text-3xl disabled:opacity-20 z-10 px-2"
      >
        ‹
      </button>

      {/* Content */}
      <div className="flex flex-col items-center max-w-5xl max-h-screen w-full px-16">
        {isImage && (
          <img
            src={file.url}
            alt={file.filename}
            className="max-h-[75vh] max-w-full object-contain rounded-lg"
          />
        )}
        {isPdf && (
          <iframe src={file.url} className="w-full h-[75vh] rounded-lg bg-white" title={file.filename} />
        )}
        {!isImage && !isPdf && (
          <div className="bg-white/10 rounded-xl p-12 text-center text-white">
            <div className="text-6xl mb-4">📄</div>
            <p className="font-medium">{file.filename}</p>
            <a href={file.url} download className="mt-4 inline-block px-4 py-2 bg-brand-500 rounded-lg text-sm">
              Download
            </a>
          </div>
        )}

        {/* Metadata strip */}
        <div className="mt-4 text-center text-sm text-white/70 space-y-1">
          <p className="font-medium text-white">{file.filename}</p>
          <p>
            {CATEGORY_LABELS[file.category]} · {formatBytes(file.size)} ·{" "}
            {new Date(file.createdAt).toLocaleDateString()}
          </p>
          {file.notes && <p className="italic">"{file.notes}"</p>}
          <p className="text-xs text-white/40">
            {activeIndex + 1} / {files.length}
          </p>
        </div>
      </div>

      {/* Next */}
      <button
        onClick={next}
        disabled={activeIndex === files.length - 1}
        className="absolute right-4 top-1/2 -translate-y-1/2 text-white/70 hover:text-white text-3xl disabled:opacity-20 z-10 px-2"
      >
        ›
      </button>
    </div>
  );
}
