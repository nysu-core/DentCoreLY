import { Router } from "express";
import { asyncHandler } from "../../middleware/error";
import { authenticate, requirePermission } from "../../middleware/rbac";
import { auditQuerySchema, listAuditLogs, getActionTypes, getEntityTypes } from "./audit.service";

export const auditRouter = Router();
auditRouter.use(authenticate, requirePermission("audit.read"));

auditRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const params = auditQuerySchema.parse(req.query);
    const result = await listAuditLogs(params);
    res.json(result);
  })
);

// Dropdown values for the filter UI
auditRouter.get(
  "/meta",
  asyncHandler(async (_req, res) => {
    const [actions, entityTypes] = await Promise.all([getActionTypes(), getEntityTypes()]);
    res.json({ actions, entityTypes });
  })
);
