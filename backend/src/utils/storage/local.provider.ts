import fs from "fs";
import path from "path";
import { v4 as uuidv4 } from "uuid";
import { config } from "../../config/env";
import { StorageProvider, UploadInput, StorageResult } from "./provider.interface";
import { logger } from "../../config/logger";

const IMAGE_MIMES = new Set(["image/jpeg", "image/png", "image/gif", "image/webp", "image/svg+xml"]);

function extFromMime(mimeType: string, originalName: string): string {
  const fromOriginal = path.extname(originalName);
  if (fromOriginal) return fromOriginal;
  const map: Record<string, string> = {
    "image/jpeg": ".jpg",
    "image/png": ".png",
    "image/gif": ".gif",
    "image/webp": ".webp",
    "image/svg+xml": ".svg",
    "application/pdf": ".pdf",
  };
  return map[mimeType] ?? "";
}

export class LocalStorageProvider implements StorageProvider {
  readonly name = "local";
  private readonly root: string;
  private readonly baseUrl: string;

  constructor() {
    this.root = path.resolve(config.storage.local.storagePath);
    this.baseUrl = config.storage.local.serverBaseUrl.replace(/\/$/, "");
    fs.mkdirSync(this.root, { recursive: true });
  }

  async upload(input: UploadInput, folder: string): Promise<StorageResult> {
    const dir = path.join(this.root, folder);
    fs.mkdirSync(dir, { recursive: true });

    const ext = extFromMime(input.mimeType, input.originalName);
    const fileId = `${folder}/${uuidv4()}${ext}`;
    const filePath = path.join(this.root, fileId);

    fs.writeFileSync(filePath, input.buffer);
    logger.debug(`LocalStorage: saved ${fileId} (${input.size} bytes)`);

    const url = `${this.baseUrl}/api/files/serve/${encodeURIComponent(fileId)}`;
    const isImage = IMAGE_MIMES.has(input.mimeType);
    // For local storage, thumbnail = same URL; the frontend can resize via CSS
    const thumbnailUrl = isImage ? url : null;

    return { fileId, url, thumbnailUrl };
  }

  async delete(fileId: string): Promise<void> {
    // Sanitise: prevent path traversal
    const safe = path.normalize(fileId).replace(/^(\.\.(\/|\\|$))+/, "");
    const filePath = path.join(this.root, safe);
    try {
      fs.unlinkSync(filePath);
      logger.debug(`LocalStorage: deleted ${safe}`);
    } catch (err: any) {
      if (err.code !== "ENOENT") throw err; // ignore already-deleted
    }
  }

  getUrl(fileId: string): string {
    return `${this.baseUrl}/api/files/serve/${encodeURIComponent(fileId)}`;
  }

  /** Returns the absolute filesystem path for a fileId — used by the serve endpoint */
  resolvePath(fileId: string): string {
    const safe = path.normalize(fileId).replace(/^(\.\.(\/|\\|$))+/, "");
    return path.join(this.root, safe);
  }
}
