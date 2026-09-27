import { config } from "../config/env";

/**
 * Returns `{ mode: 'insensitive' }` on PostgreSQL, empty object on SQLite.
 * SQLite's LIKE is case-insensitive by default for ASCII; `mode: 'insensitive'`
 * is a PostgreSQL-only Prisma extension that causes errors on SQLite.
 *
 * Usage:
 *   where: { fullName: { contains: search, ...ilike() } }
 */
export function ilike(): { mode: "insensitive" } | Record<string, never> {
  return config.db.provider === "postgresql" ? { mode: "insensitive" as const } : {};
}

/**
 * True when running against PostgreSQL — use for any feature that is
 * PostgreSQL-specific (e.g. full-text search, JSONB operators).
 */
export const isPostgres = config.db.provider === "postgresql";
