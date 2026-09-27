import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

export const refreshSchema = z.object({
  refreshToken: z.string().min(10),
});

// Roles users can self-select during registration (Administrator is excluded)
export const SELF_REGISTERABLE_ROLES = ["Orthodontist", "Assistant", "Researcher"] as const;

export const registerSchema = z.object({
  fullName:         z.string().min(2),
  email:            z.string().email(),
  password:         z.string().min(8, "Password must be at least 8 characters"),
  roleName:         z.enum(SELF_REGISTERABLE_ROLES),
  departmentId:     z.string().uuid().optional(),
  registrationNote: z.string().max(500).optional(),
});
