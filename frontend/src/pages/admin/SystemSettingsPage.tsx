import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../../api/client";

interface ConfigEntry {
  key:         string;
  value:       string;
  description: string | null;
  updatedAt:   string;
}

// Group keys into logical sections for display
const SECTIONS: { title: string; keys: string[] }[] = [
  {
    title: "Clinic Information",
    keys: ["clinic.name", "clinic.address", "clinic.phone", "clinic.email"],
  },
  {
    title: "Appointments",
    keys: [
      "appointments.defaultDuration",
      "appointments.workdayStart",
      "appointments.workdayEnd",
      "reminders.defaultHoursBefore",
    ],
  },
  {
    title: "Registration",
    keys: ["registration.requiresApproval", "registration.allowedRoles"],
  },
  {
    title: "Files",
    keys: ["files.maxSizeMb"],
  },
];

const KEY_LABELS: Record<string, string> = {
  "clinic.name":                   "Clinic Name",
  "clinic.address":                "Clinic Address",
  "clinic.phone":                  "Clinic Phone",
  "clinic.email":                  "Clinic Email",
  "appointments.defaultDuration":  "Default Appointment Duration (minutes)",
  "appointments.workdayStart":     "Working Hours Start (HH:MM)",
  "appointments.workdayEnd":       "Working Hours End (HH:MM)",
  "reminders.defaultHoursBefore":  "Reminder Hours Before (e.g. 24,2)",
  "registration.requiresApproval": "Require Admin Approval for Registration (true/false)",
  "registration.allowedRoles":     "Self-Registerable Roles (comma-separated)",
  "files.maxSizeMb":               "Max Upload File Size (MB)",
  "research.anonSaltConfigured":   "Anonymisation Salt Configured",
};

export function SystemSettingsPage() {
  const qc = useQueryClient();
  const [edits, setEdits]   = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [saved, setSaved]   = useState(false);
  const [error, setError]   = useState<string | null>(null);

  const { data: configs = [], isLoading } = useQuery({
    queryKey: ["system-config"],
    queryFn: async () => (await api.get<ConfigEntry[]>("/system-config")).data,
  });

  const configMap = Object.fromEntries(configs.map((c) => [c.key, c]));

  function getValue(key: string) {
    return edits[key] ?? configMap[key]?.value ?? "";
  }

  function handleChange(key: string, value: string) {
    setEdits((prev) => ({ ...prev, [key]: value }));
    setSaved(false);
  }

  async function saveAll() {
    const updates = Object.entries(edits).map(([key, value]) => ({ key, value }));
    if (updates.length === 0) return;
    setSaving(true); setError(null);
    try {
      await api.patch("/system-config", { updates });
      setEdits({});
      setSaved(true);
      qc.invalidateQueries({ queryKey: ["system-config"] });
    } catch (e: any) {
      setError(e?.response?.data?.error ?? "Save failed");
    } finally {
      setSaving(false);
    }
  }

  const hasChanges = Object.keys(edits).length > 0;

  if (isLoading) return <div className="text-slate-400 text-sm">Loading…</div>;

  return (
    <div className="max-w-3xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">System Settings</h1>
          <p className="text-sm text-slate-500 mt-1">
            Configure clinic details, scheduling defaults, and registration behaviour. Changes take effect immediately.
          </p>
        </div>
        <div className="flex items-center gap-3">
          {saved && <span className="text-sm text-green-600">✓ Saved</span>}
          <button
            onClick={saveAll}
            disabled={!hasChanges || saving}
            className="bg-brand-500 hover:bg-brand-600 text-white text-sm font-medium px-4 py-2 rounded-md disabled:opacity-40"
          >
            {saving ? "Saving…" : "Save Changes"}
          </button>
        </div>
      </div>

      {error && (
        <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg p-3">{error}</div>
      )}

      {SECTIONS.map((section) => (
        <div key={section.title} className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <div className="bg-slate-50 border-b border-slate-200 px-5 py-3">
            <h2 className="font-semibold text-sm text-slate-700">{section.title}</h2>
          </div>
          <div className="divide-y divide-slate-100">
            {section.keys.map((key) => {
              const cfg   = configMap[key];
              const value = getValue(key);
              const dirty = edits[key] !== undefined;

              return (
                <div key={key} className="px-5 py-4 flex items-start gap-4">
                  <div className="flex-1 min-w-0">
                    <label className="block text-sm font-medium text-slate-700 mb-0.5">
                      {KEY_LABELS[key] ?? key}
                      {dirty && <span className="ml-2 text-xs text-amber-500">• unsaved</span>}
                    </label>
                    {cfg?.description && (
                      <p className="text-xs text-slate-400 mb-2">{cfg.description}</p>
                    )}
                    <input
                      value={value}
                      onChange={(e) => handleChange(key, e.target.value)}
                      className={`w-full border rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400 ${
                        dirty ? "border-amber-300 bg-amber-50" : "border-slate-300"
                      }`}
                    />
                  </div>
                  {cfg?.updatedAt && (
                    <p className="text-xs text-slate-400 whitespace-nowrap pt-7">
                      {new Date(cfg.updatedAt).toLocaleDateString()}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ))}

      {/* All keys not in sections */}
      {configs.filter((c) => !SECTIONS.flatMap((s) => s.keys).includes(c.key)).length > 0 && (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <div className="bg-slate-50 border-b border-slate-200 px-5 py-3">
            <h2 className="font-semibold text-sm text-slate-700">Other Settings</h2>
          </div>
          <div className="divide-y divide-slate-100">
            {configs
              .filter((c) => !SECTIONS.flatMap((s) => s.keys).includes(c.key))
              .map((cfg) => (
                <div key={cfg.key} className="px-5 py-4">
                  <label className="block text-xs font-mono text-slate-500 mb-1">{cfg.key}</label>
                  {cfg.description && <p className="text-xs text-slate-400 mb-2">{cfg.description}</p>}
                  <input
                    value={getValue(cfg.key)}
                    onChange={(e) => handleChange(cfg.key, e.target.value)}
                    className="w-full border border-slate-300 rounded-md px-3 py-1.5 text-sm"
                  />
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}
