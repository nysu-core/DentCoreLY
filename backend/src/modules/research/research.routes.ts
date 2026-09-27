import { Router } from "express";
import { asyncHandler } from "../../middleware/error";
import { authenticate, requirePermission } from "../../middleware/rbac";
import { submitRequestSchema, reviewRequestSchema, listRequestsQuerySchema } from "./research.schema";
import * as svc from "./research.service";

export const researchRouter = Router();
researchRouter.use(authenticate);

// ── Researcher endpoints ──────────────────────────────────────────────────

// Submit a new research request
researchRouter.post(
  "/",
  requirePermission("research.submit"),
  asyncHandler(async (req, res) => {
    const data = submitRequestSchema.parse(req.body);
    const request = await svc.submitRequest(data, req.user!.sub);
    res.status(201).json(request);
  })
);

// List own requests (Researcher sees only theirs; Admin sees all via /admin route)
researchRouter.get(
  "/mine",
  requirePermission("research.submit"),
  asyncHandler(async (req, res) => {
    const { status } = listRequestsQuerySchema.parse(req.query);
    const requests = await svc.listRequests({ requestedById: req.user!.sub, status });
    res.json(requests);
  })
);

researchRouter.get(
  "/:id",
  requirePermission("research.submit"),
  asyncHandler(async (req, res) => {
    const request = await svc.getRequestById(req.params.id);
    res.json(request);
  })
);

// Preview anonymized dataset (first 50 rows, JSON)
researchRouter.get(
  "/:id/preview",
  requirePermission("research.export"),
  asyncHandler(async (req, res) => {
    const preview = await svc.previewDataset(req.params.id, req.user!.sub);
    res.json(preview);
  })
);

// Export full anonymized dataset as CSV
researchRouter.get(
  "/:id/export",
  requirePermission("research.export"),
  asyncHandler(async (req, res) => {
    await svc.exportDatasetCsv(req.params.id, req.user!.sub, res);
  })
);

// Dataset statistics (frequency tables per clinical variable)
researchRouter.get(
  "/:id/stats",
  requirePermission("research.export"),
  asyncHandler(async (req, res) => {
    const stats = await svc.getDatasetStats(req.params.id, req.user!.sub);
    res.json(stats);
  })
);

// ── Admin-only endpoints ──────────────────────────────────────────────────

// List all requests (admin overview queue)
researchRouter.get(
  "/",
  requirePermission("research.approve"),
  asyncHandler(async (req, res) => {
    const { status } = listRequestsQuerySchema.parse(req.query);
    const requests = await svc.listRequests({ status });
    res.json(requests);
  })
);

// Approve or deny a request
researchRouter.post(
  "/:id/review",
  requirePermission("research.approve"),
  asyncHandler(async (req, res) => {
    const data = reviewRequestSchema.parse(req.body);
    const request = await svc.reviewRequest(req.params.id, data, req.user!.sub);
    res.json(request);
  })
);
