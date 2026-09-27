import { z } from "zod";

export const createUserSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8, "Password must be at least 8 characters"),
  fullName: z.string().min(2),
  roleId: z.string().uuid(),
  departmentId: z.string().uuid().optional(),
});

export const updateUserSchema = z.object({
  fullName: z.string().min(2).optional(),
  roleId: z.string().uuid().optional(),
  departmentId: z.string().uuid().nullable().optional(),
  status: z.enum(["ACTIVE", "DISABLED", "PENDING"]).optional(),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(8),
  newPassword: z.string().min(8),
});

export const resetPasswordSchema = z.object({
  newPassword: z.string().min(8),
});

export const listUsersQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(20),
  search: z.string().optional(),
  roleId: z.string().uuid().optional(),
  departmentId: z.string().uuid().optional(),
});
