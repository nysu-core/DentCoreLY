import bcrypt from "bcrypt";
import { prisma } from "../../config/prisma";
import { ConflictError, NotFoundError, UnauthorizedError } from "../../middleware/error";
import { ilike } from "../../utils/db-helpers";

const SALT_ROUNDS = 12;

const safeUserSelect = {
  id: true,
  email: true,
  fullName: true,
  status: true,
  roleId: true,
  role: { select: { id: true, name: true } },
  departmentId: true,
  department: { select: { id: true, name: true } },
  createdAt: true,
  lastLoginAt: true,
} as const;

export async function listUsers(params: {
  page: number;
  pageSize: number;
  search?: string;
  roleId?: string;
  departmentId?: string;
}) {
  const { page, pageSize, search, roleId, departmentId } = params;
  const where = {
    ...(roleId ? { roleId } : {}),
    ...(departmentId ? { departmentId } : {}),
    ...(search
      ? {
          OR: [
            { fullName: { contains: search, ...ilike() } },
            { email: { contains: search, ...ilike() } },
          ],
        }
      : {}),
  };

  const [items, total] = await prisma.$transaction([
    prisma.user.findMany({
      where,
      select: safeUserSelect,
      skip: (page - 1) * pageSize,
      take: pageSize,
      orderBy: { createdAt: "desc" },
    }),
    prisma.user.count({ where }),
  ]);

  return { items, total, page, pageSize };
}

export async function getUserById(id: string) {
  const user = await prisma.user.findUnique({ where: { id }, select: safeUserSelect });
  if (!user) throw new NotFoundError("User not found");
  return user;
}

export async function createUser(data: {
  email: string;
  password: string;
  fullName: string;
  roleId: string;
  departmentId?: string;
}) {
  const existing = await prisma.user.findUnique({ where: { email: data.email } });
  if (existing) throw new ConflictError("A user with this email already exists");

  const passwordHash = await bcrypt.hash(data.password, SALT_ROUNDS);
  const user = await prisma.user.create({
    data: {
      email: data.email,
      passwordHash,
      fullName: data.fullName,
      roleId: data.roleId,
      departmentId: data.departmentId,
    },
    select: safeUserSelect,
  });
  return user;
}

export async function updateUser(
  id: string,
  data: { fullName?: string; roleId?: string; departmentId?: string | null; status?: "ACTIVE" | "DISABLED" | "PENDING" }
) {
  await getUserById(id);
  const user = await prisma.user.update({ where: { id }, data, select: safeUserSelect });
  return user;
}

export async function changeOwnPassword(userId: string, currentPassword: string, newPassword: string) {
  const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
  const valid = await bcrypt.compare(currentPassword, user.passwordHash);
  if (!valid) throw new UnauthorizedError("Current password is incorrect");

  const passwordHash = await bcrypt.hash(newPassword, SALT_ROUNDS);
  await prisma.user.update({ where: { id: userId }, data: { passwordHash } });
  // Invalidate all existing sessions on password change.
  await prisma.refreshToken.updateMany({ where: { userId }, data: { revoked: true } });
}

// Admin-initiated reset (e.g. for a locked-out user) — does not require the old password.
export async function adminResetPassword(targetUserId: string, newPassword: string) {
  await getUserById(targetUserId);
  const passwordHash = await bcrypt.hash(newPassword, SALT_ROUNDS);
  await prisma.user.update({ where: { id: targetUserId }, data: { passwordHash } });
  await prisma.refreshToken.updateMany({ where: { userId: targetUserId }, data: { revoked: true } });
}

export async function disableUser(id: string) {
  await getUserById(id);
  await prisma.user.update({ where: { id }, data: { status: "DISABLED" } });
  await prisma.refreshToken.updateMany({ where: { userId: id }, data: { revoked: true } });
}
