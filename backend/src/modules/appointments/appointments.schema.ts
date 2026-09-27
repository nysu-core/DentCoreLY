import { z } from "zod";

export const createAppointmentSchema = z
  .object({
    patientId: z.string().uuid(),
    departmentId: z.string().uuid(),
    providerId: z.string().uuid(),
    startTime: z.coerce.date(),
    endTime: z.coerce.date(),
    reason: z.string().optional(),
    notes: z.string().optional(),
    reminderHoursBefore: z.array(z.number().int().positive()).optional(), // e.g. [24, 2]
  })
  .refine((data) => data.endTime > data.startTime, { message: "endTime must be after startTime", path: ["endTime"] });

export const updateAppointmentSchema = z.object({
  startTime: z.coerce.date().optional(),
  endTime: z.coerce.date().optional(),
  providerId: z.string().uuid().optional(),
  reason: z.string().optional(),
  notes: z.string().optional(),
});

export const cancelAppointmentSchema = z.object({
  cancelReason: z.string().optional(),
});

export const listAppointmentsQuerySchema = z.object({
  startTime: z.coerce.date().optional(),
  endTime: z.coerce.date().optional(),
  providerId: z.string().uuid().optional(),
  departmentId: z.string().uuid().optional(),
  patientId: z.string().uuid().optional(),
  status: z.enum(["SCHEDULED", "CONFIRMED", "CHECKED_IN", "COMPLETED", "CANCELLED", "NO_SHOW"]).optional(),
});
