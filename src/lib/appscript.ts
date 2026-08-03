export type AppScriptAction =
  | "login"
  | "loginAdmin"
  | "register"
  | "transfer"
  | "getTransactions"
  | "listCustomers"
  | "listAllTransactions"
  | "updateCustomer"
  | "deleteCustomer"
  | "adminCredit"
  | "adminDebit"
  | "adminCreateTransaction"
  | "adminUpdateTransaction"
  | "adminDeleteTransaction"
  | "listCryptoAssets"
  | "upsertCryptoAsset"
  | "deleteCryptoAsset"
  | "listLoanProducts"
  | "upsertLoanProduct"
  | "deleteLoanProduct"
  | "applyLoan"
  | "listMyLoans"
  | "listLoanApplications"
  | "reviewLoanApplication"
  | "makeLoanPayment"
  | "getCryptoVerification"
  | "submitCryptoVerification"
  | "adminSetCryptoVerification"
  | "listAudit"
  | "getConfig"
  | "setConfig"
  | "sendOtp"
  | "verifyOtp"
  | "createTransferOtp"
  | "getTransferOtp"
  | "listTransferOtp"
  | "adminGenerateTransferOtp"
  | "verifyTransferOtp"
  | "cancelTransferOtp"
  | "getTransferClearance"
  | "ensureCustomerOtpInstance"
  | "getActiveTransferSession"
  | "beginPendingTransfer"
  | "finalizePendingTransfer"
  | "declinePendingTransfer"
  | "chatSend"
  | "chatPoll"
  | "chatListThreads"
  | "chatClose"
  // Cards — request / approve / manage
  | "listMyCards"
  | "requestCard"
  | "setCardFrozen"
  | "listAllCards"
  | "reviewCardRequest"
  | "updateCard"
  | "deleteCard"
  | "adminIssueCard"
  // Beneficiaries
  | "listBeneficiaries"
  | "upsertBeneficiary"
  | "deleteBeneficiary"
  | "listAllBeneficiaries"
  | "ping";

interface AppScriptEnvelope<T> {
  ok: boolean;
  data?: T;
  error?: string;
  message?: string;
}

const APP_SCRIPT_URL = (
  import.meta.env.VITE_APP_SCRIPT_URL ||
  import.meta.env.VITE_APPS_SCRIPT_URL ||
  ""
).trim();

export function isAppScriptConfigured() {
  return Boolean(APP_SCRIPT_URL);
}

export function getAppScriptUrl() {
  return APP_SCRIPT_URL;
}

/**
 * POST JSON to the deployed Google Apps Script web app.
 * Uses text/plain to avoid a CORS preflight (Apps Script limitation).
 */
export async function appScriptRequest<T>(
  action: AppScriptAction,
  payload: Record<string, unknown> = {},
): Promise<AppScriptEnvelope<T>> {
  if (!APP_SCRIPT_URL) {
    return { ok: false, error: "This service is temporarily unavailable. Please try again later." };
  }

  try {
    const normalizedPayload =
      Object.prototype.hasOwnProperty.call(payload, "data") && Object.keys(payload).length === 1
        ? ((payload.data as Record<string, unknown> | undefined) ?? {})
        : payload;

    const response = await fetch(APP_SCRIPT_URL, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify({ action, ...normalizedPayload }),
      redirect: "follow",
    });

    const text = await response.text();
    let parsed: Record<string, unknown> = {};
    try {
      parsed = text ? (JSON.parse(text) as Record<string, unknown>) : {};
    } catch {
      return {
        ok: false,
        error: "We couldn't complete that request right now. Please try again shortly.",
      };
    }

    if (!response.ok) {
      return {
        ok: false,
        error: String(parsed?.error || parsed?.message || "We couldn't complete that request. Please try again."),
      };
    }

    if (parsed?.ok === false) {
      return {
        ok: false,
        error: String(parsed?.error || parsed?.message || "That request couldn't be completed. Please try again."),
      };
    }

    // Support both { ok, data } and legacy bare payloads
    const data =
      parsed?.data !== undefined
        ? (parsed.data as T)
        : (("ok" in parsed ? undefined : (parsed as T)) as T | undefined);

    return {
      ok: true,
      data: (data ?? (parsed as unknown as T)) as T,
      message: parsed?.message ? String(parsed.message) : undefined,
    };
  } catch (error) {
    return {
      ok: false,
      error: "We couldn't reach the bank service. Please check your connection and try again.",
    };
  }
}
