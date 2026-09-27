import { PrismaClient } from "@prisma/client";

const databaseUrl = process.env.LEGACY_DATABASE_URL;
if (!databaseUrl) throw new Error("Set LEGACY_DATABASE_URL to the source database connection string.");

const source = new PrismaClient({ datasources: { db: { url: databaseUrl } } });

async function main() {
  const tables = await source.$queryRawUnsafe<Array<{ table_name: string }>>(
    "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE' ORDER BY table_name"
  );

  for (const { table_name: tableName } of tables) {
    const identifier = `\"${tableName.replaceAll('"', '\\"')}\"`;
    const [{ count }] = await source.$queryRawUnsafe<Array<{ count: number }>>(
      `SELECT COUNT(*)::int AS count FROM public.${identifier}`
    );
    console.log(`${tableName}\t${count}`);
  }
}

main()
  .catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  })
  .finally(() => source.$disconnect());
