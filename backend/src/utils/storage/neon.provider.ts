import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import path from "path";
import { v4 as uuidv4 } from "uuid";
import { config } from "../../config/env";
import { StorageProvider, UploadInput, StorageResult } from "./provider.interface";

export class NeonObjectStorageProvider implements StorageProvider {
  readonly name = "neon";
  private readonly client: S3Client;
  private readonly bucket: string;
  private readonly baseUrl: string;

  constructor() {
    const { accessKeyId, endpoint, region, secretAccessKey, bucket } = config.storage.neon;
    if (!accessKeyId || !secretAccessKey || !endpoint || !region) {
      throw new Error("Neon Object Storage requires AWS_ENDPOINT_URL_S3, AWS_REGION, AWS_ACCESS_KEY_ID, and AWS_SECRET_ACCESS_KEY.");
    }

    this.client = new S3Client({
      endpoint,
      region,
      credentials: { accessKeyId, secretAccessKey },
      forcePathStyle: true,
    });
    this.bucket = bucket;
    this.baseUrl = config.storage.baseUrl.replace(/\/$/, "");
  }

  async upload(input: UploadInput, folder: string): Promise<StorageResult> {
    const extension = path.extname(input.originalName);
    const fileId = `${folder}/${uuidv4()}${extension}`;
    await this.client.send(new PutObjectCommand({
      Bucket: this.bucket,
      Key: fileId,
      Body: input.buffer,
      ContentType: input.mimeType,
    }));

    const url = this.getUrl(fileId);
    const isImage = input.mimeType.startsWith("image/");
    return { fileId, url, thumbnailUrl: isImage ? url : null };
  }

  async delete(fileId: string): Promise<void> {
    await this.client.send(new DeleteObjectCommand({ Bucket: this.bucket, Key: fileId }));
  }

  async download(fileId: string): Promise<{ buffer: Buffer; contentType: string } | null> {
    try {
      const result = await this.client.send(new GetObjectCommand({ Bucket: this.bucket, Key: fileId }));
      if (!result.Body) return null;
      return {
        buffer: Buffer.from(await result.Body.transformToByteArray()),
        contentType: result.ContentType || "application/octet-stream",
      };
    } catch (error) {
      if ((error as { $metadata?: { httpStatusCode?: number } }).$metadata?.httpStatusCode === 404) {
        return null;
      }
      throw error;
    }
  }

  getUrl(fileId: string): string {
    return `${this.baseUrl}/api/files/serve/${encodeURIComponent(fileId)}`;
  }
}