import crypto from "crypto";
import { Response } from "express";
import { prisma } from "../../config/prisma";
import { NotFoundError, ForbiddenError, AppError } from "../../middleware/error";
import { audit, AuditAction } from "../../utils/audit";
import { ExportableField } from "./research.schema";

// Salt for deterministic anonymization. Change in production via env var.
// Same patient always gets the same anon_id so researchers can track longitudinal data
// without ever knowing the real patient identity.
const ANON_SALT = process.env.ANON_SALT ?? "orthocore_anon_default_salt_CHANGE_IN_PRODUCTION";

function anonymizeId(id: string): string {
  return crypto.createHmac("sha256", ANON_SALT).update(id).digest("hex").slice(0, 16);
}

function ageGroup(birthDate: Date): string {
  const years = Math.floor((Date.now() - birthDate.getTime()) / (365.25 * 24 * 60 * 60 * 1000));
  if (years <= 5)  return "0-5";
  if (years <= 12) return "6-12";
  if (years <= 17) return "13-17";
  if (years <= 25) return "18-25";
  if (years <= 35) return "26-35";
  if (years <= 45) return "36-45";
  if (years <= 60) return "46-60";
  return "60+";
}

function jsonArr(val: any): string {
  if (!val) return "";
  const arr = Array.isArray(val) ? val : (() => { try { return JSON.parse(String(val)); } catch { return []; } })();
  return arr.join("; ");
}

function csvEscape(v: any): string {
  const s = v == null ? "" : String(v);
  if (s.includes(",") || s.includes('"') || s.includes("\n")) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

// ── Request CRUD ─────────────────────────────────────────────────────────────

export async function submitRequest(
  data: { title: string; description: string; criteria: any },
  requestedById: string
) {
  const req = await prisma.researchRequest.create({
    data: { title: data.title, description: data.description, criteria: data.criteria, requestedById },
  });
  audit({ userId: requestedById, action: AuditAction.RESEARCH_SUBMIT, entityType: "ResearchRequest", entityId: req.id });
  return req;
}

export async function listRequests(opts: { requestedById?: string; status?: string }) {
  return prisma.researchRequest.findMany({
    where: {
      ...(opts.requestedById ? { requestedById: opts.requestedById } : {}),
      ...(opts.status ? { status: opts.status as any } : {}),
    },
    include: {
      requestedBy: { select: { id: true, fullName: true } },
      reviewedBy:  { select: { id: true, fullName: true } },
      _count: { select: { datasets: true } },
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function getRequestById(id: string) {
  const req = await prisma.researchRequest.findUnique({
    where: { id },
    include: {
      requestedBy: { select: { id: true, fullName: true } },
      reviewedBy:  { select: { id: true, fullName: true } },
      datasets: { orderBy: { exportedAt: "desc" } },
    },
  });
  if (!req) throw new NotFoundError("Research request not found");
  return req;
}

export async function reviewRequest(
  id: string,
  data: { status: "APPROVED" | "DENIED"; reviewNotes?: string },
  reviewedById: string
) {
  const req = await getRequestById(id);
  if (req.status !== "PENDING") throw new AppError("Only PENDING requests can be reviewed", 409);

  const updated = await prisma.researchRequest.update({
    where: { id },
    data: { status: data.status, reviewedById, reviewedAt: new Date(), reviewNotes: data.reviewNotes },
  });
  audit({
    userId: reviewedById,
    action: data.status === "APPROVED" ? AuditAction.RESEARCH_APPROVE : AuditAction.RESEARCH_DENY,
    entityType: "ResearchRequest", entityId: id,
  });
  return updated;
}

// ── Anonymized dataset assembly ──────────────────────────────────────────────

async function buildAnonymizedDataset(requestId: string, requestedById: string) {
  const req = await getRequestById(requestId);

  if (req.status !== "APPROVED") throw new ForbiddenError("This research request has not been approved");
  if (req.requestedById !== requestedById) throw new ForbiddenError("Access denied");

  const criteria = req.criteria as {
    departmentId?: string;
    dateFrom?: string;
    dateTo?: string;
    fields: ExportableField[];
  };

  // Fetch patients matching the criteria
  const patients = await prisma.patient.findMany({
    where: {
      isArchived: false,
      ...(criteria.departmentId ? { enrollments: { some: { departmentId: criteria.departmentId } } } : {}),
      ...(criteria.dateFrom || criteria.dateTo
        ? {
            entryDate: {
              ...(criteria.dateFrom ? { gte: new Date(criteria.dateFrom) } : {}),
              ...(criteria.dateTo   ? { lte: new Date(criteria.dateTo) }   : {}),
            },
          }
        : {}),
    },
    include: {
      enrollments: { include: { department: true } },
      medicalHistory: true,
    },
  });

  // Fetch latest form responses (examination + diagnosis + treatment_plan) for each patient
  const patientIds = patients.map((p) => p.id);
  const responses = await prisma.formResponse.findMany({
    where: { patientId: { in: patientIds } },
    include: { template: { select: { moduleKey: true } } },
    orderBy: { createdAt: "desc" },
  });

  // Index: { patientId → { moduleKey → latest data } }
  const respIndex: Record<string, Record<string, Record<string, any>>> = {};
  for (const r of responses) {
    const pid = r.patientId;
    const mk  = r.template.moduleKey;
    if (!respIndex[pid]) respIndex[pid] = {};
    if (!respIndex[pid][mk]) respIndex[pid][mk] = r.data as Record<string, any>;
  }

  const fields = criteria.fields;

  const rows = patients.map((patient) => {
    const examData = respIndex[patient.id]?.["examination"] ?? {};
    const diagData = respIndex[patient.id]?.["diagnosis"] ?? {};
    const txData   = respIndex[patient.id]?.["treatment_plan"] ?? {};
    const mh       = patient.medicalHistory;
    const dept     = patient.enrollments[0]?.department?.name ?? "";

    const row: Record<string, string> = {
      anon_id: anonymizeId(patient.id),
    };

    for (const field of fields) {
      switch (field) {
        case "age_group":               row[field] = ageGroup(patient.birthDate); break;
        case "gender":                  row[field] = patient.gender; break;
        case "department":              row[field] = dept; break;
        case "conditions":              row[field] = mh ? jsonArr(mh.conditions) : ""; break;
        case "allergies":               row[field] = mh ? jsonArr(mh.allergies)  : ""; break;
        case "habits":                  row[field] = mh ? jsonArr(mh.habits)     : ""; break;
        case "facial_profile":          row[field] = examData.facial_profile          ?? ""; break;
        case "facial_form":             row[field] = examData.facial_form             ?? ""; break;
        case "symmetry":                row[field] = examData.symmetry                ?? ""; break;
        case "tmj_status":              row[field] = examData.tmj_status              ?? ""; break;
        case "oral_hygiene":            row[field] = examData.oral_hygiene            ?? ""; break;
        case "upper_arch_form":         row[field] = examData.upper_arch_form         ?? ""; break;
        case "lower_arch_form":         row[field] = examData.lower_arch_form         ?? ""; break;
        case "upper_crowding_or_spacing": row[field] = examData.upper_crowding_or_spacing ?? ""; break;
        case "lower_crowding_or_spacing": row[field] = examData.lower_crowding_or_spacing ?? ""; break;
        case "molar_relationship":      row[field] = examData.molar_relationship      ?? ""; break;
        case "canine_relationship":     row[field] = examData.canine_relationship     ?? ""; break;
        case "overjet_mm":              row[field] = examData.overjet_mm              ?? ""; break;
        case "overjet_classification":  row[field] = examData.overjet_classification  ?? ""; break;
        case "overbite_percent":        row[field] = examData.overbite_percent        ?? ""; break;
        case "overbite_classification": row[field] = examData.overbite_classification ?? ""; break;
        case "crossbite":               row[field] = examData.crossbite               ?? ""; break;
        case "midline_deviation":       row[field] = examData.midline_deviation       ?? ""; break;
        case "skeletal_classification": row[field] = diagData.skeletal_classification ?? ""; break;
        case "dental_findings":         row[field] = jsonArr(diagData.dental_findings); break;
        case "fixed_appliances":        row[field] = jsonArr(txData.fixed_appliances); break;
        case "removable_appliances":    row[field] = jsonArr(txData.removable_appliances); break;
        case "clear_aligners":          row[field] = jsonArr(txData.clear_aligners); break;
        case "orthopedic_appliances":   row[field] = jsonArr(txData.orthopedic_appliances); break;
        case "surgical_treatment":      row[field] = jsonArr(txData.surgical_treatment); break;
        case "interceptive_treatment":  row[field] = jsonArr(txData.interceptive_treatment); break;
      }
    }
    return row;
  });

  return { rows, fields: ["anon_id", ...fields] as string[], requestId, rowCount: rows.length };
}

// ── Preview (JSON, first 50 rows) ─────────────────────────────────────────

export async function previewDataset(requestId: string, requestedById: string) {
  const { rows, fields, rowCount } = await buildAnonymizedDataset(requestId, requestedById);
  return { columns: fields, rows: rows.slice(0, 50), totalRows: rowCount };
}

// ── CSV export ───────────────────────────────────────────────────────────────

export async function exportDatasetCsv(requestId: string, requestedById: string, res: Response) {
  const { rows, fields, rowCount } = await buildAnonymizedDataset(requestId, requestedById);

  // Record the export
  await prisma.researchDataset.create({
    data: { requestId, rowCount, exportedById: requestedById },
  });
  audit({
    userId: requestedById,
    action: AuditAction.RESEARCH_EXPORT,
    entityType: "ResearchRequest",
    entityId: requestId,
    metadata: { rowCount },
  });

  res.setHeader("Content-Type", "text/csv");
  res.setHeader("Content-Disposition", `attachment; filename="orthocore-research-${requestId.slice(0,8)}.csv"`);

  // Header row
  res.write(fields.map(csvEscape).join(",") + "\n");

  // Data rows
  for (const row of rows) {
    res.write(fields.map((f) => csvEscape(row[f])).join(",") + "\n");
  }
  res.end();
}

// ── Summary statistics (for Researcher dashboard) ─────────────────────────

export async function getDatasetStats(requestId: string, requestedById: string) {
  const { rows, rowCount } = await buildAnonymizedDataset(requestId, requestedById);

  function freq(arr: any[], key: string) {
    const counts: Record<string, number> = {};
    for (const row of arr) {
      const v = String(row[key] || "Unknown");
      counts[v] = (counts[v] ?? 0) + 1;
    }
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .map(([value, count]) => ({ value, count }));
  }

  return {
    totalRows: rowCount,
    skeletalClassification: freq(rows, "skeletal_classification"),
    molarRelationship: freq(rows, "molar_relationship"),
    ageGroup: freq(rows, "age_group"),
    gender: freq(rows, "gender"),
    overbiteClassification: freq(rows, "overbite_classification"),
    overjetClassification: freq(rows, "overjet_classification"),
  };
}
