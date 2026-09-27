import { prisma } from "../../config/prisma";
import { ConflictError, NotFoundError } from "../../middleware/error";
import { ilike } from "../../utils/db-helpers";
import { audit, AuditAction } from "../../utils/audit";

export async function listPatients(params: {
  page: number;
  pageSize: number;
  search?: string;
  departmentId?: string;
  includeArchived: boolean;
}) {
  const { page, pageSize, search, departmentId, includeArchived } = params;
  const where = {
    ...(includeArchived ? {} : { isArchived: false }),
    ...(departmentId ? { enrollments: { some: { departmentId } } } : {}),
    ...(search
      ? {
          OR: [
            { fullName: { contains: search, ...ilike() } },
            { fileNumber: { contains: search, ...ilike() } },
            { phoneNumber: { contains: search, ...ilike() } },
          ],
        }
      : {}),
  };

  const [items, total] = await prisma.$transaction([
    prisma.patient.findMany({
      where,
      include: { enrollments: { include: { department: true } } },
      skip: (page - 1) * pageSize,
      take: pageSize,
      orderBy: { createdAt: "desc" },
    }),
    prisma.patient.count({ where }),
  ]);

  return { items, total, page, pageSize };
}

export async function getPatientById(id: string) {
  const patient = await prisma.patient.findUnique({
    where: { id },
    include: {
      enrollments: { include: { department: true } },
      medicalHistory: true,
    },
  });
  if (!patient) throw new NotFoundError("Patient not found");
  return patient;
}

export async function createPatient(
  data: {
    fileNumber: string;
    fullName: string;
    birthDate: Date;
    gender: "MALE" | "FEMALE";
    nationality?: string;
    phoneNumber?: string;
    guardianContact?: string;
    assignedDoctorName?: string;
    supervisorName?: string;
    departmentId: string;
  },
  createdById: string
) {
  const fileNumber = data.fileNumber.trim();

  const existing = await prisma.patient.findUnique({ where: { fileNumber } });
  if (existing) throw new ConflictError("A patient with this file number already exists");

  const patient = await prisma.patient.create({
    data: {
      fileNumber,
      fullName: data.fullName,
      birthDate: data.birthDate,
      gender: data.gender,
      nationality: data.nationality,
      phoneNumber: data.phoneNumber,
      guardianContact: data.guardianContact,
      assignedDoctorName: data.assignedDoctorName,
      supervisorName: data.supervisorName,
      createdById,
      enrollments: { create: { departmentId: data.departmentId } },
    },
    include: { enrollments: { include: { department: true } } },
  });

  audit({ userId: createdById, action: AuditAction.PATIENT_CREATE, entityType: "Patient", entityId: patient.id, metadata: { fileNumber: patient.fileNumber } });
  return patient;
}

export async function updatePatient(
  id: string,
  data: Partial<{
    fileNumber: string;
    fullName: string;
    birthDate: Date;
    gender: "MALE" | "FEMALE";
    nationality: string;
    phoneNumber: string;
    guardianContact: string;
    assignedDoctorName: string;
    supervisorName: string;
  }>
) {
  await getPatientById(id);
  if (data.fileNumber) {
    const existing = await prisma.patient.findUnique({ where: { fileNumber: data.fileNumber.trim() } });
    if (existing && existing.id !== id) {
      throw new ConflictError("A patient with this file number already exists");
    }
    data.fileNumber = data.fileNumber.trim();
  }
  return prisma.patient.update({ where: { id }, data });
}

export async function enrollPatientInDepartment(patientId: string, departmentId: string) {
  await getPatientById(patientId);
  const existing = await prisma.patientDepartmentEnrollment.findUnique({
    where: { patientId_departmentId: { patientId, departmentId } },
  });
  if (existing) throw new ConflictError("Patient is already enrolled in this department");
  return prisma.patientDepartmentEnrollment.create({
    data: { patientId, departmentId },
    include: { department: true },
  });
}

export async function archivePatient(id: string) {
  await getPatientById(id);
  return prisma.patient.update({ where: { id }, data: { isArchived: true } });
}

export async function restorePatient(id: string) {
  await getPatientById(id);
  return prisma.patient.update({ where: { id }, data: { isArchived: false } });
}

// --- Medical History ---

export async function upsertMedicalHistory(
  patientId: string,
  data: {
    conditions: string[];
    allergies: string[];
    currentMedication?: string;
    medicationDose?: string;
    familyHistory: string[];
    habits: string[];
    notes?: string;
  },
  updatedById: string
) {
  await getPatientById(patientId);
  return prisma.medicalHistory.upsert({
    where: { patientId },
    create: { patientId, ...data, updatedById },
    update: { ...data, updatedById },
  });
}

export async function getMedicalHistory(patientId: string) {
  const history = await prisma.medicalHistory.findUnique({ where: { patientId } });
  if (!history) throw new NotFoundError("No medical history recorded for this patient yet");
  return history;
}
