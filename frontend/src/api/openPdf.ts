import { api } from "./client";

export async function openProtectedPdf(path: string, filename: string): Promise<void> {
  const previewWindow = window.open("", "_blank");
  let objectUrl: string | undefined;

  try {
    const { data } = await api.get<Blob>(path, { responseType: "blob" });
    objectUrl = URL.createObjectURL(new Blob([data], { type: "application/pdf" }));

    if (previewWindow) {
      previewWindow.location.href = objectUrl;
    } else {
      const downloadLink = document.createElement("a");
      downloadLink.href = objectUrl;
      downloadLink.download = filename;
      downloadLink.click();
    }

    window.setTimeout(() => URL.revokeObjectURL(objectUrl!), 60_000);
  } catch (error) {
    previewWindow?.close();
    if (objectUrl) URL.revokeObjectURL(objectUrl);
    throw error;
  }
}