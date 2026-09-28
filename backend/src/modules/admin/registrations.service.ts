import { prisma } from "../../config/prisma";
import { NotFoundError, AppError } from "../../middleware/error";
import { sendMail } from "../../utils/mailer";
import { accountApprovedEmail, accountDeniedEmail } from "../../utils/email-templates";
import { audit, AuditAction } from "../../utils/audit";
import { z } from "zod";

const safeSelect = {
  id:               true,
  fullName:         true,
  email:            true,
  status:           true,
  registrationNote: true,
  statusNote:       true,
  createdAt:        true,
  role:             { select: { id: true, name: true } },
  department:       { select: { id: true, name: true } },
} as const;

export const reviewRegistrationSchema = z.object({
  decision:   z.enum(["APPROVED", "DENIED"]),
  statusNote: z.string().max(500).optional(),
});

export async function listPendingRegistrations() {
  return prisma.user.findMany({
    where:   { status: "PENDING" },
    select:  safeSelect,
    orderBy: { createdAt: "asc" }, // oldest first — fair queue
  });
}

export async function listAllRegistrations(status?: "PENDING" | "ACTIVE" | "DISABLED") {
  return prisma.user.findMany({
    where:   status ? { status } : { status: { in: ["PENDING", "ACTIVE", "DISABLED"] } },
    select:  safeSelect,
    orderBy: { createdAt: "desc" },
  });
}

export async function getPendingCount(): Promise<number> {
  return prisma.user.count({ where: { status: "PENDING" } });
}

export async function reviewRegistration(
  userId:       string,
  decision:     "APPROVED" | "DENIED",
  statusNote:   string | undefined,
  reviewedById: string
) {
  const user = await prisma.user.findUnique({
    where:   { id: userId },
    include: { role: true },
  });

  if (!user) throw new NotFoundError("User not found");
  if (user.status !== "PENDING") {
    throw new AppError(`This account is already ${user.status.toLowerCase()} — cannot review again`, 409);
  }

  const newStatus = decision === "APPROVED" ? "ACTIVE" : "DISABLED";

  await prisma.user.update({
    where: { id: userId },
    data:  { status: newStatus, statusNote },
  });

  // Send outcome email to the applicant
  if (decision === "APPROVED") {
    await sendMail({
      to:      user.email,
      subject: `✅ Account Approved — Orthodontics Department - Faculty of Dentistry - Benghazi`,
      html:    accountApprovedEmail({
        fullName: user.fullName,
        role:     user.role.name,
        note:     statusNote,
      }),
    });

    audit({
      userId:     reviewedById,
      action:     AuditAction.USER_UPDATE,
      entityType: "User",
      entityId:   userId,
      metadata:   { decision: "APPROVED", targetEmail: user.email },
    });
  } else {
    await sendMail({
      to:      user.email,
      subject: `Registration Update — Orthodontics Department - Faculty of Dentistry - Benghazi`,
      html:    accountDeniedEmail({
        fullName: user.fullName,
        reason:   statusNote,
      }),
    });

    audit({
      userId:     reviewedById,
      action:     AuditAction.USER_DISABLE,
      entityType: "User",
      entityId:   userId,
      metadata:   { decision: "DENIED", targetEmail: user.email },
    });
  }

  return { id: userId, decision, newStatus };
}
