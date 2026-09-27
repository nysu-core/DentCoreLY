import { Router } from "express";
import { asyncHandler } from "../../middleware/error";
import { authenticate, requirePermission } from "../../middleware/rbac";
import { createDepartmentSchema, updateDepartmentSchema } from "./departments.schema";
import * as departmentsService from "./departments.service";

export const departmentsRouter = Router();

departmentsRouter.get(
  "/public",
  asyncHandler(async (_req, res) => {
    const depts = await departmentsService.listDepartments();
    res.json(depts);
  })
);

departmentsRouter.use(authenticate);

// Any authenticated user can list active departments (needed for dropdowns across the app).
departmentsRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const includeInactive = req.query.includeInactive === "true";
    const depts = await departmentsService.listDepartments(includeInactive && req.user!.roleName === "Administrator");
    res.json(depts);
  })
);

departmentsRouter.get(
  "/:id",
  asyncHandler(async (req, res) => {
    const dept = await departmentsService.getDepartmentById(req.params.id);
    res.json(dept);
  })
);

departmentsRouter.post(
  "/",
  requirePermission("system.config"),
  asyncHandler(async (req, res) => {
    const data = createDepartmentSchema.parse(req.body);
    const dept = await departmentsService.createDepartment(data);
    res.status(201).json(dept);
  })
);

departmentsRouter.patch(
  "/:id",
  requirePermission("system.config"),
  asyncHandler(async (req, res) => {
    const data = updateDepartmentSchema.parse(req.body);
    const dept = await departmentsService.updateDepartment(req.params.id, data);
    res.json(dept);
  })
);
