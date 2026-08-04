import { appScriptRequest, isAppScriptConfigured } from "./appscript";

export type CardType = "Debit" | "Virtual" | "Credit";
export type CardStatus = "Pending" | "Active" | "Frozen" | "Rejected" | "Cancelled";

export interface BankCard {
  id: string;
  customerId: string;
  customerName: string;
  customerEmail: string;
  accountNumber: string;
  type: CardType;
  last4: string;
  expiry: string;
  holderName: string;
  status: CardStatus;
  note?: string;
  adminNote?: string;
  createdAt: string;
  updatedAt: string;
  approvedAt?: string;
  shipName?: string;
  shipPhone?: string;
  shipAddress?: string;
  shipCity?: string;
  shipState?: string;
  shipPostal?: string;
  shipCountry?: string;
}

function requireAppScript() {
  if (!isAppScriptConfigured()) {
    throw new Error("Bank service is not configured. Set VITE_APP_SCRIPT_URL.");
  }
}

export async function listMyCards(customerId: string): Promise<BankCard[]> {
  requireAppScript();
  const res = await appScriptRequest<BankCard[]>("listMyCards", { customerId });
  if (res.ok && Array.isArray(res.data)) return res.data;
  throw new Error(res.error || "We couldn't load your cards. Please try again.");
}

export async function listAllCards(): Promise<BankCard[]> {
  requireAppScript();
  const res = await appScriptRequest<BankCard[]>("listAllCards", {});
  if (res.ok && Array.isArray(res.data)) return res.data;
  throw new Error(res.error || "We couldn't load cards. Please try again.");
}

export async function requestCard(input: {
  customerId: string;
  customerName: string;
  customerEmail: string;
  accountNumber: string;
  type: CardType;
  holderName: string;
  note?: string;
  shipName?: string;
  shipPhone?: string;
  shipAddress?: string;
  shipCity?: string;
  shipState?: string;
  shipPostal?: string;
  shipCountry?: string;
}): Promise<BankCard> {
  requireAppScript();
  const res = await appScriptRequest<BankCard>("requestCard", {
    ...input,
    note: input.note?.trim() || undefined,
    shipName: input.shipName?.trim() || undefined,
    shipPhone: input.shipPhone?.trim() || undefined,
    shipAddress: input.shipAddress?.trim() || undefined,
    shipCity: input.shipCity?.trim() || undefined,
    shipState: input.shipState?.trim() || undefined,
    shipPostal: input.shipPostal?.trim() || undefined,
    shipCountry: input.shipCountry?.trim() || undefined,
  });
  if (res.ok && res.data) return res.data;
  throw new Error(res.error || "We couldn't submit your card request. Please try again.");
}

export async function setCardFrozen(cardId: string, frozen: boolean): Promise<BankCard> {
  requireAppScript();
  const res = await appScriptRequest<BankCard>("setCardFrozen", { id: cardId, frozen });
  if (res.ok && res.data) return res.data;
  throw new Error(res.error || "We couldn't update this card. Please try again.");
}

export async function reviewCardRequest(
  cardId: string,
  decision: "approve" | "reject",
  opts?: { adminNote?: string; last4?: string; expiry?: string },
): Promise<BankCard> {
  requireAppScript();
  const res = await appScriptRequest<BankCard>("reviewCardRequest", {
    id: cardId,
    decision,
    adminNote: opts?.adminNote,
    last4: opts?.last4,
    expiry: opts?.expiry,
  });
  if (res.ok && res.data) return res.data;
  throw new Error(res.error || "We couldn't process this card request. Please try again.");
}

export async function adminIssueCard(input: {
  customerId: string;
  customerName: string;
  customerEmail: string;
  accountNumber: string;
  type: CardType;
  holderName: string;
  last4?: string;
  expiry?: string;
  note?: string;
  adminNote?: string;
}): Promise<BankCard> {
  requireAppScript();
  const res = await appScriptRequest<BankCard>("adminIssueCard", { ...input });
  if (res.ok && res.data) return res.data;
  throw new Error(res.error || "We couldn't issue this card. Please try again.");
}

export async function updateCard(
  cardId: string,
  patch: Partial<
    Pick<BankCard, "type" | "last4" | "expiry" | "holderName" | "status" | "adminNote">
  >,
): Promise<BankCard> {
  requireAppScript();
  const res = await appScriptRequest<BankCard>("updateCard", { id: cardId, ...patch });
  if (res.ok && res.data) return res.data;
  throw new Error(res.error || "We couldn't save those changes. Please try again.");
}

export async function deleteCard(cardId: string): Promise<void> {
  requireAppScript();
  const res = await appScriptRequest("deleteCard", { id: cardId });
  if (!res.ok) throw new Error(res.error || "We couldn't remove that item. Please try again.");
}

export function subscribeCards(_cb: () => void): () => void {
  return () => {};
}
