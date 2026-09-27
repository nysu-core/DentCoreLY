import { config } from "../../config/env";
import { StorageProvider } from "./provider.interface";
import { LocalStorageProvider } from "./local.provider";
import { ImageKitStorageProvider } from "./imagekit.provider";
import { logger } from "../../config/logger";

// Lazily-initialised singleton — avoids constructing the ImageKit client
// before env vars are loaded when the module is first imported.
let _provider: StorageProvider | null = null;

export function getStorageProvider(): StorageProvider {
  if (!_provider) {
    switch (config.storage.provider) {
      case "imagekit":
        _provider = new ImageKitStorageProvider();
        break;
      case "local":
      default:
        _provider = new LocalStorageProvider();
        break;
    }
    logger.info(`Storage provider: ${_provider.name}`);
  }
  return _provider;
}

// Re-export the interface so callers don't need to import from the interface file
export type { StorageProvider, StorageResult, UploadInput } from "./provider.interface";
