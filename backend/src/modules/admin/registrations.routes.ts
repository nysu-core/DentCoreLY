import { Router } from "express";
import { asyncHandler } from "../../middleware/error";
import { authenticate, requirePermission } from "../../middleware/rbac";
import {
  listPendingRegistrations,
  listAllRegistrations,
  getPendingCount,
  reviewRegistration,
  reviewRegistrationSchema,
} from "./registrations.service";

export const registrationsRouter = Router();

registrationsRouter.use(authenticate, requirePermission("users.manage"));

// Count of pending registrations — used for the nav badge
registrationsRouter.get(
  "/count",
  asyncHandler(async (_req, res) => {
    const count = await getPendingCount();
    res.json({ count });
  })
);

// List pending only (default admin queue view)
registrationsRouter.get(
  "/pending",
  asyncHandler(async (_req, res) => {
    const users = await listPendingRegistrations();
    res.json(users);
  })
);

// List all registrations with optional status filter
registrationsRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const status = req.query.status as "PENDING" | "ACTIVE" | "DISABLED" | undefined;
    const users = await listAllRegistrations(status);
    res.json(users);
  })
);

// Approve or deny a registration
registrationsRouter.post(
  "/:userId/review",
  asyncHandler(async (req, res) => {
    const { decision, statusNote } = reviewRegistrationSchema.parse(req.body);
    const result = await reviewRegistration(req.params.userId, decision, statusNote, req.user!.sub);
    res.json(result);
  })
);
