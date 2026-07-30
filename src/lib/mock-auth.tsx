import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { appScriptRequest, isAppScriptConfigured } from "./appscript";

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
  transactions: Transaction[];
  login: (identifier: string, password: string) => Promise<boolean>;
  loginAdmin: (username: string, password: string) => Promise<boolean>;
  logout: () => void;
  register: (data: Partial<Customer>) => Promise<Customer>;
  updateBalance: (delta: number, description: string, type: "Credit" | "Debit") => Promise<void>;
  refreshTransactions: () => Promise<void>;
}

const AuthCtx = createContext<AuthState | null>(null);

const STORAGE_KEY = "bangueherutage_auth_v1";
const TX_KEY = "bangueherutage_tx_v1";

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
  const [user, setUser] = useState<Customer | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [transactions, setTransactions] = useState<Transaction[]>([]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        setUser(parsed.user);
        setIsAdmin(parsed.isAdmin);
        if (parsed.user?.customerId && isAppScriptConfigured()) {
          void loadTx(parsed.user.customerId);
        } else if (parsed.user) {
          const tx = localStorage.getItem(TX_KEY);
          if (tx) setTransactions(JSON.parse(tx));
          else setTransactions(seedTx);
        }
      }
    } catch {
      /* ignore */
    }
  }, []);

  const persist = (u: Customer | null, admin: boolean) => {
    setUser(u);
    setIsAdmin(admin);
    if (u || admin) localStorage.setItem(STORAGE_KEY, JSON.stringify({ user: u, isAdmin: admin }));
    else localStorage.removeItem(STORAGE_KEY);
  };

  const loadTx = async (customerId: string) => {
    if (!isAppScriptConfigured()) return;
    const res = await appScriptRequest<Transaction[]>("getTransactions", { customerId });
    if (res.ok && Array.isArray(res.data)) {
      const sorted = sortTransactionsByDate(res.data);
      setTransactions(sorted);
      localStorage.setItem(TX_KEY, JSON.stringify(sorted));
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
          localStorage.setItem(TX_KEY, JSON.stringify(sorted));
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
    localStorage.setItem(TX_KEY, JSON.stringify(sortedSeed));
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
        localStorage.setItem(TX_KEY, JSON.stringify([]));
        return customer;
      }
      throw new Error(response.error || "Registration failed");
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
          localStorage.setItem(TX_KEY, JSON.stringify(sorted));
        } else if (response.data.transaction) {
          const newTx = sortTransactionsByDate([response.data.transaction, ...transactions]);
          setTransactions(newTx);
          localStorage.setItem(TX_KEY, JSON.stringify(newTx));
        }
        return;
      }
      throw new Error(response.error || "Transfer failed");
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
    localStorage.setItem(TX_KEY, JSON.stringify(newTx));
    persist(updated, isAdmin);
  };

  const value: AuthState = {
    user,
    isAdmin,
    transactions,
    login: async (identifier, password) => loginWithFallback(identifier, password),
    loginAdmin: async (username, password) => loginAdminWithFallback(username, password),
    logout: () => {
      persist(null, false);
      setTransactions([]);
      localStorage.removeItem(TX_KEY);
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
