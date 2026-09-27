import { Router } from "express";
import { asyncHandler } from "../../middleware/error";
import { authenticate, requirePermission } from "../../middleware/rbac";
import { createBackup, listBackups, downloadBackup, deleteBackup } from "./backup.service";
import { audit, AuditAction } from "../../utils/audit";

export const backupRouter = Router();
backupRouter.use(authenticate, requirePermission("backup.manage"));

// List all backups
backupRouter.get(
  "/",
  asyncHandler(async (_req, res) => {
    res.json(listBackups());
  })
);

// Trigger a new backup
backupRouter.post(
  "/",
  asyncHandler(async (req, res) => {
    const result = await createBackup();
    audit({ userId: req.user!.sub, action: "BACKUP_CREATE", metadata: result });
    res.status(201).json(result);
  })
);

// Download a specific backup
backupRouter.get(
  "/:filename",
  asyncHandler(async (req, res) => {
    audit({ userId: req.user!.sub, action: "BACKUP_DOWNLOAD", metadata: { filename: req.params.filename } });
    downloadBackup(req.params.filename, res);
  })
);

// Delete a backup
backupRouter.delete(
  "/:filename",
  asyncHandler(async (req, res) => {
    deleteBackup(req.params.filename);
    audit({ userId: req.user!.sub, action: "BACKUP_DELETE", metadata: { filename: req.params.filename } });
    res.status(204).send();
  })
);
