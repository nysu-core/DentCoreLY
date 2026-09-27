import { Router, Request, Response } from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import { asyncHandler, AppError } from "../../middleware/error";
import { authenticate, requirePermission } from "../../middleware/rbac";
import { uploadFileSchema, listFilesQuerySchema, updateFileSchema, MAX_FILE_SIZE_BYTES, ALLOWED_MIME_TYPES } from "./files.schema";
import * as filesService from "./files.service";
import { config } from "../../config/env";
import { LocalStorageProvider } from "../../utils/storage/local.provider";
import { getStorageProvider } from "../../utils/storage";

export const filesRouter = Router();

// Multer: always use memory storage so the buffer is available to both
// the local provider (writes to disk itself) and ImageKit (uploads from buffer).
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_FILE_SIZE_BYTES },
  fileFilter(_req, file, cb) {
    if (ALLOWED_MIME_TYPES.has(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new AppError(`Unsupported file type: ${file.mimetype}`, 415));
    }
  },
});

filesRouter.use(authenticate);

// Upload a file for a patient
filesRouter.post(
  "/patients/:patientId/files",
  requirePermission("files.manage"),
  upload.single("file"),
  asyncHandler(async (req, res) => {
    if (!req.file) throw new AppError("No file uploaded", 400);
    const { category, notes } = uploadFileSchema.parse(req.body);
    const record = await filesService.uploadFile(
      req.params.patientId,
      category,
      req.file,
      notes,
      req.user!.sub
    );
    res.status(201).json(record);
  })
);

// List files for a patient (optionally filtered by category)
filesRouter.get(
  "/patients/:patientId/files",
  requirePermission("files.manage"),
  asyncHandler(async (req, res) => {
    const { category } = listFilesQuerySchema.parse(req.query);
    const files = await filesService.listFiles(req.params.patientId, category);
    res.json(files);
  })
);

// Get a single file record
filesRouter.get(
  "/files/:id",
  requirePermission("files.manage"),
  asyncHandler(async (req, res) => {
    const file = await filesService.getFileById(req.params.id);
    res.json(file);
  })
);

// Update file metadata (notes, category)
filesRouter.patch(
  "/files/:id",
  requirePermission("files.manage"),
  asyncHandler(async (req, res) => {
    const data = updateFileSchema.parse(req.body);
    const file = await filesService.updateFile(req.params.id, data);
    res.json(file);
  })
);

// Delete a file
filesRouter.delete(
  "/files/:id",
  requirePermission("files.manage"),
  asyncHandler(async (req, res) => {
    const isAdmin = req.user!.roleName === "Administrator";
    await filesService.deleteFile(req.params.id, req.user!.sub, isAdmin);
    res.status(204).send();
  })
);

// ---------------------------------------------------------------
// Serve local files with authentication.
// This route only matters when STORAGE_PROVIDER=local.
// When using ImageKit, files are served directly from ImageKit's CDN.
// ---------------------------------------------------------------
filesRouter.get(
  "/files/serve/:fileId(*)",
  asyncHandler(async (req: Request, res: Response) => {
    if (config.storage.provider !== "local") {
      return res.status(404).json({ error: "Local file serving is disabled when using a remote storage provider" });
    }

    const provider = getStorageProvider() as LocalStorageProvider;
    const filePath = provider.resolvePath(decodeURIComponent(req.params.fileId));

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: "File not found" });
    }

    // Security: ensure the resolved path stays inside the storage root
    const storageRoot = path.resolve(config.storage.local.storagePath);
    if (!filePath.startsWith(storageRoot)) {
      return res.status(403).json({ error: "Forbidden" });
    }

    res.sendFile(filePath);
  })
);
