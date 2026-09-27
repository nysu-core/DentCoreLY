import { Router } from "express";
import { asyncHandler } from "../../middleware/error";
import { authenticate, requirePermission } from "../../middleware/rbac";
import { getAllConfig, updateConfig, updateConfigSchema } from "./system-config.service";
import { audit, AuditAction } from "../../utils/audit";

export const systemConfigRouter = Router();
systemConfigRouter.use(authenticate, requirePermission("system.config"));

systemConfigRouter.get(
  "/",
  asyncHandler(async (_req, res) => {
    const config = await getAllConfig();
    res.json(config);
  })
);

systemConfigRouter.patch(
  "/",
  asyncHandler(async (req, res) => {
    const { updates } = updateConfigSchema.parse(req.body);
    const config = await updateConfig(updates, req.user!.sub);
    audit({
      userId:   req.user!.sub,
      action:   AuditAction.FORM_TEMPLATE_CHANGE,
      entityType: "SystemConfig",
      metadata: { keys: updates.map((u) => u.key) },
    });
    res.json(config);
  })
);
