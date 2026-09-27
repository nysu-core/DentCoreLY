import { z } from "zod";

export const submitResponseSchema = z.object({
  templateId: z.string().uuid(),
  patientId: z.string().uuid(),
  data: z.record(z.any()),
});
