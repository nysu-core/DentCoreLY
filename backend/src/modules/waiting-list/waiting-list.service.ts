import { prisma } from "../../config/prisma";
import { NotFoundError } from "../../middleware/error";

export async function listWaitingList(departmentId?: string) {
  return prisma.waitingListEntry.findMany({
    where: { isActive: true, ...(departmentId ? { departmentId } : {}) },
    include: {
      patient: { select: { id: true, fileNumber: true, fullName: true, phoneNumber: true } },
      department: { select: { id: true, name: true } },
    },
    orderBy: { createdAt: "asc" }, // first-in-first-out
  });
}

export async function addToWaitingList(
  data: { patientId: string; departmentId: string; preferredNotes?: string },
  addedById: string
) {
  return prisma.waitingListEntry.create({
    data: { ...data, addedById },
    include: { patient: true, department: true },
  });
}

export async function removeFromWaitingList(id: string) {
  const entry = await prisma.waitingListEntry.findUnique({ where: { id } });
  if (!entry) throw new NotFoundError("Waiting list entry not found");
  return prisma.waitingListEntry.update({ where: { id }, data: { isActive: false } });
}
