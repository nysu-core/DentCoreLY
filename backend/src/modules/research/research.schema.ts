import { z } from "zod";

export const EXPORTABLE_FIELDS = [
  "age_group",
  "gender",
  "department",
  "conditions",
  "allergies",
  "habits",
  "facial_profile",
  "facial_form",
  "symmetry",
  "tmj_status",
  "oral_hygiene",
  "upper_arch_form",
  "lower_arch_form",
  "upper_crowding_or_spacing",
  "lower_crowding_or_spacing",
  "molar_relationship",
  "canine_relationship",
  "overjet_mm",
  "overjet_classification",
  "overbite_percent",
  "overbite_classification",
  "crossbite",
  "midline_deviation",
  "skeletal_classification",
  "dental_findings",
  "fixed_appliances",
  "removable_appliances",
  "clear_aligners",
  "orthopedic_appliances",
  "surgical_treatment",
  "interceptive_treatment",
] as const;

export type ExportableField = (typeof EXPORTABLE_FIELDS)[number];

export const submitRequestSchema = z.object({
  title: z.string().min(5),
  description: z.string().min(20),
  criteria: z.object({
    departmentId: z.string().uuid().optional(),
    dateFrom: z.coerce.date().optional(),
    dateTo: z.coerce.date().optional(),
    fields: z.array(z.enum(EXPORTABLE_FIELDS)).min(1),
  }),
});

export const reviewRequestSchema = z.object({
  status: z.enum(["APPROVED", "DENIED"]),
  reviewNotes: z.string().optional(),
});

export const listRequestsQuerySchema = z.object({
  status: z.enum(["PENDING", "APPROVED", "DENIED"]).optional(),
});
