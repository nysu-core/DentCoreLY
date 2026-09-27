import { z } from "zod";

export const createPatientSchema = z.object({
  fileNumber: z.string().trim().min(1),
  fullName: z.string().min(2),
  birthDate: z.coerce.date(),
  gender: z.enum(["MALE", "FEMALE"]),
  nationality: z.string().optional(),
  phoneNumber: z.string().optional(),
  guardianContact: z.string().trim().max(50).optional(),
  assignedDoctorName: z.string().trim().max(150).optional(),
  supervisorName: z.string().trim().max(150).optional(),
  departmentId: z.string().uuid(), // initial department enrollment
});

export const updatePatientSchema = z.object({
  fileNumber: z.string().trim().min(1).optional(),
  fullName: z.string().min(2).optional(),
  birthDate: z.coerce.date().optional(),
  gender: z.enum(["MALE", "FEMALE"]).optional(),
  nationality: z.string().optional(),
  phoneNumber: z.string().optional(),
  guardianContact: z.string().trim().max(50).optional(),
  assignedDoctorName: z.string().trim().max(150).optional(),
  supervisorName: z.string().trim().max(150).optional(),
});

export const enrollDepartmentSchema = z.object({
  departmentId: z.string().uuid(),
});

export const listPatientsQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(20),
  search: z.string().optional(),
  departmentId: z.string().uuid().optional(),
  includeArchived: z.coerce.boolean().default(false),
});

export const medicalHistorySchema = z.object({
  conditions: z.array(z.string()).default([]),
  allergies: z.array(z.string()).default([]),
  currentMedication: z.string().optional(),
  medicationDose: z.string().optional(),
  familyHistory: z.array(z.string()).default([]),
  habits: z.array(z.string()).default([]),
  notes: z.string().optional(),
});
