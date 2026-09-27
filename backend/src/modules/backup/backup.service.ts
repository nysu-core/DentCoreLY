import fs   from "fs";
import path from "path";
import { execSync } from "child_process";
import { Response }  from "express";
import { config }    from "../../config/env";
import { logger }    from "../../config/logger";
import { AppError }  from "../../middleware/error";

const BACKUP_DIR = path.resolve("./backups");

function ensureBackupDir() {
  fs.mkdirSync(BACKUP_DIR, { recursive: true });
}

function timestamp() {
  return new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
}

// ── Create backup ─────────────────────────────────────────────────────────

export async function createBackup(): Promise<{ filename: string; sizeBytes: number }> {
  ensureBackupDir();
  const ts = timestamp();

  if (config.db.provider === "sqlite") {
    // For SQLite: just copy the .db file
    const dbPath = process.env.DATABASE_URL?.replace("file:", "") ?? "./dev.db";
    const src    = path.resolve(dbPath);
    if (!fs.existsSync(src)) throw new AppError("SQLite database file not found", 500);

    const filename = `orthocore-sqlite-${ts}.db`;
    const dest     = path.join(BACKUP_DIR, filename);
    fs.copyFileSync(src, dest);
    const sizeBytes = fs.statSync(dest).size;
    logger.info(`SQLite backup created: ${filename} (${sizeBytes} bytes)`);
    return { filename, sizeBytes };

  } else {
    // For PostgreSQL: use pg_dump (must be installed on the server)
    const filename = `orthocore-pg-${ts}.sql`;
    const dest     = path.join(BACKUP_DIR, filename);
    const url      = process.env.DATABASE_URL ?? "";

    try {
      execSync(`pg_dump "${url}" -f "${dest}" --no-password`, { stdio: "pipe" });
    } catch (err: any) {
      logger.error("pg_dump failed", { err: err.message });
      throw new AppError(
        "pg_dump failed. Make sure PostgreSQL client tools are installed on the server. " +
        "Install with: sudo apt-get install postgresql-client",
        500
      );
    }

    const sizeBytes = fs.statSync(dest).size;
    logger.info(`PostgreSQL backup created: ${filename} (${sizeBytes} bytes)`);
    return { filename, sizeBytes };
  }
}

// ── List existing backups ─────────────────────────────────────────────────

export function listBackups() {
  ensureBackupDir();
  return fs
    .readdirSync(BACKUP_DIR)
    .filter((f) => f.startsWith("orthocore-"))
    .map((filename) => {
      const stat = fs.statSync(path.join(BACKUP_DIR, filename));
      return { filename, sizeBytes: stat.size, createdAt: stat.mtime.toISOString() };
    })
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt)); // newest first
}

// ── Download a backup file ────────────────────────────────────────────────

export function downloadBackup(filename: string, res: Response) {
  // Sanitise — prevent path traversal
  const safe = path.basename(filename);
  if (!safe.startsWith("orthocore-")) throw new AppError("Invalid backup filename", 400);

  const filePath = path.join(BACKUP_DIR, safe);
  if (!fs.existsSync(filePath)) throw new AppError("Backup file not found", 404);

  res.setHeader("Content-Disposition", `attachment; filename="${safe}"`);
  res.setHeader("Content-Type", "application/octet-stream");
  fs.createReadStream(filePath).pipe(res);
}

// ── Delete a backup file ──────────────────────────────────────────────────

export function deleteBackup(filename: string) {
  const safe = path.basename(filename);
  if (!safe.startsWith("orthocore-")) throw new AppError("Invalid backup filename", 400);
  const filePath = path.join(BACKUP_DIR, safe);
  if (!fs.existsSync(filePath)) throw new AppError("Backup file not found", 404);
  fs.unlinkSync(filePath);
  logger.info(`Backup deleted: ${safe}`);
}
