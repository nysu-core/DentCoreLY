import { useState } from "react";
import { FieldType } from "../../types";
import { OptionsEditor } from "./OptionsEditor";
import { api } from "../../api/client";

const FIELD_TYPES: FieldType[] = [
  "TEXT", "NUMBER", "TEXTAREA", "DATE",
  "CHECKBOX", "RADIO", "SELECT", "MULTISELECT",
];
const NEEDS_OPTIONS: FieldType[] = ["RADIO", "SELECT", "MULTISELECT"];

function toFieldKey(label: string) {
  return label
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_|_$/g, "");
}

interface Props {
  sectionId: string;
  nextOrder: number;
  onSaved: () => void;
  onCancel: () => void;
}

export function NewFieldForm({ sectionId, nextOrder, onSaved, onCancel }: Props) {
  const [label, setLabel] = useState("");
  const [fieldKey, setFieldKey] = useState("");
  const [keyManual, setKeyManual] = useState(false);
  const [type, setType] = useState<FieldType>("TEXT");
  const [options, setOptions] = useState<string[]>([]);
  const [isRequired, setIsRequired] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handleLabelChange(val: string) {
    setLabel(val);
    if (!keyManual) setFieldKey(toFieldKey(val));
  }

  async function save() {
    if (!label.trim()) { setError("Label is required"); return; }
    if (!fieldKey.trim()) { setError("Field key is required"); return; }
    setSaving(true);
    setError(null);
    try {
      await api.post(`/form-templates/sections/${sectionId}/fields`, {
        label: label.trim(),
        fieldKey: fieldKey.trim(),
        type,
        options: NEEDS_OPTIONS.includes(type) ? options : undefined,
        isRequired,
        order: nextOrder,
      });
      onSaved();
    } catch (e: any) {
      setError(e?.response?.data?.error ?? "Save failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="border border-green-200 bg-green-50 rounded-lg p-3 space-y-3 text-sm">
      <p className="text-xs font-semibold text-green-700">New Field</p>

      {error && (
        <div className="text-xs text-red-600 bg-red-50 border border-red-200 rounded p-2">{error}</div>
      )}

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">Label *</label>
          <input
            value={label}
            onChange={(e) => handleLabelChange(e.target.value)}
            className="w-full border border-slate-300 rounded px-2 py-1.5 text-sm"
            placeholder="e.g. Facial Profile"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">
            Field Key *{" "}
            <span className="text-slate-400 font-normal">(snake_case, auto-filled)</span>
          </label>
          <input
            value={fieldKey}
            onChange={(e) => { setFieldKey(e.target.value); setKeyManual(true); }}
            className="w-full border border-slate-300 rounded px-2 py-1.5 text-sm font-mono"
            placeholder="facial_profile"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
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
        <div className="flex items-end gap-4 pb-1">
          <label className="inline-flex items-center gap-2 text-xs">
            <input
              type="checkbox"
              checked={isRequired}
              onChange={(e) => setIsRequired(e.target.checked)}
              className="rounded border-slate-300"
            />
            Required
          </label>
        </div>
      </div>

      {NEEDS_OPTIONS.includes(type) && (
        <OptionsEditor options={options} onChange={setOptions} />
      )}

      <div className="flex items-center gap-2 pt-1">
        <button
          type="button"
          onClick={save}
          disabled={saving}
          className="px-3 py-1.5 bg-green-600 text-white text-xs font-medium rounded hover:bg-green-700 disabled:opacity-60"
        >
          {saving ? "Adding…" : "Add field"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="px-3 py-1.5 text-xs text-slate-600 border border-slate-200 rounded hover:bg-slate-50"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
