import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../api/client";
import { FormTemplate, FormResponse, Patient } from "../types";
import { FormRenderer } from "../components/FormRenderer";

interface Props {
  moduleKey: "medical_history" | "examination" | "diagnosis" | "treatment_plan";
  title: string;
}

export function ClinicalFormPage({ moduleKey, title }: Props) {
  const { id: patientId } = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const [values, setValues] = useState<Record<string, any>>({});
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const { data: patient } = useQuery({
    queryKey: ["patient", patientId],
    queryFn: async () => (await api.get<Patient>(`/patients/${patientId}`)).data,
  });

  const departmentId = patient?.enrollments[0]?.departmentId;

  const { data: template, isLoading: templateLoading } = useQuery({
    enabled: !!departmentId,
    queryKey: ["form-template-active", departmentId, moduleKey],
    queryFn: async () => (await api.get<FormTemplate>("/form-templates/active", { params: { departmentId, moduleKey } })).data,
  });

  const { data: latestResponse } = useQuery({
    enabled: !!template,
    queryKey: ["form-response-latest", template?.id, patientId],
    queryFn: async () => (await api.get<FormResponse | null>("/form-responses/latest", { params: { templateId: template!.id, patientId } })).data,
  });

  useEffect(() => {
    if (latestResponse?.data) setValues(latestResponse.data);
  }, [latestResponse]);

  async function handleSubmit() {
    if (!template) return;
    setError(null);
    setSaved(false);
    setSubmitting(true);
    try {
      await api.post("/form-responses", { templateId: template.id, patientId, data: values });
      setSaved(true);
      queryClient.invalidateQueries({ queryKey: ["form-response-latest", template.id, patientId] });
    } catch (err: any) {
      setError(err?.response?.data?.error || "Failed to save.");
    } finally {
      setSubmitting(false);
    }
  }

  if (templateLoading || !template) return <div className="text-slate-500 text-sm">Loading form...</div>;

  return (
    <div>
      <h1 className="text-xl font-bold mb-1">{title}</h1>
      <p className="text-sm text-slate-500 mb-6">{patient?.fullName} — File #{patient?.fileNumber}</p>

      {error && <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded p-2 mb-4">{error}</div>}
      {saved && <div className="text-sm text-green-700 bg-green-50 border border-green-200 rounded p-2 mb-4">Saved successfully.</div>}

      <FormRenderer template={template} values={values} onChange={(k, v) => setValues((prev) => ({ ...prev, [k]: v }))} />

      <button
        onClick={handleSubmit}
        disabled={submitting}
        className="mt-6 bg-brand-500 hover:bg-brand-600 text-white font-medium px-4 py-2 rounded-md disabled:opacity-60"
      >
        {submitting ? "Saving..." : "Save"}
      </button>
    </div>
  );
}
