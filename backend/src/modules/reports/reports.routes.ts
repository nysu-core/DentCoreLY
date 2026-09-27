import { Router } from "express";
import { asyncHandler } from "../../middleware/error";
import { authenticate, requirePermission } from "../../middleware/rbac";
import * as reportsService from "./reports.service";

export const reportsRouter = Router();

reportsRouter.use(authenticate, requirePermission("reports.generate"));

// Full patient clinical summary PDF
reportsRouter.get(
  "/patients/:patientId/summary",
  asyncHandler(async (req, res) => {
    await reportsService.generatePatientSummary(req.params.patientId, res);
  })
);

// Compact patient ID card PDF
reportsRouter.get(
  "/patients/:patientId/id-card",
  asyncHandler(async (req, res) => {
    await reportsService.generatePatientIdCard(req.params.patientId, res);
  })
);

// Daily appointment schedule PDF
reportsRouter.get(
  "/appointments/schedule",
  asyncHandler(async (req, res) => {
    const date = req.query.date ? new Date(req.query.date as string) : new Date();
    const providerId = req.query.providerId as string | undefined;
    const patientId  = req.query.patientId  as string | undefined;
    await reportsService.generateAppointmentSchedule(res, { date, providerId, patientId });
  })
);
