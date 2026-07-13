import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

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
}

export interface Transaction {
  id: string;
  date: string;
  type: "Credit" | "Debit";
  description: string;
  amount: number;
  balance: number;
  status: "Completed" | "Pending" | "Failed";
}

interface AuthState {
  user: Customer | null;
  isAdmin: boolean;
  transactions: Transaction[];
  login: (identifier: string, password: string) => boolean;
  loginAdmin: (username: string, password: string) => boolean;
  logout: () => void;
  register: (data: Partial<Customer>) => Customer;
  updateBalance: (delta: number, description: string, type: "Credit" | "Debit") => void;
}

const AuthCtx = createContext<AuthState | null>(null);

const STORAGE_KEY = "nimbus_auth_v1";
const TX_KEY = "nimbus_tx_v1";

function seedCustomer(overrides: Partial<Customer> = {}): Customer {
  return {
    customerId: "CUS-" + Math.random().toString(36).slice(2, 8).toUpperCase(),
    accountNumber: Math.floor(1000000000 + Math.random() * 8999999999).toString(),
    iban: "NB" + Math.floor(10 + Math.random() * 89) + " NIMB " + Math.floor(1000 + Math.random() * 8999) + " " + Math.floor(1000 + Math.random() * 8999),
    firstName: "Alex",
    lastName: "Morgan",
    username: "alex.morgan",
    email: "alex@demo.nimbus",
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
  { id: "t1", date: new Date(Date.now() - 86400000).toISOString(), type: "Credit", description: "Salary — Acme Corp", amount: 4200, balance: 12450.75, status: "Completed" },
  { id: "t2", date: new Date(Date.now() - 2 * 86400000).toISOString(), type: "Debit", description: "Whole Foods Market", amount: 87.32, balance: 8250.75, status: "Completed" },
  { id: "t3", date: new Date(Date.now() - 3 * 86400000).toISOString(), type: "Debit", description: "Transfer to Jamie R.", amount: 250, balance: 8338.07, status: "Completed" },
  { id: "t4", date: new Date(Date.now() - 5 * 86400000).toISOString(), type: "Credit", description: "Refund — Delta Airlines", amount: 412.9, balance: 8588.07, status: "Completed" },
  { id: "t5", date: new Date(Date.now() - 7 * 86400000).toISOString(), type: "Debit", description: "Netflix Subscription", amount: 15.99, balance: 8175.17, status: "Completed" },
];

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<Customer | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [transactions, setTransactions] = useState<Transaction[]>(seedTx);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        setUser(parsed.user);
        setIsAdmin(parsed.isAdmin);
      }
      const tx = localStorage.getItem(TX_KEY);
      if (tx) setTransactions(JSON.parse(tx));
    } catch {}
  }, []);

  const persist = (u: Customer | null, admin: boolean) => {
    setUser(u); setIsAdmin(admin);
    if (u || admin) localStorage.setItem(STORAGE_KEY, JSON.stringify({ user: u, isAdmin: admin }));
    else localStorage.removeItem(STORAGE_KEY);
  };

  const value: AuthState = {
    user, isAdmin, transactions,
    login: (identifier, password) => {
      if (!identifier || !password) return false;
      const u = seedCustomer({ email: identifier.includes("@") ? identifier : "alex@demo.nimbus", username: identifier.includes("@") ? "alex.morgan" : identifier });
      persist(u, false);
      return true;
    },
    loginAdmin: (username, password) => {
      if (username === "admin" && password === "admin") {
        persist(null, true);
        return true;
      }
      return false;
    },
    logout: () => persist(null, false),
    register: (data) => {
      const u = seedCustomer({ ...data, balance: 0, status: "Active" });
      persist(u, false);
      return u;
    },
    updateBalance: (delta, description, type) => {
      if (!user) return;
      const newBal = user.balance + (type === "Credit" ? delta : -delta);
      const updated = { ...user, balance: newBal };
      const tx: Transaction = {
        id: "t" + Date.now(), date: new Date().toISOString(), type, description, amount: delta, balance: newBal, status: "Completed",
      };
      const newTx = [tx, ...transactions];
      setTransactions(newTx);
      localStorage.setItem(TX_KEY, JSON.stringify(newTx));
      persist(updated, isAdmin);
    },
  };

  return <AuthCtx.Provider value={value}>{children}</AuthCtx.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthCtx);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
