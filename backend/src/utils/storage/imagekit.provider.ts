import ImageKit from "imagekit";
import { config } from "../../config/env";
import { StorageProvider, UploadInput, StorageResult } from "./provider.interface";
import { logger } from "../../config/logger";

export class ImageKitStorageProvider implements StorageProvider {
  readonly name = "imagekit";
  private readonly ik: ImageKit;
  private readonly urlEndpoint: string;

  constructor() {
    const { publicKey, privateKey, urlEndpoint } = config.storage.imagekit;
    if (!publicKey || !privateKey || !urlEndpoint) {
      throw new Error(
        "ImageKit configuration is incomplete. Set IMAGEKIT_PUBLIC_KEY, IMAGEKIT_PRIVATE_KEY, and IMAGEKIT_URL_ENDPOINT in your .env file."
      );
    }
    this.urlEndpoint = urlEndpoint.replace(/\/$/, "");
    this.ik = new ImageKit({ publicKey, privateKey, urlEndpoint });
  }

  async upload(input: UploadInput, folder: string): Promise<StorageResult> {
    const result = await this.ik.upload({
      file: input.buffer,
      fileName: input.originalName,
      folder: `/orthocore/${folder}`,
      useUniqueFileName: true,
      // Ask ImageKit to also create a named transformation for thumbnails
      // (only applies to images — non-image files return no thumbnail)
    });

    logger.debug(`ImageKit: uploaded ${result.fileId} to folder ${folder}`);

    // Build a thumbnail URL using ImageKit's URL transformation chain
    const isImage = result.fileType === "image";
    const thumbnailUrl = isImage
      ? this.ik.url({
          path: result.filePath,
          transformation: [{ height: "200", width: "200", cropMode: "pad_resize" }],
        })
      : null;

    return {
      fileId: result.fileId,
      url: result.url,
      thumbnailUrl,
    };
  }

  async delete(fileId: string): Promise<void> {
    await this.ik.deleteFile(fileId);
    logger.debug(`ImageKit: deleted ${fileId}`);
  }

  getUrl(fileId: string): string {
    // fileId for ImageKit is the file path, not the ID — we store the full URL at upload time
    // so this is a fallback that reconstructs the URL from the endpoint + fileId if needed
    return `${this.urlEndpoint}/${fileId}`;
  }
}
