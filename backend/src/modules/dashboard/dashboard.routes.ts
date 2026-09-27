import { Router } from "express";
import { asyncHandler } from "../../middleware/error";
import { authenticate, requirePermission } from "../../middleware/rbac";
import { getDashboardStats } from "./dashboard.service";

export const dashboardRouter = Router();

dashboardRouter.use(authenticate, requirePermission("dashboard.read"));

dashboardRouter.get(
  "/",
  asyncHandler(async (_req, res) => {
    const data = await getDashboardStats();
    res.json(data);
  })
);
