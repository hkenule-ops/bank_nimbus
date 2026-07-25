import { createContext, useContext, useState, type ReactNode } from "react";

export type CurrencyCode = "USD" | "CHF";

// Static demo exchange rate — swap for a live FX API call if you want real-time rates.
const USD_TO_CHF_RATE = 0.88;

interface CurrencyContextValue {
  currency: CurrencyCode;
  toggleCurrency: () => void;
  /** Convert a USD amount into the currently selected display currency and format it. */
  format: (amountUsd: number) => string;
  /** Convert a number the user typed (in the currently selected currency) back into USD. */
  toUSD: (amountInSelectedCurrency: number) => number;
}

const CurrencyContext = createContext<CurrencyContextValue | null>(null);

export function CurrencyProvider({ children }: { children: ReactNode }) {
  const [currency, setCurrency] = useState<CurrencyCode>("USD");

  const toggleCurrency = () => setCurrency((c) => (c === "USD" ? "CHF" : "USD"));

  const format = (amountUsd: number) => {
    if (currency === "CHF") {
      return (amountUsd * USD_TO_CHF_RATE).toLocaleString("de-CH", { style: "currency", currency: "CHF" });
    }
    return amountUsd.toLocaleString("en-US", { style: "currency", currency: "USD" });
  };

  const toUSD = (amountInSelectedCurrency: number) => {
    return currency === "CHF" ? amountInSelectedCurrency / USD_TO_CHF_RATE : amountInSelectedCurrency;
  };

  return (
    <CurrencyContext.Provider value={{ currency, toggleCurrency, format, toUSD }}>
      {children}
    </CurrencyContext.Provider>
  );
}

export function useCurrency() {
  const ctx = useContext(CurrencyContext);
  if (!ctx) throw new Error("useCurrency must be used within a CurrencyProvider");
  return ctx;
}