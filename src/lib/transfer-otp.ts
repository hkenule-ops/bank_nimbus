import { appScriptRequest, isAppScriptConfigured } from "./appscript";

export const TOTAL_OTP_STAGES = 5;

export interface TransferOtpSession {
  id: string;
  customerId: string;
  customerName: string;
  customerEmail: string;
  accountNumber: string;
  to: string;
  amount: number;
  desc: string;
  /** Current layer the customer is on (1–5) */
  stage: number;
  /** OTP codes issued by admin for each stage (index 0 = stage 1). null = not yet issued */
  codes: (string | null)[];
  status: "pending" | "completed" | "cancelled";
  createdAt: string;
  updatedAt: string;
}

const STORAGE_KEY = "bangue_transfer_otp_sessions_v1";
const CHANNEL = "bangue_transfer_otp_sync";

function readLocal(): TransferOtpSession[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as TransferOtpSession[];
  } catch {
    return [];
  }
}

function writeLocal(sessions: TransferOtpSession[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions));
  try {
    // Notify other tabs (customer ↔ admin in same browser profile)
    localStorage.setItem(CHANNEL, String(Date.now()));
  } catch {
    /* ignore */
  }
}

function genId() {
  return "OTP-" + Date.now().toString(36).toUpperCase() + "-" + Math.random().toString(36).slice(2, 6).toUpperCase();
}

export function generateOtpCode() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

/** Create a new multi-layer transfer OTP session (customer side). */
export async function createTransferOtpSession(input: {
  customerId: string;
  customerName: string;
  customerEmail: string;
  accountNumber: string;
  to: string;
  amount: number;
  desc: string;
}): Promise<TransferOtpSession> {
  const session: TransferOtpSession = {
    id: genId(),
    ...input,
    stage: 1,
    codes: Array.from({ length: TOTAL_OTP_STAGES }, () => null),
    status: "pending",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  if (isAppScriptConfigured()) {
    const res = await appScriptRequest<TransferOtpSession>("createTransferOtp", { session });
    if (res.ok && res.data) return res.data;
  }

  const all = readLocal();
  all.unshift(session);
  writeLocal(all.slice(0, 100)); // keep last 100
  return session;
}

/** Fetch a single session by id. */
export async function getTransferOtpSession(id: string): Promise<TransferOtpSession | null> {
  if (isAppScriptConfigured()) {
    const res = await appScriptRequest<TransferOtpSession>("getTransferOtp", { id });
    if (res.ok && res.data) return res.data;
  }
  return readLocal().find((s) => s.id === id) ?? null;
}

/** List all pending (and recent) sessions — admin side. */
export async function listTransferOtpSessions(): Promise<TransferOtpSession[]> {
  if (isAppScriptConfigured()) {
    const res = await appScriptRequest<TransferOtpSession[]>("listTransferOtp", {});
    if (res.ok && res.data) return Array.isArray(res.data) ? res.data : [];
  }
  return readLocal();
}

/**
 * Admin generates (or regenerates) the OTP for a specific stage (1–5).
 * Returns the updated session and the newly issued code.
 */
export async function adminGenerateTransferOtp(
  sessionId: string,
  stage: number,
): Promise<{ session: TransferOtpSession; code: string } | null> {
  const code = generateOtpCode();

  if (isAppScriptConfigured()) {
    const res = await appScriptRequest<{ session: TransferOtpSession; code: string }>(
      "adminGenerateTransferOtp",
      { id: sessionId, stage, code },
    );
    if (res.ok && res.data) return res.data;
  }

  const all = readLocal();
  const idx = all.findIndex((s) => s.id === sessionId);
  if (idx < 0) return null;
  const session = { ...all[idx] };
  if (session.status !== "pending") return null;
  const codes = [...session.codes];
  codes[stage - 1] = code;
  session.codes = codes;
  session.updatedAt = new Date().toISOString();
  all[idx] = session;
  writeLocal(all);
  return { session, code };
}

/**
 * Customer verifies the OTP for the current stage.
 * On success advances stage (or marks completed after final stage).
 */
export async function verifyTransferOtp(
  sessionId: string,
  code: string,
): Promise<{ ok: boolean; session?: TransferOtpSession; error?: string; completed?: boolean }> {
  if (isAppScriptConfigured()) {
    const res = await appScriptRequest<{ session: TransferOtpSession; completed: boolean }>(
      "verifyTransferOtp",
      { id: sessionId, code },
    );
    if (!res.ok) return { ok: false, error: res.error ?? "Verification failed" };
    return { ok: true, session: res.data?.session, completed: res.data?.completed };
  }

  const all = readLocal();
  const idx = all.findIndex((s) => s.id === sessionId);
  if (idx < 0) return { ok: false, error: "Session not found" };
  const session = { ...all[idx] };
  if (session.status !== "pending") return { ok: false, error: "Session is no longer active" };

  const expected = session.codes[session.stage - 1];
  if (!expected) {
    return { ok: false, error: "No code has been issued for this layer yet. Please wait for bank authorization." };
  }
  if (code !== expected) {
    return { ok: false, error: "Invalid code entered. Please check and try again." };
  }

  if (session.stage >= TOTAL_OTP_STAGES) {
    session.status = "completed";
    session.updatedAt = new Date().toISOString();
    all[idx] = session;
    writeLocal(all);
    return { ok: true, session, completed: true };
  }

  session.stage += 1;
  session.updatedAt = new Date().toISOString();
  all[idx] = session;
  writeLocal(all);
  return { ok: true, session, completed: false };
}

export async function cancelTransferOtpSession(sessionId: string): Promise<void> {
  if (isAppScriptConfigured()) {
    await appScriptRequest("cancelTransferOtp", { id: sessionId });
  }
  const all = readLocal();
  const idx = all.findIndex((s) => s.id === sessionId);
  if (idx >= 0) {
    all[idx] = { ...all[idx], status: "cancelled", updatedAt: new Date().toISOString() };
    writeLocal(all);
  }
}

/** Subscribe to cross-tab updates (localStorage). Returns unsubscribe. */
export function subscribeTransferOtp(cb: () => void): () => void {
  const handler = (e: StorageEvent) => {
    if (e.key === STORAGE_KEY || e.key === CHANNEL) cb();
  };
  window.addEventListener("storage", handler);
  return () => window.removeEventListener("storage", handler);
}
