import { Router } from "express";
import { asyncHandler } from "../../middleware/error";
import { authenticate, requirePermission } from "../../middleware/rbac";
import * as rolesService from "./roles.service";

export const rolesRouter = Router();

rolesRouter.use(authenticate);

// Needed to populate role dropdowns when creating/editing users.
rolesRouter.get(
  "/",
  requirePermission("users.manage"),
  asyncHandler(async (_req, res) => {
    res.json(await rolesService.listRoles());
  })
);

rolesRouter.get(
  "/permissions",
  requirePermission("roles.manage"),
  asyncHandler(async (_req, res) => {
    res.json(await rolesService.listAllPermissions());
  })
);

rolesRouter.get(
  "/:id/permissions",
  requirePermission("roles.manage"),
  asyncHandler(async (req, res) => {
    res.json(await rolesService.getRolePermissions(req.params.id));
  })
);
