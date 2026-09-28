import { useState } from "react";
import { FormField, FieldType } from "../../types";
import { OptionsEditor } from "./OptionsEditor";
import { api } from "../../api/client";

const FIELD_TYPES: FieldType[] = [
  "TEXT", "NUMBER", "TEXTAREA", "DATE",
  "CHECKBOX", "RADIO", "SELECT", "MULTISELECT",
];

const NEEDS_OPTIONS: FieldType[] = ["RADIO", "SELECT", "MULTISELECT"];

interface Props {
  field: FormField;
  onSaved: () => void;
  onDelete: () => void;
}

export function FieldEditorPanel({ field, onSaved, onDelete }: Props) {
  const [label, setLabel] = useState(field.label);
  const [type, setType] = useState<FieldType>(field.type);
  const [options, setOptions] = useState<string[]>(field.options ?? []);
  const [isRequired, setIsRequired] = useState(field.isRequired);
  const [isEnabled, setIsEnabled] = useState(field.isEnabled);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    setSaving(true);
    setError(null);
    try {
      await api.patch(`/form-templates/fields/${field.id}`, {
        label,
        type,
        options: NEEDS_OPTIONS.includes(type) ? options : undefined,
        isRequired,
        isEnabled,
      });
      onSaved();
    } catch (e: any) {
      setError(e?.response?.data?.error ?? "Save failed");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!confirm(`Delete field "${field.label}"? This cannot be undone.`)) return;
    try {
      await api.delete(`/form-templates/fields/${field.id}`);
      onDelete();
    } catch (e: any) {
      setError(e?.response?.data?.error ?? "Delete failed");
    }
  }

  return (
    <div className="border border-brand-200 bg-brand-50 rounded-lg p-3 space-y-3 text-sm">
      {error && (
        <div className="text-xs text-red-600 bg-red-50 border border-red-200 rounded p-2">{error}</div>
      )}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">Label</label>
          <input
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            className="w-full border border-slate-300 rounded px-2 py-1.5 text-sm"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">Field Type</label>
          <select
            value={type}
            onChange={(e) => setType(e.target.value as FieldType)}
            className="w-full border border-slate-300 rounded px-2 py-1.5 text-sm"
          >
            {FIELD_TYPES.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="flex gap-4">
        <label className="inline-flex items-center gap-2 text-xs">
          <input
            type="checkbox"
            checked={isRequired}
            onChange={(e) => setIsRequired(e.target.checked)}
            className="rounded border-slate-300"
          />
          Required
        </label>
        <label className="inline-flex items-center gap-2 text-xs">
          <input
            type="checkbox"
            checked={isEnabled}
            onChange={(e) => setIsEnabled(e.target.checked)}
            className="rounded border-slate-300"
          />
          Enabled
        </label>
      </div>

      {NEEDS_OPTIONS.includes(type) && (
        <OptionsEditor options={options} onChange={setOptions} />
      )}

      <div className="flex items-center gap-2 pt-1">
        <button
          type="button"
          onClick={save}
          disabled={saving}
          className="px-3 py-1.5 bg-brand-500 text-white text-xs font-medium rounded hover:bg-brand-600 disabled:opacity-60"
        >
          {saving ? "Saving…" : "Save field"}
        </button>
        <button
          type="button"
          onClick={handleDelete}
          className="px-3 py-1.5 text-xs text-red-600 border border-red-200 rounded hover:bg-red-50"
        >
          Delete field
        </button>
      </div>
    </div>
  );
}
