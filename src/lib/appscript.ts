export type AppScriptAction = "login" | "loginAdmin" | "register" | "transfer";

interface AppScriptEnvelope<T> {
  ok: boolean;
  data?: T;
  error?: string;
  message?: string;
}

const APP_SCRIPT_URL = (import.meta.env.VITE_APP_SCRIPT_URL ?? "").trim();

export function isAppScriptConfigured() {
  return Boolean(APP_SCRIPT_URL);
}

export async function appScriptRequest<T>(action: AppScriptAction, payload: Record<string, unknown> = {}): Promise<AppScriptEnvelope<T>> {
  if (!APP_SCRIPT_URL) {
    return { ok: false, error: "Google Apps Script URL is not configured." };
  }

  try {
    const response = await fetch(APP_SCRIPT_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, ...payload }),
    });

    const text = await response.text();
    const parsed = text ? JSON.parse(text) : {};

    if (!response.ok) {
      return { ok: false, error: parsed?.error || parsed?.message || "Apps Script request failed." };
    }

    if (parsed?.ok === false) {
      return { ok: false, error: parsed?.error || parsed?.message || "Apps Script rejected the request." };
    }

    return {
      ok: true,
      data: parsed?.data ?? parsed,
      message: parsed?.message,
    };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Unable to reach Google Apps Script.",
    };
  }
}
