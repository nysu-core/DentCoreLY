import { useState } from "react";
import { ClinicalFile, CATEGORY_LABELS } from "../../types";
import { api } from "../../api/client";

interface Props {
  file: ClinicalFile;
  onClick: () => void;
  onDeleted: () => void;
}

function formatBytes(n: number) {
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

const MIME_ICON: Record<string, string> = {
  "application/pdf": "📄",
  "image/dicom": "🩻",
};

export function FileThumbnailCard({ file, onClick, onDeleted }: Props) {
  const [editingNotes, setEditingNotes] = useState(false);
  const [notes, setNotes] = useState(file.notes ?? "");
  const [saving, setSaving] = useState(false);

  const isImage = file.mimeType.startsWith("image/");
  const icon = MIME_ICON[file.mimeType] ?? "📄";

  async function saveNotes() {
    setSaving(true);
    await api.patch(`/files/${file.id}`, { notes });
    setSaving(false);
    setEditingNotes(false);
  }

  async function deleteFile() {
    if (!confirm(`Delete "${file.filename}"? This cannot be undone.`)) return;
    await api.delete(`/files/${file.id}`);
    onDeleted();
  }

  return (
    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden group hover:shadow-md transition-shadow">
      {/* Thumbnail */}
      <div
        className="h-36 bg-slate-100 flex items-center justify-center cursor-pointer relative overflow-hidden"
        onClick={onClick}
      >
        {file.thumbnailUrl ? (
          <img
            src={file.thumbnailUrl}
            alt={file.filename}
            className="w-full h-full object-cover"
            loading="lazy"
          />
        ) : (
          <span className="text-4xl">{isImage ? "🖼️" : icon}</span>
        )}
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center">
          <span className="text-white text-sm font-medium opacity-0 group-hover:opacity-100 transition-opacity">View</span>
        </div>
      </div>

      {/* Info */}
      <div className="p-3">
        <p className="text-xs font-medium truncate text-slate-700" title={file.filename}>
          {file.filename}
        </p>
        <p className="text-xs text-slate-400 mt-0.5">
          {formatBytes(file.size)} · {new Date(file.createdAt).toLocaleDateString()}
        </p>

        {editingNotes ? (
          <div className="mt-2 space-y-1">
            <input
              autoFocus
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && saveNotes()}
              className="w-full border border-slate-300 rounded px-2 py-1 text-xs"
              placeholder="Add notes…"
            />
            <div className="flex gap-1">
              <button onClick={saveNotes} disabled={saving} className="text-xs text-brand-600 hover:underline disabled:opacity-50">
                {saving ? "Saving…" : "Save"}
              </button>
              <button onClick={() => setEditingNotes(false)} className="text-xs text-slate-400 hover:underline ml-2">Cancel</button>
            </div>
          </div>
        ) : (
          <p
            className="text-xs text-slate-400 mt-1 italic truncate cursor-pointer hover:text-brand-600"
            onClick={() => setEditingNotes(true)}
            title="Click to edit notes"
          >
            {file.notes || "Add notes…"}
          </p>
        )}

        <div className="flex items-center justify-between mt-2">
          <a
            href={file.url}
            download={file.filename}
            className="text-xs text-slate-500 hover:text-brand-600"
            onClick={(e) => e.stopPropagation()}
          >
            ↓ Download
          </a>
          <button onClick={deleteFile} className="text-xs text-red-400 hover:text-red-600">Delete</button>
        </div>
      </div>
    </div>
  );
}
