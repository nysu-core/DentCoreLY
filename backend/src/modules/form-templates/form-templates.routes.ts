import { Router } from "express";
import { asyncHandler } from "../../middleware/error";
import { authenticate, requirePermission } from "../../middleware/rbac";
import {
  createTemplateSchema,
  updateTemplateSchema,
  createSectionSchema,
  updateSectionSchema,
  createFieldSchema,
  updateFieldSchema,
  reorderSchema,
} from "./form-templates.schema";
import * as svc from "./form-templates.service";

export const formTemplatesRouter = Router();

formTemplatesRouter.use(authenticate);

// Any authenticated user can read templates (needed to render examination/diagnosis/treatment forms).
formTemplatesRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const { departmentId, moduleKey } = req.query as { departmentId?: string; moduleKey?: string };
    const templates = await svc.listTemplates(departmentId, moduleKey);
    res.json(templates);
  })
);

formTemplatesRouter.get(
  "/active",
  asyncHandler(async (req, res) => {
    const { departmentId, moduleKey } = req.query as { departmentId: string; moduleKey: string };
    const template = await svc.getActiveTemplate(departmentId, moduleKey);
    res.json(template);
  })
);

formTemplatesRouter.get(
  "/:id",
  asyncHandler(async (req, res) => {
    const template = await svc.getTemplateById(req.params.id);
    res.json(template);
  })
);

// --- Admin-only mutation routes (system.config permission) ---

formTemplatesRouter.post(
  "/",
  requirePermission("system.config"),
  asyncHandler(async (req, res) => {
    const data = createTemplateSchema.parse(req.body);
    const template = await svc.createTemplate(data);
    res.status(201).json(template);
  })
);

formTemplatesRouter.patch(
  "/:id",
  requirePermission("system.config"),
  asyncHandler(async (req, res) => {
    const data = updateTemplateSchema.parse(req.body);
    const template = await svc.updateTemplate(req.params.id, data);
    res.json(template);
  })
);

formTemplatesRouter.post(
  "/:id/sections",
  requirePermission("system.config"),
  asyncHandler(async (req, res) => {
    const data = createSectionSchema.parse(req.body);
    const section = await svc.addSection(req.params.id, data);
    res.status(201).json(section);
  })
);

formTemplatesRouter.patch(
  "/sections/:sectionId",
  requirePermission("system.config"),
  asyncHandler(async (req, res) => {
    const data = updateSectionSchema.parse(req.body);
    const section = await svc.updateSection(req.params.sectionId, data);
    res.json(section);
  })
);

formTemplatesRouter.delete(
  "/sections/:sectionId",
  requirePermission("system.config"),
  asyncHandler(async (req, res) => {
    await svc.deleteSection(req.params.sectionId);
    res.status(204).send();
  })
);

formTemplatesRouter.post(
  "/sections/reorder",
  requirePermission("system.config"),
  asyncHandler(async (req, res) => {
    const { items } = reorderSchema.parse(req.body);
    await svc.reorderSections(items);
    res.status(204).send();
  })
);

formTemplatesRouter.post(
  "/sections/:sectionId/fields",
  requirePermission("system.config"),
  asyncHandler(async (req, res) => {
    const data = createFieldSchema.parse(req.body);
    const field = await svc.addField(req.params.sectionId, data);
    res.status(201).json(field);
  })
);

formTemplatesRouter.patch(
  "/fields/:fieldId",
  requirePermission("system.config"),
  asyncHandler(async (req, res) => {
    const data = updateFieldSchema.parse(req.body);
    const field = await svc.updateField(req.params.fieldId, data);
    res.json(field);
  })
);

formTemplatesRouter.delete(
  "/fields/:fieldId",
  requirePermission("system.config"),
  asyncHandler(async (req, res) => {
    await svc.deleteField(req.params.fieldId);
    res.status(204).send();
  })
);

formTemplatesRouter.post(
  "/fields/reorder",
  requirePermission("system.config"),
  asyncHandler(async (req, res) => {
    const { items } = reorderSchema.parse(req.body);
    await svc.reorderFields(items);
    res.status(204).send();
  })
);
