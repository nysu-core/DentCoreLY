export interface UploadInput {
  buffer: Buffer;
  originalName: string;
  mimeType: string;
  size: number;
}

export interface StorageResult {
  /** Provider-specific identifier used to delete or re-reference the file later */
  fileId: string;
  /** Full URL the client uses to display / download the file */
  url: string;
  /** Thumbnail URL (ImageKit auto-generates; null for local non-images) */
  thumbnailUrl: string | null;
}

export interface StorageProvider {
  readonly name: string;
  upload(input: UploadInput, folder: string): Promise<StorageResult>;
  delete(fileId: string): Promise<void>;
  /** Returns the access URL for a stored file by its fileId */
  getUrl(fileId: string): string;
}
