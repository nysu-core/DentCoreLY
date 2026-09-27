import { z } from "zod";
import { prisma } from "../../config/prisma";
import { ilike } from "../../utils/db-helpers";

export const auditQuerySchema = z.object({
  page:       z.coerce.number().int().positive().default(1),
  pageSize:   z.coerce.number().int().positive().max(100).default(50),
  userId:     z.string().uuid().optional(),
  action:     z.string().optional(),
  entityType: z.string().optional(),
  entityId:   z.string().optional(),
  dateFrom:   z.coerce.date().optional(),
  dateTo:     z.coerce.date().optional(),
  search:     z.string().optional(),
});

export type AuditQuery = z.infer<typeof auditQuerySchema>;

export async function listAuditLogs(params: AuditQuery) {
  const { page, pageSize, userId, action, entityType, entityId, dateFrom, dateTo, search } = params;

  const where: any = {
    ...(userId     ? { userId }     : {}),
    ...(entityType ? { entityType } : {}),
    ...(entityId   ? { entityId }   : {}),
    ...(action     ? { action: { contains: action, ...ilike() } } : {}),
    ...(search     ? { action: { contains: search, ...ilike() } } : {}),
    ...((dateFrom || dateTo)
      ? {
          createdAt: {
            ...(dateFrom ? { gte: dateFrom } : {}),
            ...(dateTo   ? { lte: dateTo }   : {}),
          },
        }
      : {}),
  };

  const [items, total] = await prisma.$transaction([
    prisma.auditLog.findMany({
      where,
      include: { user: { select: { id: true, fullName: true, email: true } } },
      orderBy: { createdAt: "desc" },
      skip:  (page - 1) * pageSize,
      take:  pageSize,
    }),
    prisma.auditLog.count({ where }),
  ]);

  return { items, total, page, pageSize };
}

export async function getActionTypes(): Promise<string[]> {
  const logs = await prisma.auditLog.findMany({
    distinct: ["action"],
    select: { action: true },
    orderBy: { action: "asc" },
  });
  return logs.map((l) => l.action);
}

export async function getEntityTypes(): Promise<string[]> {
  const logs = await prisma.auditLog.findMany({
    where: { entityType: { not: null } },
    distinct: ["entityType"],
    select: { entityType: true },
    orderBy: { entityType: "asc" },
  });
  return logs.map((l) => l.entityType!);
}
