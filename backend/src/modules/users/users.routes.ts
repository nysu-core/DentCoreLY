import { Router } from "express";
import { asyncHandler } from "../../middleware/error";
import { authenticate, requirePermission } from "../../middleware/rbac";
import {
  createUserSchema,
  updateUserSchema,
  changePasswordSchema,
  resetPasswordSchema,
  listUsersQuerySchema,
} from "./users.schema";
import * as usersService from "./users.service";

export const usersRouter = Router();

usersRouter.use(authenticate);

// Self-service: get own profile
usersRouter.get(
  "/me",
  asyncHandler(async (req, res) => {
    const user = await usersService.getUserById(req.user!.sub);
    res.json(user);
  })
);

// Self-service: change own password
usersRouter.post(
  "/me/change-password",
  asyncHandler(async (req, res) => {
    const { currentPassword, newPassword } = changePasswordSchema.parse(req.body);
    await usersService.changeOwnPassword(req.user!.sub, currentPassword, newPassword);
    res.status(204).send();
  })
);

// Admin: list users
usersRouter.get(
  "/",
  requirePermission("users.manage"),
  asyncHandler(async (req, res) => {
    const query = listUsersQuerySchema.parse(req.query);
    const result = await usersService.listUsers(query);
    res.json(result);
  })
);

// Admin: get a specific user
usersRouter.get(
  "/:id",
  requirePermission("users.manage"),
  asyncHandler(async (req, res) => {
    const user = await usersService.getUserById(req.params.id);
    res.json(user);
  })
);

// Admin: create user
usersRouter.post(
  "/",
  requirePermission("users.manage"),
  asyncHandler(async (req, res) => {
    const data = createUserSchema.parse(req.body);
    const user = await usersService.createUser(data);
    res.status(201).json(user);
  })
);

// Admin: update user (role, department, status, name)
usersRouter.patch(
  "/:id",
  requirePermission("users.manage"),
  asyncHandler(async (req, res) => {
    const data = updateUserSchema.parse(req.body);
    const user = await usersService.updateUser(req.params.id, data);
    res.json(user);
  })
);

// Admin: reset another user's password
usersRouter.post(
  "/:id/reset-password",
  requirePermission("users.manage"),
  asyncHandler(async (req, res) => {
    const { newPassword } = resetPasswordSchema.parse(req.body);
    await usersService.adminResetPassword(req.params.id, newPassword);
    res.status(204).send();
  })
);

// Admin: disable a user (soft delete — preserves audit trail integrity)
usersRouter.delete(
  "/:id",
  requirePermission("users.manage"),
  asyncHandler(async (req, res) => {
    await usersService.disableUser(req.params.id);
    res.status(204).send();
  })
);
