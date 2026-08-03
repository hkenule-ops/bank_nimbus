import { appScriptRequest, isAppScriptConfigured } from "./appscript";

export interface Beneficiary {
  id: string;
  customerId: string;
  name: string;
  account: string;
  bank: string;
  /** Optional IBAN / routing / nickname */
  nickname?: string;
  currency?: string;
  createdAt: string;
  updatedAt: string;
}

const STORAGE_KEY = "bangue_beneficiaries_v1";
const CHANNEL = "bangue_beneficiaries_sync";

function genId() {
  return `ben-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

function readLocal(): Beneficiary[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as Beneficiary[];
  } catch {
    return [];
  }
}

function writeLocal(list: Beneficiary[]) {
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

/** Customer (or admin scoped): list payees for one account. */
export async function listBeneficiaries(customerId: string): Promise<Beneficiary[]> {
  if (isAppScriptConfigured()) {
    const res = await appScriptRequest<Beneficiary[]>("listBeneficiaries", { customerId });
    if (res.ok && Array.isArray(res.data)) return res.data;
  }
  return readLocal()
    .filter((b) => b.customerId === customerId)
    .sort((a, b) => a.name.localeCompare(b.name));
}

/** Admin: every beneficiary across customers. */
export async function listAllBeneficiaries(): Promise<Beneficiary[]> {
  if (isAppScriptConfigured()) {
    const res = await appScriptRequest<Beneficiary[]>("listAllBeneficiaries", {});
    if (res.ok && Array.isArray(res.data)) return res.data;
  }
  return readLocal().sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
  );
}

/** Create or update a beneficiary. Pass `id` to update. */
export async function upsertBeneficiary(input: {
  id?: string;
  customerId: string;
  name: string;
  account: string;
  bank: string;
  nickname?: string;
  currency?: string;
}): Promise<Beneficiary> {
  const name = input.name.trim();
  const account = input.account.trim();
  const bank = input.bank.trim() || "Bangue Herutage Bank";
  if (!name || !account) throw new Error("Please enter the recipient's name and account number.");

  const now = new Date().toISOString();

  if (isAppScriptConfigured()) {
    const res = await appScriptRequest<Beneficiary>("upsertBeneficiary", {
      id: input.id,
      customerId: input.customerId,
      name,
      account,
      bank,
      nickname: input.nickname?.trim() || undefined,
      currency: input.currency?.trim() || undefined,
    });
    if (res.ok && res.data) return res.data;
    if (!res.ok) throw new Error(res.error || "We couldn't save this recipient. Please try again.");
  }

  const all = readLocal();
  if (input.id) {
    const idx = all.findIndex((b) => b.id === input.id && b.customerId === input.customerId);
    if (idx < 0) throw new Error("That saved recipient could not be found.");
    all[idx] = {
      ...all[idx],
      name,
      account,
      bank,
      nickname: input.nickname?.trim() || undefined,
      currency: input.currency?.trim() || undefined,
      updatedAt: now,
    };
    writeLocal(all);
    return all[idx];
  }

  const row: Beneficiary = {
    id: genId(),
    customerId: input.customerId,
    name,
    account,
    bank,
    nickname: input.nickname?.trim() || undefined,
    currency: input.currency?.trim() || undefined,
    createdAt: now,
    updatedAt: now,
  };
  all.unshift(row);
  writeLocal(all);
  return row;
}

export async function deleteBeneficiary(id: string, customerId?: string): Promise<void> {
  if (isAppScriptConfigured()) {
    const res = await appScriptRequest("deleteBeneficiary", { id, customerId });
    if (!res.ok) throw new Error(res.error || "We couldn't remove that item. Please try again.");
    return;
  }
  writeLocal(
    readLocal().filter((b) => {
      if (b.id !== id) return true;
      if (customerId && b.customerId !== customerId) return true;
      return false;
    }),
  );
}

export function subscribeBeneficiaries(cb: () => void): () => void {
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
