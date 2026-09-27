import { prisma } from "../../config/prisma";
import { ConflictError, NotFoundError } from "../../middleware/error";

export async function listDepartments(includeInactive = false) {
  return prisma.department.findMany({
    where: includeInactive ? {} : { isActive: true },
    orderBy: { name: "asc" },
  });
}

export async function getDepartmentById(id: string) {
  const dept = await prisma.department.findUnique({ where: { id } });
  if (!dept) throw new NotFoundError("Department not found");
  return dept;
}

export async function createDepartment(data: { name: string; code: string }) {
  const existing = await prisma.department.findFirst({
    where: { OR: [{ name: data.name }, { code: data.code }] },
  });
  if (existing) throw new ConflictError("A department with this name or code already exists");
  return prisma.department.create({ data });
}

export async function updateDepartment(id: string, data: { name?: string; isActive?: boolean }) {
  await getDepartmentById(id);
  return prisma.department.update({ where: { id }, data });
}
