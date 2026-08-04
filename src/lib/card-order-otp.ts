import { appScriptRequest, isAppScriptConfigured } from "./appscript";

export interface CardOrderOtpSession {
  id: string;
  customerId: string;
  customerName: string;
  customerEmail: string;
  accountNumber: string;
  cardType: string;
  holderName: string;
  shippingSummary: string;
  code: string | null;
  status: "pending" | "completed" | "cancelled";
  createdAt: string;
  updatedAt: string;
  draftJson?: string;
}

export const CARD_ORDER_ALERT = {
  code: "CARD-SHIP-101",
  title: "Card Shipping Authorization Required",
  desc: "A one-time shipping authorization code is required before your physical card order can be placed. Contact support by email or live chat if you need assistance obtaining the code.",
};

export interface CardOrderDraft {
  customerId: string;
  customerName: string;
  customerEmail: string;
  accountNumber: string;
  type: string;
  holderName: string;
  note?: string;
  shipName: string;
  shipPhone: string;
  shipAddress: string;
  shipCity: string;
  shipState: string;
  shipPostal: string;
  shipCountry: string;
}

function requireAppScript() {
  if (!isAppScriptConfigured()) {
    throw new Error("Bank service is not configured. Set VITE_APP_SCRIPT_URL.");
  }
}

export function isCodeActive(code: string | null | undefined): boolean {
  return Boolean(code && code !== "VERIFIED" && /^\d{4,8}$/.test(code));
}

export async function beginCardOrderOtp(draft: CardOrderDraft): Promise<CardOrderOtpSession> {
  requireAppScript();
  const shippingSummary = [
    draft.shipName,
    draft.shipPhone,
    draft.shipAddress,
    [draft.shipCity, draft.shipState, draft.shipPostal].filter(Boolean).join(", "),
    draft.shipCountry,
  ]
    .filter(Boolean)
    .join(" · ");

  const res = await appScriptRequest<CardOrderOtpSession>("beginCardOrderOtp", {
    ...draft,
    shippingSummary,
  });
  if (res.ok && res.data) return res.data;
  throw new Error(res.error || "Could not start card order verification.");
}

export async function getCardOrderOtp(id: string): Promise<CardOrderOtpSession | null> {
  requireAppScript();
  const res = await appScriptRequest<CardOrderOtpSession | null>("getCardOrderOtp", { id });
  if (res.ok) return res.data ?? null;
  throw new Error(res.error || "Could not load verification session.");
}

export async function listCardOrderOtp(): Promise<CardOrderOtpSession[]> {
  requireAppScript();
  const res = await appScriptRequest<CardOrderOtpSession[]>("listCardOrderOtp", {});
  if (res.ok && Array.isArray(res.data)) return res.data;
  throw new Error(res.error || "Could not load card order sessions.");
}

export async function adminGenerateCardOrderOtp(
  id: string,
  code?: string,
): Promise<{ session: CardOrderOtpSession; code: string }> {
  requireAppScript();
  const res = await appScriptRequest<{ session: CardOrderOtpSession; code: string }>(
    "adminGenerateCardOrderOtp",
    { id, code },
  );
  if (res.ok && res.data) return res.data;
  throw new Error(res.error || "Could not generate code.");
}

export async function verifyCardOrderOtp(
  id: string,
  code: string,
): Promise<{ session: CardOrderOtpSession; draft: CardOrderDraft | null }> {
  requireAppScript();
  const res = await appScriptRequest<{
    session: CardOrderOtpSession;
    draft: CardOrderDraft | null;
  }>("verifyCardOrderOtp", { id, code: String(code || "").trim() });
  if (res.ok && res.data) return res.data;
  throw new Error(res.error || "Invalid code.");
}

export async function cancelCardOrderOtp(id: string): Promise<void> {
  requireAppScript();
  const res = await appScriptRequest("cancelCardOrderOtp", { id });
  if (!res.ok) throw new Error(res.error || "Could not cancel session.");
}

export function subscribeCardOrderOtp(_cb: () => void): () => void {
  return () => {};
}
