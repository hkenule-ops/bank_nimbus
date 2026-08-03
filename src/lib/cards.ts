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
  /** Display last 4 digits — assigned on approval */
  last4: string;
  expiry: string;
  holderName: string;
  status: CardStatus;
  /** Customer reason / note on request */
  note?: string;
  /** Admin rejection or review note */
  adminNote?: string;
  createdAt: string;
  updatedAt: string;
  approvedAt?: string;
}

const STORAGE_KEY = "bangue_cards_v1";
const CHANNEL = "bangue_cards_sync";

function genId() {
  return `card-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

function readLocal(): BankCard[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as BankCard[];
  } catch {
    return [];
  }
}

function writeLocal(list: BankCard[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
    try {
      new BroadcastChannel(CHANNEL).postMessage({ t: Date.now() });
    } catch {
      /* ignore */
    }
  } catch {
    /* ignore */
  }
}

function defaultExpiry(): string {
  const d = new Date();
  d.setFullYear(d.getFullYear() + 4);
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yy = String(d.getFullYear() % 100).padStart(2, "0");
  return `${mm}/${yy}`;
}

function randomLast4(): string {
  return String(Math.floor(1000 + Math.random() * 9000));
}

/** Customer: list own cards (issued + pending + rejected). */
export async function listMyCards(customerId: string): Promise<BankCard[]> {
  if (isAppScriptConfigured()) {
    const res = await appScriptRequest<BankCard[]>("listMyCards", { customerId });
    if (res.ok && Array.isArray(res.data)) return res.data;
  }
  return readLocal()
    .filter((c) => c.customerId === customerId)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

/** Admin: list every card / request. */
export async function listAllCards(): Promise<BankCard[]> {
  if (isAppScriptConfigured()) {
    const res = await appScriptRequest<BankCard[]>("listAllCards", {});
    if (res.ok && Array.isArray(res.data)) return res.data;
  }
  return readLocal().sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );
}

/** Customer submits a card request — stays Pending until admin approves. */
export async function requestCard(input: {
  customerId: string;
  customerName: string;
  customerEmail: string;
  accountNumber: string;
  type: CardType;
  holderName: string;
  note?: string;
}): Promise<BankCard> {
  const now = new Date().toISOString();
  const card: BankCard = {
    id: genId(),
    customerId: input.customerId,
    customerName: input.customerName,
    customerEmail: input.customerEmail,
    accountNumber: input.accountNumber,
    type: input.type,
    last4: "····",
    expiry: "—",
    holderName: input.holderName,
    status: "Pending",
    note: input.note?.trim() || undefined,
    createdAt: now,
    updatedAt: now,
  };

  if (isAppScriptConfigured()) {
    const res = await appScriptRequest<BankCard>("requestCard", { ...card });
    if (res.ok && res.data) return res.data;
    if (!res.ok) throw new Error(res.error || "We couldn't submit your card request. Please try again.");
  }

  const all = readLocal();
  all.unshift(card);
  writeLocal(all);
  return card;
}

/** Customer freezes / unfreezes an issued card. */
export async function setCardFrozen(cardId: string, frozen: boolean): Promise<BankCard> {
  if (isAppScriptConfigured()) {
    const res = await appScriptRequest<BankCard>("setCardFrozen", {
      id: cardId,
      frozen,
    });
    if (res.ok && res.data) return res.data;
    if (!res.ok) throw new Error(res.error || "We couldn't update this card. Please try again.");
  }

  const all = readLocal();
  const idx = all.findIndex((c) => c.id === cardId);
  if (idx < 0) throw new Error("We couldn't find that card.");
  if (all[idx].status !== "Active" && all[idx].status !== "Frozen") {
    throw new Error("This card isn't active yet, so it can't be frozen or unfrozen.");
  }
  all[idx] = {
    ...all[idx],
    status: frozen ? "Frozen" : "Active",
    updatedAt: new Date().toISOString(),
  };
  writeLocal(all);
  return all[idx];
}

/** Admin approves or rejects a pending request. Approve issues last4 + expiry. */
export async function reviewCardRequest(
  cardId: string,
  decision: "approve" | "reject",
  opts?: { adminNote?: string; last4?: string; expiry?: string },
): Promise<BankCard> {
  if (isAppScriptConfigured()) {
    const res = await appScriptRequest<BankCard>("reviewCardRequest", {
      id: cardId,
      decision,
      adminNote: opts?.adminNote,
      last4: opts?.last4,
      expiry: opts?.expiry,
    });
    if (res.ok && res.data) return res.data;
    if (!res.ok) throw new Error(res.error || "We couldn't process this card request. Please try again.");
  }

  const all = readLocal();
  const idx = all.findIndex((c) => c.id === cardId);
  if (idx < 0) throw new Error("We couldn't find that card request.");
  if (all[idx].status !== "Pending") throw new Error("This request has already been reviewed.");

  const now = new Date().toISOString();
  if (decision === "reject") {
    all[idx] = {
      ...all[idx],
      status: "Rejected",
      adminNote: opts?.adminNote,
      updatedAt: now,
    };
  } else {
    all[idx] = {
      ...all[idx],
      status: "Active",
      last4: opts?.last4?.replace(/\D/g, "").slice(-4) || randomLast4(),
      expiry: opts?.expiry || defaultExpiry(),
      adminNote: opts?.adminNote,
      approvedAt: now,
      updatedAt: now,
    };
  }
  writeLocal(all);
  return all[idx];
}

/** Admin creates / issues a card directly (no pending step). */
export async function adminIssueCard(input: {
  customerId: string;
  customerName: string;
  customerEmail: string;
  accountNumber: string;
  type: CardType;
  holderName: string;
  last4?: string;
  expiry?: string;
}): Promise<BankCard> {
  const now = new Date().toISOString();
  const card: BankCard = {
    id: genId(),
    customerId: input.customerId,
    customerName: input.customerName,
    customerEmail: input.customerEmail,
    accountNumber: input.accountNumber,
    type: input.type,
    last4: input.last4?.replace(/\D/g, "").slice(-4) || randomLast4(),
    expiry: input.expiry || defaultExpiry(),
    holderName: input.holderName,
    status: "Active",
    createdAt: now,
    updatedAt: now,
    approvedAt: now,
  };

  if (isAppScriptConfigured()) {
    const res = await appScriptRequest<BankCard>("adminIssueCard", { ...card });
    if (res.ok && res.data) return res.data;
    if (!res.ok) throw new Error(res.error || "We couldn't issue this card. Please try again.");
  }

  const all = readLocal();
  all.unshift(card);
  writeLocal(all);
  return card;
}

/** Admin updates card fields (type, last4, expiry, status, holder). */
export async function updateCard(
  cardId: string,
  patch: Partial<
    Pick<BankCard, "type" | "last4" | "expiry" | "holderName" | "status" | "adminNote">
  >,
): Promise<BankCard> {
  if (isAppScriptConfigured()) {
    const res = await appScriptRequest<BankCard>("updateCard", { id: cardId, ...patch });
    if (res.ok && res.data) return res.data;
    if (!res.ok) throw new Error(res.error || "We couldn't save those changes. Please try again.");
  }

  const all = readLocal();
  const idx = all.findIndex((c) => c.id === cardId);
  if (idx < 0) throw new Error("We couldn't find that card.");
  all[idx] = {
    ...all[idx],
    ...patch,
    last4: patch.last4 !== undefined ? patch.last4.replace(/\D/g, "").slice(-4) : all[idx].last4,
    updatedAt: new Date().toISOString(),
  };
  writeLocal(all);
  return all[idx];
}

export async function deleteCard(cardId: string): Promise<void> {
  if (isAppScriptConfigured()) {
    const res = await appScriptRequest("deleteCard", { id: cardId });
    if (!res.ok) throw new Error(res.error || "We couldn't remove that item. Please try again.");
    return;
  }
  writeLocal(readLocal().filter((c) => c.id !== cardId));
}

export function subscribeCards(cb: () => void): () => void {
  let ch: BroadcastChannel | null = null;
  try {
    ch = new BroadcastChannel(CHANNEL);
    ch.onmessage = () => cb();
  } catch {
    /* ignore */
  }
  const onStorage = (e: StorageEvent) => {
    if (e.key === STORAGE_KEY) cb();
  };
  window.addEventListener("storage", onStorage);
  return () => {
    window.removeEventListener("storage", onStorage);
    try {
      ch?.close();
    } catch {
      /* ignore */
    }
  };
}
