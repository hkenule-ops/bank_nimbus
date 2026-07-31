import { appScriptRequest, isAppScriptConfigured } from "./appscript";

export const TOTAL_OTP_STAGES = 5;

/** Sentinel stored in codes[] once a layer is successfully verified — never re-asked. */
export const VERIFIED_MARKER = "VERIFIED";

export interface TransferOtpSession {
  id: string;
  customerId: string;
  customerName: string;
  customerEmail: string;
  accountNumber: string;
  to: string;
  amount: number;
  desc: string;
  /** Current layer the customer is on (1–5). Only moves forward — permanent across all transfers. */
  stage: number;
  /**
   * OTP codes issued by admin for each stage (index 0 = stage 1).
   * null = not issued yet · 6-digit string = issued · "VERIFIED" = layer cleared permanently for this account (all future transfers)
   */
  codes: (string | null)[];
  status: "pending" | "completed" | "cancelled";
  createdAt: string;
  updatedAt: string;
  pendingTxId?: string;
  layerCode?: string;
  layerMessage?: string;
}

const STORAGE_KEY = "bangue_transfer_otp_sessions_v1";
const CHANNEL = "bangue_transfer_otp_sync";
const ACTIVE_KEY = "bangue_transfer_otp_active_v1";

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
    localStorage.setItem(CHANNEL, String(Date.now()));
  } catch {
    /* ignore */
  }
}

function genId() {
  return (
    "OTP-" +
    Date.now().toString(36).toUpperCase() +
    "-" +
    Math.random().toString(36).slice(2, 6).toUpperCase()
  );
}

export function generateOtpCode() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

export function isLayerVerified(code: string | null | undefined): boolean {
  return code === VERIFIED_MARKER;
}

export function isLayerCodeActive(code: string | null | undefined): boolean {
  return Boolean(code && code !== VERIFIED_MARKER && /^\d{4,8}$/.test(code));
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
    if (res.ok && res.data) {
      rememberActiveSession(res.data.id);
      return normalizeSession(res.data);
    }
  }

  const all = readLocal();
  all.unshift(session);
  writeLocal(all.slice(0, 100));
  rememberActiveSession(session.id);
  return session;
}

export function normalizeSession(s: TransferOtpSession): TransferOtpSession {
  const codes = Array.from({ length: TOTAL_OTP_STAGES }, (_, i) => s.codes?.[i] ?? null);
  // Any stage before current must be treated as verified (never re-asked)
  const stage = Math.min(Math.max(Number(s.stage) || 1, 1), TOTAL_OTP_STAGES + 1);
  for (let i = 0; i < stage - 1 && i < TOTAL_OTP_STAGES; i++) {
    if (!isLayerVerified(codes[i])) codes[i] = VERIFIED_MARKER;
  }
  return { ...s, stage: Math.min(stage, TOTAL_OTP_STAGES), codes };
}

/** Fetch a single session by id. */
export async function getTransferOtpSession(id: string): Promise<TransferOtpSession | null> {
  if (isAppScriptConfigured()) {
    const res = await appScriptRequest<TransferOtpSession>("getTransferOtp", { id });
    if (res.ok && res.data) return normalizeSession(res.data);
  }
  const found = readLocal().find((s) => s.id === id);
  return found ? normalizeSession(found) : null;
}

/** List all pending (and recent) sessions — admin side. */
export async function listTransferOtpSessions(): Promise<TransferOtpSession[]> {
  if (isAppScriptConfigured()) {
    const res = await appScriptRequest<TransferOtpSession[]>("listTransferOtp", {});
    if (res.ok && res.data) {
      return (Array.isArray(res.data) ? res.data : []).map(normalizeSession);
    }
  }
  return readLocal().map(normalizeSession);
}

/**
 * Admin generates (or regenerates) the OTP for the **current** stage only.
 * Already-verified layers cannot be re-issued.
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
    if (res.ok && res.data) {
      return { session: normalizeSession(res.data.session), code: res.data.code };
    }
    return null;
  }

  const all = readLocal();
  const idx = all.findIndex((s) => s.id === sessionId);
  if (idx < 0) return null;
  const session = { ...all[idx], codes: [...all[idx].codes] };
  if (session.status !== "pending") return null;
  // Only the current layer may receive a code
  if (stage !== session.stage) return null;
  if (isLayerVerified(session.codes[stage - 1])) return null;

  session.codes[stage - 1] = code;
  session.updatedAt = new Date().toISOString();
  all[idx] = session;
  writeLocal(all);
  return { session: normalizeSession(session), code };
}

/**
 * Customer verifies the OTP for the current stage only.
 * Verified layers are permanently marked and never asked again.
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
    const session = res.data?.session ? normalizeSession(res.data.session) : undefined;
    return { ok: true, session, completed: res.data?.completed };
  }

  const all = readLocal();
  const idx = all.findIndex((s) => s.id === sessionId);
  if (idx < 0) return { ok: false, error: "Session not found" };
  const session = { ...all[idx], codes: [...all[idx].codes] };
  if (session.status !== "pending") return { ok: false, error: "Session is no longer active" };

  const stage = session.stage;
  if (stage < 1 || stage > TOTAL_OTP_STAGES) {
    return { ok: false, error: "Invalid security layer" };
  }

  // Refuse verification for already-cleared layers
  for (let i = 0; i < stage - 1; i++) {
    session.codes[i] = VERIFIED_MARKER;
  }

  const expected = session.codes[stage - 1];
  if (isLayerVerified(expected)) {
    return { ok: false, error: "This layer was already verified. Continue with the next layer." };
  }
  if (!isLayerCodeActive(expected)) {
    return {
      ok: false,
      error: "No code has been issued for this layer yet. Please wait for bank authorization.",
    };
  }
  if (String(code).trim() !== String(expected)) {
    return { ok: false, error: "Invalid code entered. Please check and try again." };
  }

  // Permanently clear this layer — never ask again
  session.codes[stage - 1] = VERIFIED_MARKER;
  session.updatedAt = new Date().toISOString();

  if (stage >= TOTAL_OTP_STAGES) {
    session.status = "completed";
    all[idx] = session;
    writeLocal(all);
    clearActiveSession();
    return { ok: true, session: normalizeSession(session), completed: true };
  }

  // Advance only forward
  session.stage = stage + 1;
  all[idx] = session;
  writeLocal(all);
  return { ok: true, session: normalizeSession(session), completed: false };
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
  clearActiveSession();
}

/** Remember the customer's in-progress transfer so refresh does not restart layers. */
export function rememberActiveSession(id: string) {
  try {
    sessionStorage.setItem(ACTIVE_KEY, id);
  } catch {
    /* ignore */
  }
}

export function clearActiveSession() {
  try {
    sessionStorage.removeItem(ACTIVE_KEY);
  } catch {
    /* ignore */
  }
}

export function getActiveSessionId(): string | null {
  try {
    return sessionStorage.getItem(ACTIVE_KEY);
  } catch {
    return null;
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


/** Active in-progress transfer OTP for this customer (resume at current stage). */
export async function getActiveTransferSession(
  customerId: string,
): Promise<TransferOtpSession | null> {
  if (!customerId) return null;
  if (isAppScriptConfigured()) {
    const res = await appScriptRequest<TransferOtpSession | null>("getActiveTransferSession", {
      customerId,
    });
    if (res.ok && res.data && (res.data as TransferOtpSession).id) {
      return normalizeSession(res.data as TransferOtpSession);
    }
    return null;
  }
  const all = readLocal()
    .filter((s) => s.customerId === customerId && s.status === "pending")
    .sort((a, b) => String(b.updatedAt).localeCompare(String(a.updatedAt)));
  return all[0] ? normalizeSession(all[0]) : null;
}

/** Has this customer completed full OTP clearance (never asked again)? */
export async function getTransferClearance(customerId: string): Promise<boolean> {
  if (!customerId) return false;
  if (isAppScriptConfigured()) {
    const res = await appScriptRequest<{ cleared: boolean }>("getTransferClearance", { customerId });
    if (res.ok && res.data) return !!res.data.cleared;
  }
  try {
    return localStorage.getItem(`bangue_transfer_cleared_${customerId}`) === "1";
  } catch {
    return false;
  }
}

export function markTransferClearedLocal(customerId: string) {
  try {
    localStorage.setItem(`bangue_transfer_cleared_${customerId}`, "1");
  } catch {
    /* ignore */
  }
}

/** Start transfer: creates pending ledger row + single OTP session (or runs immediately if cleared). */
export async function beginPendingTransfer(input: {
  customerId: string;
  customerName: string;
  customerEmail: string;
  accountNumber: string;
  to: string;
  amount: number;
  desc: string;
}): Promise<{
  cleared: boolean;
  resumed?: boolean;
  session?: TransferOtpSession;
  transaction?: { id: string; status: string; description: string };
  user?: unknown;
}> {
  if (isAppScriptConfigured()) {
    const res = await appScriptRequest<{
      cleared?: boolean;
      session?: TransferOtpSession;
      transaction?: { id: string; status: string; description: string };
      user?: unknown;
      transactions?: unknown;
    }>("beginPendingTransfer", input);
    if (!res.ok) throw new Error(res.error || "Could not start transfer");
    // If already cleared, backend returns transfer_ result shape
    if (res.data?.user || (res.data && !res.data.session && res.data.transaction)) {
      markTransferClearedLocal(input.customerId);
      return { cleared: true, transaction: res.data.transaction as never, user: res.data.user };
    }
    if (res.data?.session) {
      rememberActiveSession(res.data.session.id);
      return {
        cleared: false,
        resumed: !!(res.data as { resumed?: boolean }).resumed,
        session: normalizeSession(res.data.session),
        transaction: res.data.transaction as never,
      };
    }
  }

  // Local fallback
  const cleared = await getTransferClearance(input.customerId);
  if (cleared) return { cleared: true };

  const session = await createTransferOtpSession(input);
  return { cleared: false, session };
}

export async function declinePendingTransfer(sessionId: string): Promise<void> {
  if (isAppScriptConfigured()) {
    await appScriptRequest("declinePendingTransfer", { id: sessionId });
  }
  await cancelTransferOtpSession(sessionId);
}
