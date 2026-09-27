import { prisma } from "../../config/prisma";
import { ConflictError, NotFoundError, AppError } from "../../middleware/error";

const includeRelations = {
  patient: { select: { id: true, fileNumber: true, fullName: true, phoneNumber: true } },
  department: { select: { id: true, name: true } },
  provider: { select: { id: true, fullName: true } },
};

async function assertNoConflict(providerId: string, startTime: Date, endTime: Date, excludeId?: string) {
  const overlapping = await prisma.appointment.findFirst({
    where: {
      providerId,
      id: excludeId ? { not: excludeId } : undefined,
      status: { notIn: ["CANCELLED", "NO_SHOW"] },
      AND: [{ startTime: { lt: endTime } }, { endTime: { gt: startTime } }],
    },
  });
  if (overlapping) {
    throw new ConflictError("This provider already has an appointment in that time slot");
  }
}

export async function listAppointments(params: {
  startTime?: Date;
  endTime?: Date;
  providerId?: string;
  departmentId?: string;
  patientId?: string;
  status?: string;
}) {
  return prisma.appointment.findMany({
    where: {
      ...(params.providerId ? { providerId: params.providerId } : {}),
      ...(params.departmentId ? { departmentId: params.departmentId } : {}),
      ...(params.patientId ? { patientId: params.patientId } : {}),
      ...(params.status ? { status: params.status as any } : {}),
      ...(params.startTime || params.endTime
        ? {
            startTime: {
              ...(params.startTime ? { gte: params.startTime } : {}),
              ...(params.endTime ? { lte: params.endTime } : {}),
            },
          }
        : {}),
    },
    include: includeRelations,
    orderBy: { startTime: "asc" },
  });
}

export async function getAppointmentById(id: string) {
  const appt = await prisma.appointment.findUnique({ where: { id }, include: includeRelations });
  if (!appt) throw new NotFoundError("Appointment not found");
  return appt;
}

export async function createAppointment(
  data: {
    patientId: string;
    departmentId: string;
    providerId: string;
    startTime: Date;
    endTime: Date;
    reason?: string;
    notes?: string;
    reminderHoursBefore?: number[];
  },
  createdById: string
) {
  await assertNoConflict(data.providerId, data.startTime, data.endTime);

  const appointment = await prisma.appointment.create({
    data: {
      patientId: data.patientId,
      departmentId: data.departmentId,
      providerId: data.providerId,
      startTime: data.startTime,
      endTime: data.endTime,
      reason: data.reason,
      notes: data.notes,
      createdById,
    },
    include: includeRelations,
  });

  const hoursBefore = data.reminderHoursBefore && data.reminderHoursBefore.length > 0 ? data.reminderHoursBefore : [24];
  await prisma.appointmentReminder.createMany({
    data: hoursBefore.map((h) => ({
      appointmentId: appointment.id,
      channel: "SMS" as const,
      scheduledFor: new Date(data.startTime.getTime() - h * 60 * 60 * 1000),
    })),
  });

  return appointment;
}

export async function rescheduleAppointment(
  id: string,
  data: { startTime?: Date; endTime?: Date; providerId?: string; reason?: string; notes?: string }
) {
  const existing = await getAppointmentById(id);
  if (["CANCELLED", "COMPLETED", "NO_SHOW"].includes(existing.status)) {
    throw new AppError(`Cannot modify an appointment with status ${existing.status}`, 409);
  }

  const newStart = data.startTime || existing.startTime;
  const newEnd = data.endTime || existing.endTime;
  const newProvider = data.providerId || existing.providerId;

  if (data.startTime || data.endTime || data.providerId) {
    await assertNoConflict(newProvider, newStart, newEnd, id);
  }

  return prisma.appointment.update({
    where: { id },
    data: {
      startTime: newStart,
      endTime: newEnd,
      providerId: newProvider,
      reason: data.reason,
      notes: data.notes,
      status: "SCHEDULED", // rescheduling resets confirmation state
    },
    include: includeRelations,
  });
}

export async function cancelAppointment(id: string, cancelReason?: string) {
  const existing = await getAppointmentById(id);
  if (existing.status === "CANCELLED") throw new AppError("Appointment already cancelled", 409);
  return prisma.appointment.update({
    where: { id },
    data: { status: "CANCELLED", cancelledAt: new Date(), cancelReason },
    include: includeRelations,
  });
}

export async function confirmAppointment(id: string) {
  await getAppointmentById(id);
  return prisma.appointment.update({ where: { id }, data: { status: "CONFIRMED" }, include: includeRelations });
}

export async function checkInAppointment(id: string) {
  await getAppointmentById(id);
  return prisma.appointment.update({
    where: { id },
    data: { status: "CHECKED_IN", checkedInAt: new Date() },
    include: includeRelations,
  });
}

export async function completeAppointment(id: string) {
  await getAppointmentById(id);
  return prisma.appointment.update({ where: { id }, data: { status: "COMPLETED" }, include: includeRelations });
}

export async function markNoShow(id: string) {
  await getAppointmentById(id);
  return prisma.appointment.update({ where: { id }, data: { status: "NO_SHOW" }, include: includeRelations });
}

// --- Reminders ---

// Returns due reminders ready to be dispatched (PENDING and scheduledFor <= now).
// A scheduled job/cron should call this periodically and hand off to an SMS/email provider.
export async function getDueReminders() {
  return prisma.appointmentReminder.findMany({
    where: { status: "PENDING", scheduledFor: { lte: new Date() } },
    include: { appointment: { include: includeRelations } },
  });
}

export async function markReminderSent(id: string) {
  return prisma.appointmentReminder.update({ where: { id }, data: { status: "SENT", sentAt: new Date() } });
}

export async function markReminderFailed(id: string) {
  return prisma.appointmentReminder.update({ where: { id }, data: { status: "FAILED" } });
}
