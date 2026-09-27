import { FormTemplate, FormField } from "../types";

interface Props {
  template: FormTemplate;
  values: Record<string, any>;
  onChange: (fieldKey: string, value: any) => void;
  readOnly?: boolean;
}

function FieldInput({ field, value, onChange, readOnly }: { field: FormField; value: any; onChange: (v: any) => void; readOnly?: boolean }) {
  const baseClass = "w-full border border-slate-300 rounded-md px-3 py-2 text-sm disabled:bg-slate-50";

  switch (field.type) {
    case "TEXT":
      return <input type="text" disabled={readOnly} value={value || ""} onChange={(e) => onChange(e.target.value)} className={baseClass} />;
    case "NUMBER":
      return <input type="number" disabled={readOnly} value={value ?? ""} onChange={(e) => onChange(e.target.value === "" ? "" : Number(e.target.value))} className={baseClass} />;
    case "DATE":
      return <input type="date" disabled={readOnly} value={value || ""} onChange={(e) => onChange(e.target.value)} className={baseClass} />;
    case "TEXTAREA":
      return <textarea disabled={readOnly} value={value || ""} onChange={(e) => onChange(e.target.value)} rows={3} className={baseClass} />;
    case "CHECKBOX":
      return (
        <label className="inline-flex items-center gap-2 text-sm">
          <input type="checkbox" disabled={readOnly} checked={!!value} onChange={(e) => onChange(e.target.checked)} className="rounded border-slate-300" />
          <span className="text-slate-600">Yes</span>
        </label>
      );
    case "RADIO":
      return (
        <div className="flex flex-wrap gap-3">
          {(field.options || []).map((opt) => (
            <label key={opt} className="inline-flex items-center gap-1.5 text-sm">
              <input type="radio" disabled={readOnly} name={field.fieldKey} checked={value === opt} onChange={() => onChange(opt)} />
              {opt}
            </label>
          ))}
        </div>
      );
    case "SELECT":
      return (
        <select disabled={readOnly} value={value || ""} onChange={(e) => onChange(e.target.value)} className={baseClass}>
          <option value="">Select...</option>
          {(field.options || []).map((opt) => (
            <option key={opt} value={opt}>
              {opt}
            </option>
          ))}
        </select>
      );
    case "MULTISELECT": {
      const selected: string[] = Array.isArray(value) ? value : [];
      function toggle(opt: string) {
        if (selected.includes(opt)) onChange(selected.filter((o) => o !== opt));
        else onChange([...selected, opt]);
      }
      return (
        <div className="flex flex-wrap gap-3">
          {(field.options || []).map((opt) => (
            <label key={opt} className="inline-flex items-center gap-1.5 text-sm">
              <input type="checkbox" disabled={readOnly} checked={selected.includes(opt)} onChange={() => toggle(opt)} className="rounded border-slate-300" />
              {opt}
            </label>
          ))}
        </div>
      );
    }
    default:
      return null;
  }
}

// Renders a complete clinical form purely from FormTemplate metadata. This is what allows
// Administrators to redesign examination/diagnosis/treatment-plan forms with zero frontend changes.
export function FormRenderer({ template, values, onChange, readOnly }: Props) {
  return (
    <div className="space-y-6">
      {template.sections
        .filter((s) => s.isEnabled)
        .sort((a, b) => a.order - b.order)
        .map((section) => (
          <div key={section.id} className="bg-white border border-slate-200 rounded-lg p-4">
            <h3 className="font-semibold text-sm text-slate-700 mb-4">{section.title}</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {section.fields
                .filter((f) => f.isEnabled)
                .sort((a, b) => a.order - b.order)
                .map((field) => (
                  <div key={field.id} className={field.type === "TEXTAREA" || field.type === "MULTISELECT" ? "md:col-span-2" : ""}>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      {field.label}
                      {field.isRequired && <span className="text-red-500 ml-0.5">*</span>}
                    </label>
                    <FieldInput field={field} value={values[field.fieldKey]} onChange={(v) => onChange(field.fieldKey, v)} readOnly={readOnly} />
                  </div>
                ))}
            </div>
          </div>
        ))}
    </div>
  );
}
