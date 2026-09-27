import { prisma } from "../../config/prisma";
import { NotFoundError, AppError } from "../../middleware/error";

// Maps a template's moduleKey to the permission required to write a response for it.
// Used by the controller to enforce RBAC dynamically since examination/diagnosis/treatment_plan
// all share this same generic FormResponse mechanism.
export const MODULE_PERMISSION: Record<string, string> = {
  examination: "examinations.manage",
  diagnosis: "diagnoses.manage",
  treatment_plan: "treatment_plans.manage",
};

export async function getTemplateModuleKey(templateId: string): Promise<string> {
  const template = await prisma.formTemplate.findUnique({ where: { id: templateId } });
  if (!template) throw new NotFoundError("Form template not found");
  return template.moduleKey;
}

// Validates submitted data against required fields defined on the template. Unknown extra
// keys are tolerated (forward compatibility); missing required fields are rejected.
async function validateAgainstTemplate(templateId: string, data: Record<string, any>) {
  const template = await prisma.formTemplate.findUnique({
    where: { id: templateId },
    include: { sections: { include: { fields: true } } },
  });
  if (!template) throw new NotFoundError("Form template not found");

  const missing: string[] = [];
  for (const section of template.sections) {
    if (!section.isEnabled) continue;
    for (const field of section.fields) {
      if (!field.isEnabled || !field.isRequired) continue;
      const val = data[field.fieldKey];
      if (val === undefined || val === null || val === "") {
        missing.push(field.label);
      }
    }
  }
  if (missing.length > 0) {
    throw new AppError(`Missing required fields: ${missing.join(", ")}`, 422);
  }
}

export async function listResponses(templateId: string, patientId: string) {
  return prisma.formResponse.findMany({
    where: { templateId, patientId },
    orderBy: { createdAt: "desc" },
  });
}

export async function getLatestResponse(templateId: string, patientId: string) {
  return prisma.formResponse.findFirst({
    where: { templateId, patientId },
    orderBy: { createdAt: "desc" },
  });
}

export async function submitResponse(
  input: { templateId: string; patientId: string; data: Record<string, any> },
  createdById: string
) {
  await validateAgainstTemplate(input.templateId, input.data);
  return prisma.formResponse.create({
    data: {
      templateId: input.templateId,
      patientId: input.patientId,
      data: input.data,
      createdById,
    },
  });
}
