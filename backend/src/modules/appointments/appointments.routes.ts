import { Router } from "express";
import { asyncHandler } from "../../middleware/error";
import { authenticate, requirePermission } from "../../middleware/rbac";
import {
  createAppointmentSchema,
  updateAppointmentSchema,
  cancelAppointmentSchema,
  listAppointmentsQuerySchema,
} from "./appointments.schema";
import * as svc from "./appointments.service";

export const appointmentsRouter = Router();

appointmentsRouter.use(authenticate);

appointmentsRouter.get(
  "/",
  requirePermission("appointments.read"),
  asyncHandler(async (req, res) => {
    const query = listAppointmentsQuerySchema.parse(req.query);
    const appointments = await svc.listAppointments(query);
    res.json(appointments);
  })
);

appointmentsRouter.get(
  "/:id",
  requirePermission("appointments.read"),
  asyncHandler(async (req, res) => {
    const appt = await svc.getAppointmentById(req.params.id);
    res.json(appt);
  })
);

appointmentsRouter.post(
  "/",
  requirePermission("appointments.manage"),
  asyncHandler(async (req, res) => {
    const data = createAppointmentSchema.parse(req.body);
    const appt = await svc.createAppointment(data, req.user!.sub);
    res.status(201).json(appt);
  })
);

appointmentsRouter.patch(
  "/:id/reschedule",
  requirePermission("appointments.manage"),
  asyncHandler(async (req, res) => {
    const data = updateAppointmentSchema.parse(req.body);
    const appt = await svc.rescheduleAppointment(req.params.id, data);
    res.json(appt);
  })
);

appointmentsRouter.post(
  "/:id/cancel",
  requirePermission("appointments.manage"),
  asyncHandler(async (req, res) => {
    const { cancelReason } = cancelAppointmentSchema.parse(req.body);
    const appt = await svc.cancelAppointment(req.params.id, cancelReason);
    res.json(appt);
  })
);

appointmentsRouter.post(
  "/:id/confirm",
  requirePermission("appointments.manage"),
  asyncHandler(async (req, res) => {
    const appt = await svc.confirmAppointment(req.params.id);
    res.json(appt);
  })
);

appointmentsRouter.post(
  "/:id/check-in",
  requirePermission("appointments.manage"),
  asyncHandler(async (req, res) => {
    const appt = await svc.checkInAppointment(req.params.id);
    res.json(appt);
  })
);

appointmentsRouter.post(
  "/:id/complete",
  requirePermission("appointments.manage"),
  asyncHandler(async (req, res) => {
    const appt = await svc.completeAppointment(req.params.id);
    res.json(appt);
  })
);

appointmentsRouter.post(
  "/:id/no-show",
  requirePermission("appointments.manage"),
  asyncHandler(async (req, res) => {
    const appt = await svc.markNoShow(req.params.id);
    res.json(appt);
  })
);
