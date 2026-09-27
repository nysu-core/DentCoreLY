import { prisma } from "../../config/prisma";
import { NotFoundError } from "../../middleware/error";

const fullInclude = {
  sections: {
    orderBy: { order: "asc" as const },
    include: { fields: { orderBy: { order: "asc" as const } } },
  },
};

export async function listTemplates(departmentId?: string, moduleKey?: string) {
  return prisma.formTemplate.findMany({
    where: {
      ...(departmentId ? { departmentId } : {}),
      ...(moduleKey ? { moduleKey } : {}),
    },
    orderBy: { name: "asc" },
  });
}

// Returns the active template for a department+module fully hydrated with sections/fields,
// ordered for direct rendering by the frontend form engine.
export async function getActiveTemplate(departmentId: string, moduleKey: string) {
  const template = await prisma.formTemplate.findFirst({
    where: { departmentId, moduleKey, isActive: true },
    include: fullInclude,
  });
  if (!template) throw new NotFoundError(`No active "${moduleKey}" form template for this department`);
  return template;
}

export async function getTemplateById(id: string) {
  const template = await prisma.formTemplate.findUnique({ where: { id }, include: fullInclude });
  if (!template) throw new NotFoundError("Form template not found");
  return template;
}

export async function createTemplate(data: { departmentId: string; name: string; moduleKey: string }) {
  return prisma.formTemplate.create({ data, include: fullInclude });
}

export async function updateTemplate(id: string, data: { name?: string; isActive?: boolean }) {
  await getTemplateById(id);
  return prisma.formTemplate.update({ where: { id }, data, include: fullInclude });
}

// --- Sections ---

export async function addSection(templateId: string, data: { title: string; order: number }) {
  await getTemplateById(templateId);
  return prisma.formSection.create({ data: { templateId, ...data } });
}

export async function updateSection(
  sectionId: string,
  data: { title?: string; order?: number; isEnabled?: boolean }
) {
  const section = await prisma.formSection.findUnique({ where: { id: sectionId } });
  if (!section) throw new NotFoundError("Form section not found");
  return prisma.formSection.update({ where: { id: sectionId }, data });
}

export async function deleteSection(sectionId: string) {
  const section = await prisma.formSection.findUnique({ where: { id: sectionId } });
  if (!section) throw new NotFoundError("Form section not found");
  await prisma.formSection.delete({ where: { id: sectionId } });
}

export async function reorderSections(items: { id: string; order: number }[]) {
  await prisma.$transaction(items.map((i) => prisma.formSection.update({ where: { id: i.id }, data: { order: i.order } })));
}

// --- Fields ---

export async function addField(
  sectionId: string,
  data: { label: string; fieldKey: string; type: string; options?: string[]; isRequired: boolean; order: number }
) {
  const section = await prisma.formSection.findUnique({ where: { id: sectionId } });
  if (!section) throw new NotFoundError("Form section not found");
  return prisma.formField.create({ data: { sectionId, ...data } as any });
}

export async function updateField(
  fieldId: string,
  data: { label?: string; type?: string; options?: string[]; isRequired?: boolean; order?: number; isEnabled?: boolean }
) {
  const field = await prisma.formField.findUnique({ where: { id: fieldId } });
  if (!field) throw new NotFoundError("Form field not found");
  return prisma.formField.update({ where: { id: fieldId }, data: data as any });
}

export async function deleteField(fieldId: string) {
  const field = await prisma.formField.findUnique({ where: { id: fieldId } });
  if (!field) throw new NotFoundError("Form field not found");
  await prisma.formField.delete({ where: { id: fieldId } });
}

export async function reorderFields(items: { id: string; order: number }[]) {
  await prisma.$transaction(items.map((i) => prisma.formField.update({ where: { id: i.id }, data: { order: i.order } })));
}
