import { z } from "zod";

export const fieldTypeEnum = z.enum(["TEXT", "NUMBER", "CHECKBOX", "RADIO", "SELECT", "MULTISELECT", "TEXTAREA", "DATE"]);

export const createTemplateSchema = z.object({
  departmentId: z.string().uuid(),
  name: z.string().min(2),
  moduleKey: z.enum(["examination", "diagnosis", "treatment_plan"]),
});

export const updateTemplateSchema = z.object({
  name: z.string().min(2).optional(),
  isActive: z.boolean().optional(),
});

export const createSectionSchema = z.object({
  title: z.string().min(1),
  order: z.number().int().nonnegative(),
});

export const updateSectionSchema = z.object({
  title: z.string().min(1).optional(),
  order: z.number().int().nonnegative().optional(),
  isEnabled: z.boolean().optional(),
});

export const createFieldSchema = z.object({
  label: z.string().min(1),
  fieldKey: z
    .string()
    .min(1)
    .regex(/^[a-z0-9_]+$/, "fieldKey must be snake_case (lowercase letters, numbers, underscores)"),
  type: fieldTypeEnum,
  options: z.array(z.string()).optional(),
  isRequired: z.boolean().default(false),
  order: z.number().int().nonnegative(),
});

export const updateFieldSchema = z.object({
  label: z.string().min(1).optional(),
  type: fieldTypeEnum.optional(),
  options: z.array(z.string()).optional(),
  isRequired: z.boolean().optional(),
  order: z.number().int().nonnegative().optional(),
  isEnabled: z.boolean().optional(),
});

export const reorderSchema = z.object({
  items: z.array(z.object({ id: z.string().uuid(), order: z.number().int().nonnegative() })),
});
