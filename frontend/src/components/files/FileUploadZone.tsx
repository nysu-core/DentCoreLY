import { useState, useRef, DragEvent, ChangeEvent } from "react";
import { api } from "../../api/client";
import { FILE_CATEGORIES, CATEGORY_LABELS, FileCategory } from "../../types";

interface Props {
  patientId: string;
  onUploaded: () => void;
}

const ACCEPT = "image/jpeg,image/png,image/gif,image/webp,image/dicom,application/pdf";

function formatBytes(n: number) {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

export function FileUploadZone({ patientId, onUploaded }: Props) {
  const [dragging, setDragging] = useState(false);
  const [category, setCategory] = useState<FileCategory>("INTRAORAL_PHOTO");
  const [notes, setNotes] = useState("");
  const [queue, setQueue] = useState<File[]>([]);
  const [progress, setProgress] = useState<Record<string, "pending" | "uploading" | "done" | "error">>({});
  const inputRef = useRef<HTMLInputElement>(null);

  function addFiles(files: FileList | null) {
    if (!files) return;
    setQueue((q) => [...q, ...Array.from(files)]);
  }

  function onDrop(e: DragEvent) {
    e.preventDefault();
    setDragging(false);
    addFiles(e.dataTransfer.files);
  }

  function removeFromQueue(idx: number) {
    setQueue((q) => q.filter((_, i) => i !== idx));
  }

  async function uploadAll() {
    for (const file of queue) {
      setProgress((p) => ({ ...p, [file.name]: "uploading" }));
      const form = new FormData();
      form.append("file", file);
      form.append("category", category);
      if (notes) form.append("notes", notes);
      try {
        await api.post(`/patients/${patientId}/files`, form, {
          headers: { "Content-Type": "multipart/form-data" },
        });
        setProgress((p) => ({ ...p, [file.name]: "done" }));
      } catch {
        setProgress((p) => ({ ...p, [file.name]: "error" }));
      }
    }
    setQueue([]);
    setNotes("");
    onUploaded();
  }

  const allDone = queue.length > 0 && queue.every((f) => progress[f.name] === "done");

  return (
    <div className="space-y-4">
      {/* Category + Notes row */}
      <div className="flex flex-wrap gap-3">
        <div>
          <label className="block text-xs font-medium text-slate-500 mb-1">Category</label>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value as FileCategory)}
            className="border border-slate-300 rounded-md px-3 py-2 text-sm"
          >
            {FILE_CATEGORIES.map((c) => (
              <option key={c} value={c}>{CATEGORY_LABELS[c]}</option>
            ))}
          </select>
        </div>
        <div className="flex-1 min-w-48">
          <label className="block text-xs font-medium text-slate-500 mb-1">Notes (optional)</label>
          <input
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="e.g. Pre-treatment, taken 2026-07-04"
            className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm"
          />
        </div>
      </div>

      {/* Drop zone */}
      <div
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        onClick={() => inputRef.current?.click()}
        className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${
          dragging ? "border-brand-400 bg-brand-50" : "border-slate-200 hover:border-brand-300 hover:bg-slate-50"
        }`}
      >
        <div className="text-4xl mb-2">📁</div>
        <p className="text-sm font-medium text-slate-600">Drag & drop files here, or click to browse</p>
        <p className="text-xs text-slate-400 mt-1">JPEG, PNG, WebP, GIF, DICOM, PDF — max 25 MB per file</p>
        <input
          ref={inputRef}
          type="file"
          multiple
          accept={ACCEPT}
          className="hidden"
          onChange={(e: ChangeEvent<HTMLInputElement>) => addFiles(e.target.files)}
        />
      </div>

      {/* Queue */}
      {queue.length > 0 && (
        <div className="space-y-2">
          {queue.map((file, idx) => {
            const state = progress[file.name] ?? "pending";
            return (
              <div key={idx} className="flex items-center gap-3 bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm">
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{file.name}</p>
                  <p className="text-xs text-slate-400">{formatBytes(file.size)}</p>
                </div>
                {state === "pending" && (
                  <button onClick={() => removeFromQueue(idx)} className="text-xs text-red-500 hover:underline">Remove</button>
                )}
                {state === "uploading" && <span className="text-xs text-amber-600 animate-pulse">Uploading…</span>}
                {state === "done"      && <span className="text-xs text-green-600">✓ Done</span>}
                {state === "error"     && <span className="text-xs text-red-600">✗ Failed</span>}
              </div>
            );
          })}

          {!allDone && (
            <button
              onClick={uploadAll}
              className="w-full py-2 bg-brand-500 hover:bg-brand-600 text-white font-medium text-sm rounded-lg"
            >
              Upload {queue.length} file{queue.length !== 1 ? "s" : ""}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
