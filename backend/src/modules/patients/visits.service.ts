import { prisma } from "../../config/prisma";
import { ConflictError, NotFoundError } from "../../middleware/error";
import { audit } from "../../utils/audit";

const visitInclude = {
  appointment: {
    select: {
      id: true,
      startTime: true,
      endTime: true,
      status: true,
      reason: true,
      provider: { select: { fullName: true } },
    },
  },
};

export async function listPatientVisits(patientId: string) {
  const patient = await prisma.patient.findUnique({ where: { id: patientId }, select: { id: true } });
  if (!patient) throw new NotFoundError("Patient not found");
  return prisma.patientVisit.findMany({
    where: { patientId },
    include: visitInclude,
    orderBy: { visitDate: "desc" },
  });
}

export async function createPatientVisit(
  patientId: string,
  createdById: string,
  data: {
    visitDate: Date;
    appointmentId?: string;
    treatmentPlan?: string;
    notes?: string;
    clientDraftId?: string;
  }
) {
  const patient = await prisma.patient.findUnique({ where: { id: patientId }, select: { id: true } });
  if (!patient) throw new NotFoundError("Patient not found");

  if (data.appointmentId) {
    const appointment = await prisma.appointment.findUnique({ where: { id: data.appointmentId }, select: { patientId: true } });
    if (!appointment || appointment.patientId !== patientId) {
      throw new ConflictError("Appointment does not belong to this patient");
    }
  }

  const recordData = {
    patientId,
    createdById,
    visitDate: data.visitDate,
    appointmentId: data.appointmentId,
    treatmentPlan: data.treatmentPlan,
    notes: data.notes,
  };
  const visit = data.clientDraftId
    ? await prisma.patientVisit.upsert({
        where: { clientDraftId: data.clientDraftId },
        create: { ...recordData, clientDraftId: data.clientDraftId },
        update: {},
        include: visitInclude,
      })
    : await prisma.patientVisit.create({ data: recordData, include: visitInclude });

  await audit({ userId: createdById, action: "PATIENT_VISIT_CREATE", entityType: "PatientVisit", entityId: visit.id });
  return visit;
}

export async function updatePatientVisit(patientId: string, visitId: string, data: {
  visitDate?: Date;
  treatmentPlan?: string;
  notes?: string;
}) {
  const visit = await prisma.patientVisit.findUnique({ where: { id: visitId }, select: { patientId: true } });
  if (!visit || visit.patientId !== patientId) throw new NotFoundError("Visit not found");
  return prisma.patientVisit.update({ where: { id: visitId }, data, include: visitInclude });
}