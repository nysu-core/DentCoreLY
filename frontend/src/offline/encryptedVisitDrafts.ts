export interface VisitDraftPayload {
  visitDate: string;
  appointmentId?: string;
  treatmentPlan?: string;
  notes?: string;
}

interface EncryptedVisitDraft {
  id: string;
  userId: string;
  patientId: string;
  savedAt: string;
  salt: string;
  iv: string;
  ciphertext: string;
}

const DATABASE_NAME = "dentcorely-offline";
const STORE_NAME = "encrypted-visit-drafts";
const ITERATIONS = 310_000;

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DATABASE_NAME, 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) db.createObjectStore(STORE_NAME, { keyPath: "id" });
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function toBase64(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

function fromBase64(value: string): Uint8Array<ArrayBuffer> {
  const binary = atob(value);
  const bytes = new Uint8Array(new ArrayBuffer(binary.length));
  for (let index = 0; index < binary.length; index++) bytes[index] = binary.charCodeAt(index);
  return bytes;
}

async function deriveKey(passphrase: string, salt: Uint8Array<ArrayBuffer>): Promise<CryptoKey> {
  if (passphrase.length < 12) throw new Error("Use an offline passphrase with at least 12 characters.");
  const material = await crypto.subtle.importKey("raw", new TextEncoder().encode(passphrase), "PBKDF2", false, ["deriveKey"]);
  return crypto.subtle.deriveKey(
    { name: "PBKDF2", salt, iterations: ITERATIONS, hash: "SHA-256" },
    material,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  );
}

export async function saveEncryptedVisitDraft(
  userId: string,
  patientId: string,
  payload: VisitDraftPayload,
  passphrase: string
): Promise<void> {
  const salt = crypto.getRandomValues(new Uint8Array(new ArrayBuffer(16)));
  const iv = crypto.getRandomValues(new Uint8Array(new ArrayBuffer(12)));
  const key = await deriveKey(passphrase, salt);
  const ciphertext = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    new TextEncoder().encode(JSON.stringify(payload))
  );
  const draft: EncryptedVisitDraft = {
    id: crypto.randomUUID(),
    userId,
    patientId,
    savedAt: new Date().toISOString(),
    salt: toBase64(salt),
    iv: toBase64(iv),
    ciphertext: toBase64(new Uint8Array(ciphertext)),
  };

  const db = await openDatabase();
  await new Promise<void>((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, "readwrite");
    transaction.objectStore(STORE_NAME).put(draft);
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
    transaction.onabort = () => reject(transaction.error);
  });
  db.close();
}

export async function listEncryptedVisitDrafts(userId: string, patientId: string): Promise<Array<Pick<EncryptedVisitDraft, "id" | "savedAt">>> {
  const db = await openDatabase();
  const drafts = await new Promise<EncryptedVisitDraft[]>((resolve, reject) => {
    const request = db.transaction(STORE_NAME, "readonly").objectStore(STORE_NAME).getAll();
    request.onsuccess = () => resolve(request.result as EncryptedVisitDraft[]);
    request.onerror = () => reject(request.error);
  });
  db.close();
  return drafts.filter((draft) => draft.userId === userId && draft.patientId === patientId)
    .map(({ id, savedAt }) => ({ id, savedAt }));
}

export async function decryptVisitDraft(
  userId: string,
  patientId: string,
  id: string,
  passphrase: string
): Promise<VisitDraftPayload> {
  const db = await openDatabase();
  const draft = await new Promise<EncryptedVisitDraft | undefined>((resolve, reject) => {
    const request = db.transaction(STORE_NAME, "readonly").objectStore(STORE_NAME).get(id);
    request.onsuccess = () => resolve(request.result as EncryptedVisitDraft | undefined);
    request.onerror = () => reject(request.error);
  });
  db.close();
  if (!draft || draft.userId !== userId || draft.patientId !== patientId) throw new Error("Offline draft not found.");

  const key = await deriveKey(passphrase, fromBase64(draft.salt));
  const plaintext = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: fromBase64(draft.iv) },
    key,
    fromBase64(draft.ciphertext)
  );
  return JSON.parse(new TextDecoder().decode(plaintext)) as VisitDraftPayload;
}

export async function deleteEncryptedVisitDraft(id: string): Promise<void> {
  const db = await openDatabase();
  await new Promise<void>((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, "readwrite");
    transaction.objectStore(STORE_NAME).delete(id);
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
    transaction.onabort = () => reject(transaction.error);
  });
  db.close();
}
