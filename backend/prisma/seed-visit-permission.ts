import "dotenv/config";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const permission = await prisma.permission.upsert({
    where: { key: "visits.manage" },
    update: {},
    create: {
      key: "visits.manage",
      module: "visits",
      description: "Record visit treatment plans and notes",
    },
  });

  for (const name of ["Administrator", "Orthodontist", "Assistant"]) {
    const role = await prisma.role.findUnique({ where: { name }, select: { id: true } });
    if (!role) continue;
    await prisma.rolePermission.upsert({
      where: { roleId_permissionId: { roleId: role.id, permissionId: permission.id } },
      update: {},
      create: { roleId: role.id, permissionId: permission.id },
    });
  }
  console.log("Visit permissions seeded.");
}

main()
  .catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());