/** Client helpers for sending files to Google Drive via Apps Script. */

export const MAX_UPLOAD_BYTES = 5 * 1024 * 1024; // 5 MB — keep under Apps Script POST limits

export interface UploadFilePayload {
  name: string;
  type: string;
  size: number;
  /** Raw base64 (no data: prefix) or full data URL — GAS accepts both */
  data: string;
}

/**
 * Read a browser File as base64 for Apps Script → Google Drive upload.
 * Rejects files larger than MAX_UPLOAD_BYTES.
 */
export function fileToUploadPayload(file: File): Promise<UploadFilePayload> {
  return new Promise((resolve, reject) => {
    if (!file) {
      reject(new Error("No file selected"));
      return;
    }
    if (file.size > MAX_UPLOAD_BYTES) {
      reject(
        new Error(
          `“${file.name}” is too large (${Math.round(file.size / 1024 / 1024)} MB). Max size is ${MAX_UPLOAD_BYTES / 1024 / 1024} MB.`,
        ),
      );
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result || "");
      // Prefer full data URL so GAS can recover mime type if needed
      resolve({
        name: file.name,
        type: file.type || "application/octet-stream",
        size: file.size,
        data: result,
      });
    };
    reader.onerror = () => reject(new Error(`Could not read “${file.name}”`));
    reader.readAsDataURL(file);
  });
}

/** Lightweight metadata shown in the form before submit (optional preview). */
export interface FileMeta {
  name: string;
  size: number;
  type: string;
}
