import { useState } from "react";
import { FormSection } from "../../types";
import { api } from "../../api/client";
import { FieldEditorPanel } from "./FieldEditorPanel";
import { NewFieldForm } from "./NewFieldForm";

interface Props {
  section: FormSection;
  sectionIndex: number;
  totalSections: number;
  onRefresh: () => void;
}

export function SectionEditorPanel({ section, sectionIndex, totalSections, onRefresh }: Props) {
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState(section.title);
  const [expandedFieldId, setExpandedFieldId] = useState<string | null>(null);
  const [addingField, setAddingField] = useState(false);

  async function saveTitle() {
    if (titleDraft.trim() === section.title) { setEditingTitle(false); return; }
    await api.patch(`/form-templates/sections/${section.id}`, { title: titleDraft.trim() });
    setEditingTitle(false);
    onRefresh();
  }

  async function toggleSection() {
    await api.patch(`/form-templates/sections/${section.id}`, { isEnabled: !section.isEnabled });
    onRefresh();
  }

  async function deleteSection() {
    if (!confirm(`Delete section "${section.title}" and all its fields? This cannot be undone.`)) return;
    await api.delete(`/form-templates/sections/${section.id}`);
    onRefresh();
  }

  async function moveSection(direction: "up" | "down") {
    const newOrder = direction === "up" ? section.order - 1 : section.order + 1;
    await api.patch(`/form-templates/sections/${section.id}`, { order: newOrder });
    onRefresh();
  }

  return (
    <div className={`border rounded-lg overflow-hidden ${section.isEnabled ? "border-slate-200" : "border-slate-100 opacity-60"}`}>
      {/* Section header */}
      <div className="flex items-center gap-2 bg-slate-100 px-4 py-2.5">
        {editingTitle ? (
          <input
            autoFocus
            value={titleDraft}
            onChange={(e) => setTitleDraft(e.target.value)}
            onBlur={saveTitle}
            onKeyDown={(e) => e.key === "Enter" && saveTitle()}
            className="flex-1 border border-slate-300 rounded px-2 py-1 text-sm font-medium"
          />
        ) : (
          <span
            className="flex-1 font-medium text-sm cursor-pointer hover:text-brand-700"
            onClick={() => setEditingTitle(true)}
            title="Click to rename"
          >
            {section.title}
            {!section.isEnabled && (
              <span className="ml-2 text-xs font-normal text-slate-400">(disabled)</span>
            )}
          </span>
        )}

        <span className="text-xs text-slate-400">{section.fields.length} field{section.fields.length !== 1 ? "s" : ""}</span>

        <div className="flex items-center gap-1">
          <button
            onClick={() => moveSection("up")}
            disabled={sectionIndex === 0}
            title="Move section up"
            className="px-1.5 py-0.5 text-slate-400 hover:text-slate-700 disabled:opacity-30 text-xs"
          >↑</button>
          <button
            onClick={() => moveSection("down")}
            disabled={sectionIndex === totalSections - 1}
            title="Move section down"
            className="px-1.5 py-0.5 text-slate-400 hover:text-slate-700 disabled:opacity-30 text-xs"
          >↓</button>
          <button
            onClick={toggleSection}
            className={`px-2 py-0.5 text-xs rounded border ${section.isEnabled ? "border-amber-300 text-amber-700 hover:bg-amber-50" : "border-green-300 text-green-700 hover:bg-green-50"}`}
          >
            {section.isEnabled ? "Disable" : "Enable"}
          </button>
          <button
            onClick={deleteSection}
            className="px-2 py-0.5 text-xs rounded border border-red-200 text-red-600 hover:bg-red-50"
          >
            Delete
          </button>
        </div>
      </div>

      {/* Fields */}
      <div className="p-3 space-y-2">
        {section.fields
          .sort((a, b) => a.order - b.order)
          .map((field) => (
            <div key={field.id}>
              {/* Collapsed field row */}
              {expandedFieldId !== field.id && (
                <div
                  className={`flex items-center justify-between px-3 py-2 rounded border cursor-pointer hover:bg-slate-50 ${
                    !field.isEnabled ? "border-slate-100 opacity-50" : "border-slate-200"
                  }`}
                  onClick={() =>
                    setExpandedFieldId((prev) => (prev === field.id ? null : field.id))
                  }
                >
                  <div className="flex items-center gap-3 text-sm">
                    <span className="font-medium">{field.label}</span>
                    <span className="text-xs bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded">
                      {field.type}
                    </span>
                    {field.isRequired && (
                      <span className="text-xs text-red-500">required</span>
                    )}
                    {(field.options ?? []).length > 0 && (
                      <span className="text-xs text-slate-400">
                        {field.options!.length} option{field.options!.length !== 1 ? "s" : ""}
                      </span>
                    )}
                  </div>
                  <span className="text-xs text-brand-500">Edit ▾</span>
                </div>
              )}

              {/* Expanded editor */}
              {expandedFieldId === field.id && (
                <FieldEditorPanel
                  field={field}
                  onSaved={() => { setExpandedFieldId(null); onRefresh(); }}
                  onDelete={() => { setExpandedFieldId(null); onRefresh(); }}
                />
              )}
            </div>
          ))}

        {section.fields.length === 0 && !addingField && (
          <p className="text-xs text-slate-400 italic px-2">No fields in this section yet.</p>
        )}

        {addingField ? (
          <NewFieldForm
            sectionId={section.id}
            nextOrder={section.fields.length}
            onSaved={() => { setAddingField(false); onRefresh(); }}
            onCancel={() => setAddingField(false)}
          />
        ) : (
          <button
            onClick={() => { setAddingField(true); setExpandedFieldId(null); }}
            className="mt-1 text-xs text-brand-600 hover:underline"
          >
            + Add field
          </button>
        )}
      </div>
    </div>
  );
}
