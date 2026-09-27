import { Router } from "express";
import { asyncHandler } from "../../middleware/error";
import { authenticate, requirePermission } from "../../middleware/rbac";
import { addWaitingListSchema } from "./waiting-list.schema";
import * as svc from "./waiting-list.service";

export const waitingListRouter = Router();

waitingListRouter.use(authenticate);

waitingListRouter.get(
  "/",
  requirePermission("appointments.read"),
  asyncHandler(async (req, res) => {
    const { departmentId } = req.query as { departmentId?: string };
    const entries = await svc.listWaitingList(departmentId);
    res.json(entries);
  })
);

waitingListRouter.post(
  "/",
  requirePermission("appointments.manage"),
  asyncHandler(async (req, res) => {
    const data = addWaitingListSchema.parse(req.body);
    const entry = await svc.addToWaitingList(data, req.user!.sub);
    res.status(201).json(entry);
  })
);

waitingListRouter.delete(
  "/:id",
  requirePermission("appointments.manage"),
  asyncHandler(async (req, res) => {
    await svc.removeFromWaitingList(req.params.id);
    res.status(204).send();
  })
);
