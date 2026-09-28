import { Router } from "express";
import { asyncHandler } from "../../middleware/error";
import { authenticate, requirePermission } from "../../middleware/rbac";
import {
  createPatientSchema,
  updatePatientSchema,
  enrollDepartmentSchema,
  listPatientsQuerySchema,
  medicalHistorySchema,
  createVisitSchema,
  updateVisitSchema,
} from "./patients.schema";
import * as patientsService from "./patients.service";
import * as visitsService from "./visits.service";

export const patientsRouter = Router();

patientsRouter.use(authenticate);

patientsRouter.get(
  "/",
  requirePermission("patients.read"),
  asyncHandler(async (req, res) => {
    const query = listPatientsQuerySchema.parse(req.query);
    const result = await patientsService.listPatients(query);
    res.json(result);
  })
);

patientsRouter.get(
  "/:id",
  requirePermission("patients.read"),
  asyncHandler(async (req, res) => {
    const patient = await patientsService.getPatientById(req.params.id);
    res.json(patient);
  })
);

patientsRouter.post(
  "/",
  requirePermission("patients.create"),
  asyncHandler(async (req, res) => {
    const data = createPatientSchema.parse(req.body);
    const patient = await patientsService.createPatient(data, req.user!.sub);
    res.status(201).json(patient);
  })
);

patientsRouter.patch(
  "/:id",
  requirePermission("patients.update"),
  asyncHandler(async (req, res) => {
    const data = updatePatientSchema.parse(req.body);
    const patient = await patientsService.updatePatient(req.params.id, data);
    res.json(patient);
  })
);

patientsRouter.post(
  "/:id/enroll",
  requirePermission("patients.update"),
  asyncHandler(async (req, res) => {
    const { departmentId } = enrollDepartmentSchema.parse(req.body);
    const enrollment = await patientsService.enrollPatientInDepartment(req.params.id, departmentId);
    res.status(201).json(enrollment);
  })
);

patientsRouter.post(
  "/:id/archive",
  requirePermission("patients.archive"),
  asyncHandler(async (req, res) => {
    await patientsService.archivePatient(req.params.id);
    res.status(204).send();
  })
);

patientsRouter.post(
  "/:id/restore",
  requirePermission("patients.archive"),
  asyncHandler(async (req, res) => {
    await patientsService.restorePatient(req.params.id);
    res.status(204).send();
  })
);

// --- Medical History (gated separately so Assistant role, which lacks medical_history.manage, cannot reach it) ---

patientsRouter.get(
  "/:id/medical-history",
  requirePermission("medical_history.manage"),
  asyncHandler(async (req, res) => {
    const history = await patientsService.getMedicalHistory(req.params.id);
    res.json(history);
  })
);

patientsRouter.put(
  "/:id/medical-history",
  requirePermission("medical_history.manage"),
  asyncHandler(async (req, res) => {
    const data = medicalHistorySchema.parse(req.body);
    const history = await patientsService.upsertMedicalHistory(req.params.id, data, req.user!.sub);
    res.json(history);
  })
);

patientsRouter.get(
  "/:id/visits",
  requirePermission("patients.read"),
  asyncHandler(async (req, res) => {
    res.json(await visitsService.listPatientVisits(req.params.id));
  })
);

patientsRouter.post(
  "/:id/visits",
  requirePermission("visits.manage"),
  asyncHandler(async (req, res) => {
    const data = createVisitSchema.parse(req.body);
    res.status(201).json(await visitsService.createPatientVisit(req.params.id, req.user!.sub, data));
  })
);

patientsRouter.patch(
  "/:id/visits/:visitId",
  requirePermission("visits.manage"),
  asyncHandler(async (req, res) => {
    const data = updateVisitSchema.parse(req.body);
    res.json(await visitsService.updatePatientVisit(req.params.id, req.params.visitId, data));
  })
);
