import { prisma } from "../../config/prisma";
import { NotFoundError, ForbiddenError } from "../../middleware/error";
import { getStorageProvider } from "../../utils/storage";
import { FILE_CATEGORIES } from "./files.schema";
import { logger } from "../../config/logger";

const FOLDER_MAP: Record<(typeof FILE_CATEGORIES)[number], string> = {
  INTRAORAL_PHOTO: "clinical/intraoral",
  EXTRAORAL_PHOTO: "clinical/extraoral",
  PANORAMIC_XRAY: "xrays/panoramic",
  CEPHALOMETRIC_XRAY: "xrays/cephalometric",
  CBCT: "xrays/cbct",
  STUDY_MODEL: "models",
  DOCUMENT: "documents",
  OTHER: "other",
};

export async function uploadFile(
  patientId: string,
  category: (typeof FILE_CATEGORIES)[number],
  file: { buffer: Buffer; originalname: string; mimetype: string; size: number },
  notes: string | undefined,
  uploadedById: string
) {
  const storage = getStorageProvider();
  const folder = FOLDER_MAP[category];

  const result = await storage.upload(
    {
      buffer: file.buffer,
      originalName: file.originalname,
      mimeType: file.mimetype,
      size: file.size,
    },
    folder
  );

  const record = await prisma.clinicalFile.create({
    data: {
      patientId,
      category,
      storageProvider: storage.name,
      fileId: result.fileId,
      url: result.url,
      thumbnailUrl: result.thumbnailUrl,
      filename: file.originalname,
      mimeType: file.mimetype,
      size: file.size,
      notes,
      uploadedById,
    },
  });

  logger.info(`File uploaded: ${record.id} (${category}) for patient ${patientId} via ${storage.name}`);
  return record;
}

export async function listFiles(patientId: string, category?: string) {
  return prisma.clinicalFile.findMany({
    where: {
      patientId,
      ...(category ? { category: category as any } : {}),
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function getFileById(id: string) {
  const file = await prisma.clinicalFile.findUnique({ where: { id } });
  if (!file) throw new NotFoundError("File not found");
  return file;
}

export async function updateFile(id: string, data: { notes?: string; category?: string }) {
  await getFileById(id);
  return prisma.clinicalFile.update({ where: { id }, data: data as any });
}

export async function deleteFile(id: string, requestedById: string, isAdmin: boolean) {
  const file = await getFileById(id);

  // Only the uploader or an admin can delete
  if (!isAdmin && file.uploadedById !== requestedById) {
    throw new ForbiddenError("You can only delete files you uploaded");
  }

  const storage = getStorageProvider();
  try {
    await storage.delete(file.fileId);
  } catch (err) {
    logger.warn(`Storage delete failed for fileId ${file.fileId} — removing DB record anyway`, { err });
  }

  await prisma.clinicalFile.delete({ where: { id } });
  logger.info(`File deleted: ${id} by user ${requestedById}`);
}
