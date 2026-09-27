import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../../api/client";

interface BackupFile {
  filename:   string;
  sizeBytes:  number;
  createdAt:  string;
}

function fmtSize(bytes: number) {
  if (bytes < 1024)        return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function BackupPage() {
  const qc = useQueryClient();
  const [creating, setCreating] = useState(false);
  const [error, setError]       = useState<string | null>(null);

  const { data: backups = [], isLoading } = useQuery({
    queryKey: ["backups"],
    queryFn:  async () => (await api.get<BackupFile[]>("/backup")).data,
  });

  async function createBackup() {
    setCreating(true); setError(null);
    try {
      await api.post("/backup");
      qc.invalidateQueries({ queryKey: ["backups"] });
    } catch (e: any) {
      setError(e?.response?.data?.error ?? "Backup failed");
    } finally {
      setCreating(false);
    }
  }

  async function deleteBackup(filename: string) {
    if (!confirm(`Delete backup "${filename}"? This cannot be undone.`)) return;
    try {
      await api.delete(`/backup/${encodeURIComponent(filename)}`);
      qc.invalidateQueries({ queryKey: ["backups"] });
    } catch (e: any) {
      setError(e?.response?.data?.error ?? "Delete failed");
    }
  }

  return (
    <div className="max-w-3xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">Backup & Restore</h1>
          <p className="text-sm text-slate-500 mt-1">
            Create and download database backups. SQLite backups are a copy of the .db file.
            PostgreSQL backups use <code className="text-xs bg-slate-100 px-1 rounded">pg_dump</code>.
          </p>
        </div>
        <button
          onClick={createBackup}
          disabled={creating}
          className="bg-brand-500 hover:bg-brand-600 text-white text-sm font-medium px-4 py-2 rounded-md disabled:opacity-60"
        >
          {creating ? "Creating…" : "⬇ Create Backup Now"}
        </button>
      </div>

      {error && (
        <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg p-3">{error}</div>
      )}

      {/* Info banner */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-sm text-blue-800 space-y-1">
        <p className="font-semibold">How backups work</p>
        <p><strong>SQLite (local dev):</strong> Copies the <code className="bg-blue-100 px-1 rounded text-xs">dev.db</code> file to <code className="bg-blue-100 px-1 rounded text-xs">./backups/</code>. Download and keep a copy offsite.</p>
        <p><strong>PostgreSQL (production):</strong> Runs <code className="bg-blue-100 px-1 rounded text-xs">pg_dump</code> on the server. Requires <code className="bg-blue-100 px-1 rounded text-xs">postgresql-client</code> to be installed.</p>
        <p className="text-blue-600 text-xs">Backups do not include uploaded files — back up your <code className="bg-blue-100 px-1 rounded">./storage/</code> folder separately.</p>
      </div>

      {/* Restore instructions */}
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-800">
        <p className="font-semibold mb-2">Restore Instructions</p>
        <p className="font-medium text-xs mb-1">SQLite:</p>
        <code className="block bg-amber-100 rounded p-2 text-xs mb-3">
          cp orthocore-sqlite-TIMESTAMP.db ./dev.db
        </code>
        <p className="font-medium text-xs mb-1">PostgreSQL:</p>
        <code className="block bg-amber-100 rounded p-2 text-xs">
          psql "$DATABASE_URL" &lt; orthocore-pg-TIMESTAMP.sql
        </code>
      </div>

      {/* Backup list */}
      {isLoading && <p className="text-slate-400 text-sm">Loading backups…</p>}

      {!isLoading && backups.length === 0 && (
        <div className="text-center py-12 text-slate-400 text-sm border border-dashed border-slate-200 rounded-xl">
          No backups yet. Click "Create Backup Now" to start.
        </div>
      )}

      {backups.length > 0 && (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-4 py-2.5 text-left text-xs font-semibold text-slate-500">Filename</th>
                <th className="px-4 py-2.5 text-left text-xs font-semibold text-slate-500">Size</th>
                <th className="px-4 py-2.5 text-left text-xs font-semibold text-slate-500">Created</th>
                <th className="px-4 py-2.5 w-24"></th>
              </tr>
            </thead>
            <tbody>
              {backups.map((b) => (
                <tr key={b.filename} className="border-t border-slate-50 hover:bg-slate-50">
                  <td className="px-4 py-3 font-mono text-xs text-slate-600">{b.filename}</td>
                  <td className="px-4 py-3 text-slate-500 text-xs">{fmtSize(b.sizeBytes)}</td>
                  <td className="px-4 py-3 text-slate-500 text-xs">
                    {new Date(b.createdAt).toLocaleString()}
                  </td>
                  <td className="px-4 py-3 flex items-center gap-2 justify-end">
                    <a
                      href={`/api/backup/${encodeURIComponent(b.filename)}`}
                      download
                      className="text-xs text-brand-600 hover:underline"
                    >
                      ↓ Download
                    </a>
                    <button
                      onClick={() => deleteBackup(b.filename)}
                      className="text-xs text-red-500 hover:underline"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
