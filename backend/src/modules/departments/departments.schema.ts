import { z } from "zod";

export const createDepartmentSchema = z.object({
  name: z.string().min(2),
  code: z.string().min(2).max(20).regex(/^[A-Z0-9_]+$/, "Code must be uppercase letters/numbers/underscores"),
});

export const updateDepartmentSchema = z.object({
  name: z.string().min(2).optional(),
  isActive: z.boolean().optional(),
});
