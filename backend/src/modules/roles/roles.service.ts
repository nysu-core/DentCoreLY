import { prisma } from "../../config/prisma";

export async function listRoles() {
  const roles = await prisma.role.findMany({
    orderBy: { name: "asc" },
    include: {
      _count: { select: { users: true, permissions: true } },
    },
  });
  return roles.map((r) => ({
    id: r.id,
    name: r.name,
    description: r.description,
    isSystem: r.isSystem,
    userCount: r._count.users,
    permissionCount: r._count.permissions,
  }));
}

export async function getRolePermissions(roleId: string) {
  const rows = await prisma.rolePermission.findMany({
    where: { roleId },
    include: { permission: true },
  });
  return rows.map((r) => r.permission).sort((a, b) => a.key.localeCompare(b.key));
}

export async function listAllPermissions() {
  return prisma.permission.findMany({ orderBy: [{ module: "asc" }, { key: "asc" }] });
}
