import { Response } from "express";
import { prisma } from "../../config/prisma";
import { NotFoundError } from "../../middleware/error";
import { PdfBuilder } from "./pdf-builder";

const CLINIC_NAME = "Orthodontics Department - Benghazi";

// ── Helpers ──────────────────────────────────────────────────────────────────

function age(birthDate: Date): number {
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const m = today.getMonth() - birthDate.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) age--;
  return age;
}

function fmtDate(d: Date | string | null | undefined): string {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

function fmtDateTime(d: Date | string | null | undefined): string {
  if (!d) return "—";
  return new Date(d).toLocaleString("en-GB", {
    day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit",
  });
}

function jsonArr(val: any): string[] {
  if (!val) return [];
  if (Array.isArray(val)) return val.map(String);
  try { return JSON.parse(String(val)); } catch { return []; }
}

// ── Patient Summary Report ────────────────────────────────────────────────────

export async function generatePatientSummary(patientId: string, res: Response) {
  const patient = await prisma.patient.findUnique({
    where: { id: patientId },
    include: {
      enrollments: { include: { department: true } },
      medicalHistory: true,
    },
  });
  if (!patient) throw new NotFoundError("Patient not found");

  // Latest examination, diagnosis, treatment plan responses
    const [latestExam, latestDiag, latestTx] = await Promise.all(
      ["examination", "diagnosis", "treatment_plan"].map(async (moduleKey) => {
        const templates = await prisma.formTemplate.findMany({ where: { moduleKey }, select: { id: true } });
        if (templates.length === 0) return null;
        return prisma.formResponse.findFirst({
          where: { patientId, templateId: { in: templates.map((template) => template.id) } },
          orderBy: { createdAt: "desc" },
        });
      })
    );

  const pdf = new PdfBuilder();
  pdf.pipeToResponse(res, `patient-summary-${patient.fileNumber}.pdf`);

  // ── Page 1: Demographics + Medical History ──
  pdf.header(CLINIC_NAME, "Patient Summary", `File #${patient.fileNumber}`);

  pdf.sectionHeading("Patient Information");
  pdf.row("File Number", patient.fileNumber);
  pdf.row("Full Name", patient.fullName);
  pdf.row("Date of Birth", fmtDate(patient.birthDate));
  pdf.row("Age", `${age(patient.birthDate)} years`);
  pdf.row("Gender", patient.gender === "MALE" ? "Male" : "Female");
  pdf.row("Nationality", patient.nationality);
  pdf.row("Phone Number", patient.phoneNumber);
  pdf.row("Entry Date", fmtDate(patient.entryDate));
  pdf.row("Departments", patient.enrollments.map((e) => e.department.name).join(", "), { last: true });

  if (patient.medicalHistory) {
    const mh = patient.medicalHistory;
    pdf.sectionHeading("Medical History");
    pdf.tagRow("Medical Conditions", jsonArr(mh.conditions));
    pdf.tagRow("Allergies", jsonArr(mh.allergies));
    pdf.row("Current Medication", mh.currentMedication);
    pdf.row("Medication Dose", mh.medicationDose);
    pdf.tagRow("Family History", jsonArr(mh.familyHistory));
    pdf.tagRow("Habits", jsonArr(mh.habits));
    pdf.row("Additional Notes", mh.notes, { last: true });
  }

  // ── Examination ──
  if (latestExam) {
    const d = latestExam.data as Record<string, any>;
    pdf.sectionHeading("Clinical Examination");
    pdf.sectionHeading("Extraoral");
    pdf.row("Facial Profile", d.facial_profile);
    pdf.row("Facial Form", d.facial_form);
    pdf.row("Symmetry", d.symmetry);
    pdf.row("TMJ", d.tmj_status);
    pdf.row("Lip Competency", d.lip_competency);
    pdf.row("Lip Shape", d.lip_shape);
    pdf.row("Lip Strain", d.lip_strain);
    pdf.row("Nasolabial Angle", d.nasolabial_angle);

    pdf.sectionHeading("Intraoral");
    pdf.row("Oral Hygiene", d.oral_hygiene);
    pdf.tagRow("Periodontal", jsonArr(d.periodontal_findings));
    pdf.row("Upper Arch Form", d.upper_arch_form);
    pdf.row("Lower Arch Form", d.lower_arch_form);
    pdf.row("Upper Crowding / Spacing", d.upper_crowding_or_spacing ? `${d.upper_crowding_spacing_mm ?? ""}mm ${d.upper_crowding_or_spacing}` : undefined);
    pdf.row("Lower Crowding / Spacing", d.lower_crowding_or_spacing ? `${d.lower_crowding_spacing_mm ?? ""}mm ${d.lower_crowding_or_spacing}` : undefined);
    pdf.row("Missing Teeth", d.missing_teeth);
    pdf.row("Extracted Teeth", d.extracted_teeth);

    pdf.sectionHeading("Occlusion");
    pdf.row("Molar Relationship", d.molar_relationship);
    pdf.row("Canine Relationship", d.canine_relationship);
    pdf.row("Overjet", d.overjet_mm != null ? `${d.overjet_mm} mm — ${d.overjet_classification ?? ""}` : undefined);
    pdf.row("Overbite", d.overbite_percent != null ? `${d.overbite_percent}% — ${d.overbite_classification ?? ""}` : undefined);
    pdf.row("Crossbite", d.crossbite);
    pdf.row("Midline Deviation", d.midline_deviation, { last: true });
  }

  // ── Diagnosis ──
  if (latestDiag) {
    const d = latestDiag.data as Record<string, any>;
    pdf.sectionHeading("Diagnosis");
    pdf.row("Skeletal Classification", d.skeletal_classification);
    pdf.tagRow("Dental Findings", jsonArr(d.dental_findings));
    pdf.row("Soft Tissue", d.soft_tissue_findings);
    pdf.row("Other Findings", d.other_findings);

    const records = [
      d.intraoral_photos && "Intraoral Photos",
      d.extraoral_photos && "Extraoral Photos",
      d.panoramic_xray && "Panoramic X-Ray",
      d.cephalometric_xray && "Cephalometric X-Ray",
      d.study_models && "Study Models",
      d.cbct && "CBCT",
    ].filter(Boolean) as string[];
    pdf.tagRow("Diagnostic Records Taken", records, );
  }

  // ── Treatment Plan ──
  if (latestTx) {
    const d = latestTx.data as Record<string, any>;
    pdf.sectionHeading("Treatment Plan");
    pdf.textBlock("Objectives", d.objectives);
    pdf.row("Estimated Duration", d.estimated_duration_months ? `${d.estimated_duration_months} months` : undefined);
    pdf.row("Extractions", d.extractions);
    pdf.row("Retention Plan", d.retention_plan);
    pdf.row("Retainer Type", d.retainer_type);
    pdf.tagRow("Fixed Appliances", jsonArr(d.fixed_appliances));
    pdf.tagRow("Removable Appliances", jsonArr(d.removable_appliances));
    pdf.tagRow("Clear Aligners", jsonArr(d.clear_aligners));
    pdf.tagRow("Orthopedic Appliances", jsonArr(d.orthopedic_appliances));
    pdf.tagRow("Surgical Treatment", jsonArr(d.surgical_treatment));
    pdf.tagRow("Interceptive Treatment", jsonArr(d.interceptive_treatment), );
  }

  pdf.footer();
  pdf.end();
}

// ── Patient ID Card (compact, A5-ish crop) ─────────────────────────────────

export async function generatePatientIdCard(patientId: string, res: Response) {
  const patient = await prisma.patient.findUnique({
    where: { id: patientId },
    include: { enrollments: { include: { department: true } } },
  });
  if (!patient) throw new NotFoundError("Patient not found");

  const cardWidth = 340;
  const cardHeight = 280;
  const doc = new (require("pdfkit"))({ size: [cardWidth, cardHeight], margin: 0 });
  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `inline; filename="id-card-${patient.fileNumber}.pdf"`);
  doc.pipe(res);

  // Card background
  doc.rect(0, 0, cardWidth, cardHeight).fill("#f8fafc");
  // Left stripe
  doc.rect(0, 0, 8, cardHeight).fill("#d7b735");
  // Header bar
  doc.rect(8, 0, 332, 48).fill("#07080b");

  doc.fillColor("#ffffff").font("Helvetica-Bold").fontSize(13)
    .fontSize(9).text("Orthodontics Department - Benghazi", 20, 10, { width: 210, lineBreak: false });
  doc.fillColor("#94a3b8").font("Helvetica").fontSize(8)
    .text("Patient Identification Card", 20, 28);

  // File number badge
  doc.roundedRect(240, 8, 88, 32, 4).fill("#d7b735");
  doc.fillColor("#ffffff").font("Helvetica-Bold").fontSize(9)
    .text("FILE NUMBER", 244, 13);
  doc.font("Helvetica-Bold").fontSize(12)
    .text(patient.fileNumber, 244, 24);

  // Patient info
  const col = 20;
  const nameY = 60;
  doc.fillColor("#0f172a").font("Helvetica-Bold").fontSize(14)
    .text(patient.fullName, col, nameY, { width: 200 });

  const infoY = nameY + 22;
  const rows = [
    ["DOB", fmtDate(patient.birthDate)],
    ["Age", `${age(patient.birthDate)} years`],
    ["Gender", patient.gender === "MALE" ? "Male" : "Female"],
    ["Nationality", patient.nationality ?? "—"],
    ["Phone", patient.phoneNumber ?? "—"],
    ["Doctor", patient.assignedDoctorName ?? "—"],
    ["Supervisor", patient.supervisorName ?? "—"],
    ["Guardian", patient.guardianContact ?? "—"],
    ["Dept.", patient.enrollments.map((e) => e.department.name).join(", ")],
    ["Entry", fmtDate(patient.entryDate)],
  ];

  rows.forEach(([label, value], i) => {
    const y = infoY + i * 17;
    doc.fillColor("#64748b").font("Helvetica").fontSize(8).text(label, col, y, { width: 72, lineBreak: false });
    doc.fillColor("#0f172a").font("Helvetica").fontSize(8).text(value, col + 75, y, { width: 155, lineBreak: false, ellipsis: true });
  });

  // Photo placeholder box
  doc.rect(250, 58, 80, 100).fill("#e2e8f0").stroke("#cbd5e1");
  doc.fillColor("#94a3b8").font("Helvetica").fontSize(8)
    .text("Photo", 270, 103);

  // Footer
  doc.rect(8, cardHeight - 20, 332, 20).fill("#f1f5f9");
  doc.fillColor("#64748b").font("Helvetica").fontSize(7)
    .text(`Issued: ${fmtDate(new Date())}  ·  Orthodontics Department - Benghazi`, 16, cardHeight - 14);

  doc.end();
}

// ── Appointment Schedule ───────────────────────────────────────────────────

export async function generateAppointmentSchedule(
  res: Response,
  opts: { patientId?: string; providerId?: string; date?: Date }
) {
  const dateFrom = opts.date ? new Date(opts.date) : new Date();
  dateFrom.setHours(0, 0, 0, 0);
  const dateTo = new Date(dateFrom);
  dateTo.setHours(23, 59, 59, 999);

  const appointments = await prisma.appointment.findMany({
    where: {
      startTime: { gte: dateFrom, lte: dateTo },
      ...(opts.patientId ? { patientId: opts.patientId } : {}),
      ...(opts.providerId ? { providerId: opts.providerId } : {}),
      status: { notIn: ["CANCELLED", "NO_SHOW"] },
    },
    include: {
      patient: true,
      provider: true,
      department: true,
    },
    orderBy: { startTime: "asc" },
  });

  const pdf = new PdfBuilder();
  pdf.pipeToResponse(res, `schedule-${dateFrom.toISOString().slice(0, 10)}.pdf`);

  const dateLabel = fmtDate(dateFrom);
  pdf.header(CLINIC_NAME, "Appointment Schedule", dateLabel);

  if (appointments.length === 0) {
    pdf.doc.moveDown();
    pdf.doc.fillColor("#64748b").font("Helvetica").fontSize(11)
      .text("No appointments scheduled for this date.", 48, pdf.doc.y);
  } else {
    appointments.forEach((appt, i) => {
      pdf.sectionHeading(`${i + 1}. ${fmtDateTime(appt.startTime)} — ${new Date(appt.endTime).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}`);
      pdf.row("Patient", `${appt.patient.fullName}  (File #${appt.patient.fileNumber})`);
      pdf.row("Department", appt.department.name);
      pdf.row("Provider", appt.provider.fullName);
      pdf.row("Status", appt.status);
      pdf.row("Reason", appt.reason, { last: true });
    });
  }

  pdf.footer();
  pdf.end();
}
