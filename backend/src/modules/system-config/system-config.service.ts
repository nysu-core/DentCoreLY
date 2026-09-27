import { z } from "zod";
import { prisma } from "../../config/prisma";

export const updateConfigSchema = z.object({
  updates: z.array(
    z.object({
      key:   z.string().min(1),
      value: z.string(),
    })
  ).min(1),
});

export async function getAllConfig() {
  return prisma.systemConfig.findMany({ orderBy: { key: "asc" } });
}

export async function getConfigValue(key: string): Promise<string | null> {
  const record = await prisma.systemConfig.findUnique({ where: { key } });
  return record?.value ?? null;
}

export async function updateConfig(
  updates: { key: string; value: string }[],
  updatedById: string
) {
  await prisma.$transaction(
    updates.map(({ key, value }) =>
      prisma.systemConfig.upsert({
        where:  { key },
        update: { value, updatedById },
        create: { key, value, updatedById },
      })
    )
  );
  return getAllConfig();
}
