import { Router } from "express";
import { asyncHandler } from "../../middleware/error";
import { authenticate } from "../../middleware/rbac";
import { ForbiddenError, UnauthorizedError } from "../../middleware/error";
import { submitResponseSchema } from "./form-responses.schema";
import * as svc from "./form-responses.service";
import { prisma } from "../../config/prisma";

export const formResponsesRouter = Router();

formResponsesRouter.use(authenticate);

// Checks the dynamic module permission for the moduleKey associated with a given templateId.
async function assertModulePermission(req: any, templateId: string) {
  if (!req.user) throw new UnauthorizedError();
  const moduleKey = await svc.getTemplateModuleKey(templateId);
  const permKey = svc.MODULE_PERMISSION[moduleKey];
  if (!permKey) return; // unknown module, no extra restriction beyond authentication

  const grant = await prisma.rolePermission.findFirst({
    where: { roleId: req.user.roleId, permission: { key: permKey } },
  });
  if (!grant) throw new ForbiddenError(`Missing required permission: ${permKey}`);
}

formResponsesRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const { templateId, patientId } = req.query as { templateId: string; patientId: string };
    await assertModulePermission(req, templateId);
    const responses = await svc.listResponses(templateId, patientId);
    res.json(responses);
  })
);

formResponsesRouter.get(
  "/latest",
  asyncHandler(async (req, res) => {
    const { templateId, patientId } = req.query as { templateId: string; patientId: string };
    await assertModulePermission(req, templateId);
    const response = await svc.getLatestResponse(templateId, patientId);
    res.json(response);
  })
);

formResponsesRouter.post(
  "/",
  asyncHandler(async (req, res) => {
    const data = submitResponseSchema.parse(req.body);
    await assertModulePermission(req, data.templateId);
    const response = await svc.submitResponse(data, req.user!.sub);
    res.status(201).json(response);
  })
);
