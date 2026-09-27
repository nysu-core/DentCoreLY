import { z } from "zod";

export const FILE_CATEGORIES = [
  "INTRAORAL_PHOTO",
  "EXTRAORAL_PHOTO",
  "PANORAMIC_XRAY",
  "CEPHALOMETRIC_XRAY",
  "CBCT",
  "STUDY_MODEL",
  "DOCUMENT",
  "OTHER",
] as const;

export const uploadFileSchema = z.object({
  category: z.enum(FILE_CATEGORIES),
  notes: z.string().optional(),
});

export const listFilesQuerySchema = z.object({
  category: z.enum(FILE_CATEGORIES).optional(),
});

export const updateFileSchema = z.object({
  notes: z.string().optional(),
  category: z.enum(FILE_CATEGORIES).optional(),
});

// Human-readable labels for the UI
export const CATEGORY_LABELS: Record<(typeof FILE_CATEGORIES)[number], string> = {
  INTRAORAL_PHOTO: "Intraoral Photos",
  EXTRAORAL_PHOTO: "Extraoral Photos",
  PANORAMIC_XRAY: "Panoramic X-Ray",
  CEPHALOMETRIC_XRAY: "Cephalometric X-Ray",
  CBCT: "CBCT",
  STUDY_MODEL: "Study Models",
  DOCUMENT: "Documents",
  OTHER: "Other",
};

// Maximum file size: 25 MB
export const MAX_FILE_SIZE_BYTES = 25 * 1024 * 1024;

export const ALLOWED_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "image/dicom",
  "application/pdf",
  "application/octet-stream", // generic fallback for CBCT/DICOM files
]);
