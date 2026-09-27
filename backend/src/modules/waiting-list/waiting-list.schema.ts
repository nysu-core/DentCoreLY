import { z } from "zod";

export const addWaitingListSchema = z.object({
  patientId: z.string().uuid(),
  departmentId: z.string().uuid(),
  preferredNotes: z.string().optional(),
});
