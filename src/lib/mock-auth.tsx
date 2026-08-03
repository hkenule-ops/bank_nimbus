import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { appScriptRequest, isAppScriptConfigured } from "./appscript";
import { useBackgroundRefresh } from "@/hooks/use-background-refresh";

export type Role = "customer" | "admin";

export interface Customer {
  customerId: string;
  accountNumber: string;
  iban: string;
  firstName: string;
  lastName: string;
  username: string;
  email: string;
  phone: string;
  accountType: string;
  balance: number;
  status: "Pending Verification" | "Active" | "Suspended";
  registrationDate: string;
  role: Role;
  middleName?: string;
  altPhone?: string;
  dob?: string;
  gender?: string;
  nationality?: string;
  maritalStatus?: string;
  occupation?: string;
  employer?: string;
  income?: string;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  zip?: string;
  residesInSwitzerland?: string;
  nationalId?: string;
  ssn?: string;
  passport?: string;
  license?: string;
  tin?: string;
  taxResidenceCountry?: string;
  sourceOfFunds?: string;
  sourceOfFundsOther?: string;
  purposeOfAccount?: string;
  expectedActivity?: string;
  isUsPerson?: string;
  beneficialOwner?: boolean;
  selfieConsent?: boolean;
  kinName?: string;
  kinRelation?: string;
  kinPhone?: string;
  kinEmail?: string;
  kinAddress?: string;
  password?: string;
  securityQuestion?: string;
  securityAnswer?: string;
  terms?: boolean;
  signatureName?: string;
  eSignConsent?: boolean;
  passportDocName?: string;
  addressProofDocName?: string;
  fundsProofDocName?: string;
  selfieDocName?: string;
  idDocName?: string;
}

export interface Transaction {
  id: string;
  date: string;
  type: "Credit" | "Debit";
  description: string;
  amount: number;
  balance: number;
  status: "Completed" | "Pending" | "Failed";
  customerId?: string;
  /** Optional counterparty / reference shown in admin forms */
  reference?: string;
  counterparty?: string;
  category?: string;
  notes?: string;
}

/** Newest first — keeps customer and admin lists ordered by transaction date. */
export function sortTransactionsByDate(txs: Transaction[]): Transaction[] {
  return [...txs].sort((a, b) => {
    const ta = new Date(a.date).getTime();
    const tb = new Date(b.date).getTime();
    if (Number.isNaN(ta) && Number.isNaN(tb)) return 0;
    if (Number.isNaN(ta)) return 1;
    if (Number.isNaN(tb)) return -1;
    return tb - ta;
  });
}

interface AuthState {
  user: Customer | null;
  isAdmin: boolean;
  /** False only during the first client tick while session is restored from storage. */
  authReady: boolean;
  transactions: Transaction[];
  login: (identifier: string, password: string) => Promise<boolean>;
  loginAdmin: (username: string, password: string) => Promise<boolean>;
  logout: () => void;
  register: (data: Partial<Customer>) => Promise<Customer>;
  updateBalance: (delta: number, description: string, type: "Credit" | "Debit") => Promise<void>;
  refreshTransactions: () => Promise<void>;
}

const AuthCtx = createContext<AuthState | null>(null);

/** Browser-tab session only — cleared when the tab/window is closed (banking-style). */
const STORAGE_KEY = "bangueherutage_auth_v2_session";
const TX_KEY = "bangueherutage_tx_v2_session";
/** Legacy permanent keys — purged so old logins do not stick after refresh. */
const LEGACY_STORAGE_KEYS = ["bangueherutage_auth_v1", "bangueherutage_tx_v1"];

/** Auto sign-out after this much idle time (ms). */
const IDLE_TIMEOUT_MS = 15 * 60 * 1000;
/** If the tab stays hidden this long, end the session (left the bank site). */
const HIDDEN_TIMEOUT_MS = 5 * 60 * 1000;

function sessionStore(): Storage | null {
  if (typeof window === "undefined") return null;
  try {
    return window.sessionStorage;
  } catch {
    return null;
  }
}

function purgeLegacyLocalAuth() {
  if (typeof window === "undefined") return;
  try {
    for (const k of LEGACY_STORAGE_KEYS) localStorage.removeItem(k);
  } catch {
    /* ignore */
  }
}

function readStoredSession(): { user: Customer | null; isAdmin: boolean; transactions: Transaction[] } {
  if (typeof window === "undefined") {
    return { user: null, isAdmin: false, transactions: [] };
  }
  purgeLegacyLocalAuth();
  const store = sessionStore();
  if (!store) return { user: null, isAdmin: false, transactions: [] };
  try {
    const raw = store.getItem(STORAGE_KEY);
    if (!raw) return { user: null, isAdmin: false, transactions: [] };
    const parsed = JSON.parse(raw) as { user?: Customer | null; isAdmin?: boolean };
    let transactions: Transaction[] = [];
    try {
      const txRaw = store.getItem(TX_KEY);
      if (txRaw) transactions = sortTransactionsByDate(JSON.parse(txRaw) as Transaction[]);
    } catch {
      /* ignore */
    }
    return {
      user: parsed.user ?? null,
      isAdmin: !!parsed.isAdmin,
      transactions,
    };
  } catch {
    return { user: null, isAdmin: false, transactions: [] };
  }
}

function writeSession(user: Customer | null, isAdmin: boolean) {
  const store = sessionStore();
  if (!store) return;
  try {
    if (user || isAdmin) store.setItem(STORAGE_KEY, JSON.stringify({ user, isAdmin }));
    else store.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
}

function writeTx(txs: Transaction[]) {
  const store = sessionStore();
  if (!store) return;
  try {
    store.setItem(TX_KEY, JSON.stringify(txs));
  } catch {
    /* ignore */
  }
}

function clearSessionStorage() {
  const store = sessionStore();
  if (!store) return;
  try {
    store.removeItem(STORAGE_KEY);
    store.removeItem(TX_KEY);
  } catch {
    /* ignore */
  }
}

function seedCustomer(overrides: Partial<Customer> = {}): Customer {
  return {
    customerId: "CUS-" + Math.random().toString(36).slice(2, 8).toUpperCase(),
    accountNumber: Math.floor(1000000000 + Math.random() * 8999999999).toString(),
    iban:
      "CH" +
      Math.floor(10 + Math.random() * 89) +
      " NIMB " +
      Math.floor(1000 + Math.random() * 8999) +
      " " +
      Math.floor(1000 + Math.random() * 8999),
    firstName: "Alex",
    lastName: "Morgan",
    username: "alex.morgan",
    email: "alex@demo.bangueherutage",
    phone: "+1 555 0100",
    accountType: "Savings Account",
    balance: 12450.75,
    status: "Active",
    registrationDate: new Date().toISOString(),
    role: "customer",
    ...overrides,
  };
}

const seedTx: Transaction[] = [
  {
    id: "t1",
    date: new Date(Date.now() - 86400000).toISOString(),
    type: "Credit",
    description: "Salary — Acme Corp",
    amount: 4200,
    balance: 12450.75,
    status: "Completed",
  },
  {
    id: "t2",
    date: new Date(Date.now() - 2 * 86400000).toISOString(),
    type: "Debit",
    description: "Whole Foods Market",
    amount: 87.32,
    balance: 8250.75,
    status: "Completed",
  },
  {
    id: "t3",
    date: new Date(Date.now() - 3 * 86400000).toISOString(),
    type: "Debit",
    description: "Transfer to Jamie R.",
    amount: 250,
    balance: 8338.07,
    status: "Completed",
  },
  {
    id: "t4",
    date: new Date(Date.now() - 5 * 86400000).toISOString(),
    type: "Credit",
    description: "Refund — Delta Airlines",
    amount: 412.9,
    balance: 8588.07,
    status: "Completed",
  },
  {
    id: "t5",
    date: new Date(Date.now() - 7 * 86400000).toISOString(),
    type: "Debit",
    description: "Netflix Subscription",
    amount: 15.99,
    balance: 8175.17,
    status: "Completed",
  },
];

function stripPassword(c: Customer): Customer {
  const { password: _p, securityAnswer: _s, ...rest } = c;
  return rest as Customer;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  // Initial state must be identical on server and client first paint.
  // Reading sessionStorage in useState causes SSR hydration mismatches.
  // Session is restored in useEffect; shells wait on `authReady` before redirecting.
  const [user, setUser] = useState<Customer | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [authReady, setAuthReady] = useState(false);

  useEffect(() => {
    const stored = readStoredSession();
    setUser(stored.user);
    setIsAdmin(stored.isAdmin);
    if (stored.transactions.length) {
      setTransactions(stored.transactions);
    } else if (stored.user && !isAppScriptConfigured()) {
      setTransactions(seedTx);
    }
    setAuthReady(true);

    const customerId = stored.user?.customerId;
    if (customerId && isAppScriptConfigured()) {
      void loadTx(customerId);
      // Soft-refresh customer profile (balance, status) without forcing re-login
      void syncProfile(customerId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- run once on mount for session restore
  }, []);

  // Pulls the latest profile (balance, status, etc.) and merges it into
  // local state quietly — no loading flags, no re-render flicker beyond the
  // normal React diff. Safe to call repeatedly in the background.
  const syncProfile = async (customerId: string) => {
    try {
      const res = await appScriptRequest<Customer[]>("listCustomers", {});
      if (res.ok && Array.isArray(res.data)) {
        const match = res.data.find((c) => c.customerId === customerId);
        if (match) {
          const next = stripPassword(match);
          setUser((prev) => {
            const merged = prev ? { ...prev, ...next } : next;
            writeSession(merged, false);
            return merged;
          });
        }
      }
    } catch {
      /* keep local session if network fails */
    }
  };

  const persist = (u: Customer | null, admin: boolean) => {
    setUser(u);
    setIsAdmin(admin);
    writeSession(u, admin);
  };

  const loadTx = async (customerId: string) => {
    if (!isAppScriptConfigured()) return;
    const res = await appScriptRequest<Transaction[]>("getTransactions", { customerId });
    if (res.ok && Array.isArray(res.data)) {
      const sorted = sortTransactionsByDate(res.data);
      setTransactions(sorted);
      writeTx(sorted);
    }
  };

  const loginWithFallback = async (identifier: string, password: string) => {
    if (!identifier || !password) return false;

    if (isAppScriptConfigured()) {
      const response = await appScriptRequest<Customer & { transactions?: Transaction[] }>("login", {
        identifier,
        password,
      });
      if (response.ok && response.data) {
        const customer = stripPassword(response.data);
        persist(customer, false);
        if (Array.isArray(response.data.transactions)) {
          const sorted = sortTransactionsByDate(response.data.transactions);
          setTransactions(sorted);
          writeTx(sorted);
        } else {
          await loadTx(customer.customerId);
        }
        return true;
      }
      return false;
    }

    const u = seedCustomer({
      email: identifier.includes("@") ? identifier : "alex@demo.bangueherutage",
      username: identifier.includes("@") ? "alex.morgan" : identifier,
    });
    persist(u, false);
    const sortedSeed = sortTransactionsByDate(seedTx);
    setTransactions(sortedSeed);
    writeTx(sortedSeed);
    return true;
  };

  const loginAdminWithFallback = async (username: string, password: string) => {
    if (isAppScriptConfigured()) {
      const response = await appScriptRequest<{ role: string; username: string }>("loginAdmin", {
        username,
        password,
      });
      if (response.ok && response.data) {
        persist(null, true);
        return true;
      }
      return false;
    }

    if (username === "admin" && password === "admin") {
      persist(null, true);
      return true;
    }
    return false;
  };

  const registerWithFallback = async (data: Partial<Customer>) => {
    if (isAppScriptConfigured()) {
      const response = await appScriptRequest<Customer>("register", data as Record<string, unknown>);
      if (response.ok && response.data) {
        const customer = stripPassword(response.data);
        persist(customer, false);
        setTransactions([]);
        writeTx([]);
        return customer;
      }
      throw new Error(response.error || "We couldn't create your account. Please try again.");
    }

    const fallbackCustomer = seedCustomer({ ...data, balance: 0, status: "Active" } as Partial<Customer>);
    persist(fallbackCustomer, false);
    setTransactions([]);
    return fallbackCustomer;
  };

  const updateBalanceWithFallback = async (
    delta: number,
    description: string,
    type: "Credit" | "Debit",
  ) => {
    if (!user) return;

    if (isAppScriptConfigured()) {
      const response = await appScriptRequest<{
        user: Customer;
        transaction: Transaction;
        transactions: Transaction[];
      }>("transfer", {
        customerId: user.customerId,
        delta,
        description,
        type,
      });
      if (response.ok && response.data) {
        const updated = stripPassword(response.data.user);
        persist(updated, isAdmin);
        if (Array.isArray(response.data.transactions)) {
          const sorted = sortTransactionsByDate(response.data.transactions);
          setTransactions(sorted);
          writeTx(sorted);
        } else if (response.data.transaction) {
          const newTx = sortTransactionsByDate([response.data.transaction, ...transactions]);
          setTransactions(newTx);
          writeTx(newTx);
        }
        return;
      }
      throw new Error(response.error || "We couldn't complete that transfer. Please try again.");
    }

    const newBal = user.balance + (type === "Credit" ? delta : -delta);
    const updated = { ...user, balance: newBal };
    const tx: Transaction = {
      id: "t" + Date.now(),
      date: new Date().toISOString(),
      type,
      description,
      amount: delta,
      balance: newBal,
      status: "Completed",
      customerId: user.customerId,
    };
    const newTx = sortTransactionsByDate([tx, ...transactions]);
    setTransactions(newTx);
    writeTx(newTx);
    persist(updated, isAdmin);
  };

  // Silently keep balance + transactions current in the background — polls
  // every 30s while the tab is visible, plus an immediate refresh whenever
  // the user switches back to the tab or reconnects to the network. No
  // spinners, no toasts, no visible reload: state just quietly updates.
  const backgroundSync = useCallback(async () => {
    if (!user?.customerId || isAdmin) return;
    await Promise.all([syncProfile(user.customerId), loadTx(user.customerId)]);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- syncProfile/loadTx close over stable refs each render
  }, [user?.customerId, isAdmin]);

  useBackgroundRefresh(backgroundSync, {
    intervalMs: 30000,
    enabled: authReady && !!user?.customerId && !isAdmin && isAppScriptConfigured(),
  });

  // Banking-style session end: idle timeout + leave-tab timeout.
  // Session lives in sessionStorage only (survives refresh in this tab, not new tabs / after close).
  useEffect(() => {
    if (!authReady) return;
    if (!user && !isAdmin) return;

    let idleTimer: ReturnType<typeof setTimeout> | null = null;
    let hiddenTimer: ReturnType<typeof setTimeout> | null = null;

    const endSession = (reason: string) => {
      persist(null, false);
      setTransactions([]);
      clearSessionStorage();
      try {
        // Soft signal for UI pages that listen for forced logout
        sessionStorage.setItem("bangueherutage_session_ended", reason);
      } catch {
        /* ignore */
      }
    };

    const bumpIdle = () => {
      if (idleTimer) clearTimeout(idleTimer);
      idleTimer = setTimeout(() => endSession("idle"), IDLE_TIMEOUT_MS);
    };

    const onVisibility = () => {
      if (document.visibilityState === "hidden") {
        if (hiddenTimer) clearTimeout(hiddenTimer);
        hiddenTimer = setTimeout(() => endSession("left"), HIDDEN_TIMEOUT_MS);
      } else {
        if (hiddenTimer) {
          clearTimeout(hiddenTimer);
          hiddenTimer = null;
        }
        bumpIdle();
      }
    };

    const activityEvents: Array<keyof WindowEventMap> = [
      "pointerdown",
      "keydown",
      "mousemove",
      "scroll",
      "touchstart",
    ];
    for (const ev of activityEvents) {
      window.addEventListener(ev, bumpIdle, { passive: true });
    }
    document.addEventListener("visibilitychange", onVisibility);
    bumpIdle();

    return () => {
      if (idleTimer) clearTimeout(idleTimer);
      if (hiddenTimer) clearTimeout(hiddenTimer);
      for (const ev of activityEvents) {
        window.removeEventListener(ev, bumpIdle);
      }
      document.removeEventListener("visibilitychange", onVisibility);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- session lifecycle only depends on login state
  }, [authReady, user?.customerId, isAdmin]);

  const value: AuthState = {
    user,
    isAdmin,
    authReady,
    transactions,
    login: async (identifier, password) => loginWithFallback(identifier, password),
    loginAdmin: async (username, password) => loginAdminWithFallback(username, password),
    logout: () => {
      persist(null, false);
      setTransactions([]);
      clearSessionStorage();
    },
    register: async (data) => registerWithFallback(data),
    updateBalance: async (delta, description, type) => {
      await updateBalanceWithFallback(delta, description, type);
    },
    refreshTransactions: async () => {
      if (user?.customerId) await loadTx(user.customerId);
    },
  };

  return <AuthCtx.Provider value={value}>{children}</AuthCtx.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthCtx);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}