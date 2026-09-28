import { useState, useEffect } from "react";
import { api } from "../../api/client";
import { Department, FormTemplate } from "../../types";
import { SectionEditorPanel } from "../../components/admin/SectionEditorPanel";

const MODULE_KEYS = [
  { key: "medical_history", label: "Medical History" },
  { key: "examination", label: "Clinical Examination" },
  { key: "diagnosis", label: "Diagnosis" },
  { key: "treatment_plan", label: "Treatment Plan" },
];

export function FormBuilderPage() {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [departmentId, setDepartmentId] = useState("");
  const [moduleKey, setModuleKey] = useState("examination");
  const [templates, setTemplates] = useState<FormTemplate[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<FormTemplate | null>(null);
  const [newTemplateName, setNewTemplateName] = useState("");
  const [creatingTemplate, setCreatingTemplate] = useState(false);
  const [newSectionTitle, setNewSectionTitle] = useState("");
  const [addingSection, setAddingSection] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.get<Department[]>("/departments").then((res) => {
      setDepartments(res.data);
      if (res.data[0]) setDepartmentId(res.data[0].id);
    });
  }, []);

  useEffect(() => {
    if (!departmentId) return;
    loadTemplates();
    setSelectedTemplate(null);
  }, [departmentId, moduleKey]);

  async function loadTemplates() {
    const { data } = await api.get<FormTemplate[]>("/form-templates", {
      params: { departmentId, moduleKey },
    });
    setTemplates(data);
  }

  async function openTemplate(id: string) {
    const { data } = await api.get<FormTemplate>(`/form-templates/${id}`);
    setSelectedTemplate({ ...data, sections: data.sections.sort((a, b) => a.order - b.order) });
  }

  async function refreshSelected() {
    if (selectedTemplate) await openTemplate(selectedTemplate.id);
  }

  async function createTemplate() {
    if (!newTemplateName.trim()) return;
    setError(null);
    try {
      const { data } = await api.post<FormTemplate>("/form-templates", {
        departmentId,
        name: newTemplateName.trim(),
        moduleKey,
      });
      setNewTemplateName("");
      setCreatingTemplate(false);
      await loadTemplates();
      await openTemplate(data.id);
    } catch (e: any) {
      setError(e?.response?.data?.error ?? "Failed to create template");
    }
  }

  async function addSection() {
    if (!selectedTemplate || !newSectionTitle.trim()) return;
    setError(null);
    try {
      await api.post(`/form-templates/${selectedTemplate.id}/sections`, {
        title: newSectionTitle.trim(),
        order: selectedTemplate.sections.length,
      });
      setNewSectionTitle("");
      setAddingSection(false);
      await refreshSelected();
    } catch (e: any) {
      setError(e?.response?.data?.error ?? "Failed to add section");
    }
  }

  async function toggleTemplateActive() {
    if (!selectedTemplate) return;
    await api.patch(`/form-templates/${selectedTemplate.id}`, {
      isActive: !selectedTemplate.isActive,
    });
    await refreshSelected();
    await loadTemplates();
  }

  const sortedSections = [...(selectedTemplate?.sections ?? [])].sort((a, b) => a.order - b.order);

  return (
    <div className="max-w-6xl">
      <div className="mb-6">
        <h1 className="text-xl font-bold">Form Builder</h1>
        <p className="text-sm text-slate-500 mt-1">
          Configure examination, diagnosis, and treatment plan forms per department. Changes take effect immediately — no code deployment needed.
        </p>
      </div>

      {error && (
        <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded p-3 mb-4">{error}</div>
      )}

      {/* Controls */}
      <div className="flex flex-wrap gap-3 mb-6">
        <div>
          <label className="block text-xs font-medium text-slate-500 mb-1">Department</label>
          <select
            value={departmentId}
            onChange={(e) => setDepartmentId(e.target.value)}
            className="border border-slate-300 rounded-md px-3 py-2 text-sm"
          >
            {departments.map((d) => (
              <option key={d.id} value={d.id}>{d.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-500 mb-1">Module</label>
          <select
            value={moduleKey}
            onChange={(e) => setModuleKey(e.target.value)}
            className="border border-slate-300 rounded-md px-3 py-2 text-sm"
          >
            {MODULE_KEYS.map((m) => (
              <option key={m.key} value={m.key}>{m.label}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-4 md:gap-6">
        {/* Template list */}
        <div className="md:col-span-1">
          <div className="bg-white border border-slate-200 rounded-lg p-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-semibold text-slate-700">Templates</span>
              <button
                onClick={() => setCreatingTemplate((v) => !v)}
                className="text-xs text-brand-600 hover:underline"
              >
                {creatingTemplate ? "Cancel" : "+ New"}
              </button>
            </div>

            {creatingTemplate && (
              <div className="mb-3 space-y-1">
                <input
                  autoFocus
                  value={newTemplateName}
                  onChange={(e) => setNewTemplateName(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && createTemplate()}
                  placeholder="Template name…"
                  className="w-full border border-slate-300 rounded px-2 py-1.5 text-xs"
                />
                <button
                  onClick={createTemplate}
                  className="w-full py-1 bg-brand-500 text-white text-xs rounded hover:bg-brand-600"
                >
                  Create
                </button>
              </div>
            )}

            <ul className="space-y-0.5">
              {templates.map((t) => (
                <li key={t.id}>
                  <button
                    onClick={() => openTemplate(t.id)}
                    className={`w-full text-left px-2.5 py-2 rounded text-sm ${
                      selectedTemplate?.id === t.id
                        ? "bg-brand-100 text-brand-800 font-medium"
                        : "hover:bg-slate-50 text-slate-700"
                    }`}
                  >
                    {t.name}
                    {!t.isActive && (
                      <span className="ml-1 text-xs text-slate-400">(inactive)</span>
                    )}
                  </button>
                </li>
              ))}
              {templates.length === 0 && (
                <li className="text-xs text-slate-400 italic px-2 py-2">
                  No templates for this module yet.
                </li>
              )}
            </ul>
          </div>
        </div>

        {/* Section/field editor */}
        <div className="min-w-0 md:col-span-3">
          {!selectedTemplate && (
            <div className="bg-white border border-dashed border-slate-300 rounded-lg p-8 text-center text-sm text-slate-400">
              Select or create a template on the left to edit its sections and fields.
            </div>
          )}

          {selectedTemplate && (
            <div className="space-y-4">
              {/* Template header */}
              <div className="flex items-center justify-between bg-white border border-slate-200 rounded-lg px-4 py-3">
                <div>
                  <h2 className="font-semibold text-slate-800">{selectedTemplate.name}</h2>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {sortedSections.length} section{sortedSections.length !== 1 ? "s" : ""} ·{" "}
                    {sortedSections.reduce((acc, s) => acc + s.fields.length, 0)} fields
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                      selectedTemplate.isActive
                        ? "bg-green-100 text-green-700"
                        : "bg-slate-100 text-slate-500"
                    }`}
                  >
                    {selectedTemplate.isActive ? "Active" : "Inactive"}
                  </span>
                  <button
                    onClick={toggleTemplateActive}
                    className="text-xs border border-slate-200 rounded px-2 py-1 hover:bg-slate-50"
                  >
                    {selectedTemplate.isActive ? "Deactivate" : "Activate"}
                  </button>
                </div>
              </div>

              {/* Sections */}
              {sortedSections.map((section, idx) => (
                <SectionEditorPanel
                  key={section.id}
                  section={section}
                  sectionIndex={idx}
                  totalSections={sortedSections.length}
                  onRefresh={refreshSelected}
                />
              ))}

              {/* Add section */}
              {addingSection ? (
                <div className="bg-white border border-green-200 rounded-lg p-4 flex gap-2">
                  <input
                    autoFocus
                    value={newSectionTitle}
                    onChange={(e) => setNewSectionTitle(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && addSection()}
                    placeholder="New section title (e.g. Extraoral Examination)…"
                    className="flex-1 border border-slate-300 rounded px-3 py-1.5 text-sm"
                  />
                  <button
                    onClick={addSection}
                    className="px-3 py-1.5 bg-green-600 text-white text-sm rounded hover:bg-green-700"
                  >
                    Add
                  </button>
                  <button
                    onClick={() => { setAddingSection(false); setNewSectionTitle(""); }}
                    className="px-3 py-1.5 text-sm border border-slate-200 rounded hover:bg-slate-50"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setAddingSection(true)}
                  className="w-full py-3 border border-dashed border-slate-300 rounded-lg text-sm text-slate-500 hover:bg-slate-50 hover:border-brand-300 hover:text-brand-600 transition-colors"
                >
                  + Add section
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
