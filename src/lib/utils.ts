import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Turn technical/backend errors into short messages for customers and staff.
 * Never surfaces env vars, deployment steps, or stack-style text in the UI.
 */
export function userFacingError(
  error: unknown,
  fallback = "Something went wrong. Please try again.",
): string {
  const raw = (() => {
    if (typeof error === "string") return error;
    if (error instanceof Error) return error.message;
    if (error && typeof error === "object" && "error" in error) {
      const e = (error as { error?: unknown }).error;
      if (typeof e === "string") return e;
    }
    if (error && typeof error === "object" && "message" in error) {
      const m = (error as { message?: unknown }).message;
      if (typeof m === "string") return m;
    }
    return "";
  })().trim();

  if (!raw) return fallback;

  const lower = raw.toLowerCase();

  // Infrastructure / developer setup — never show to end users
  if (
    lower.includes("vite_") ||
    lower.includes("apps script") ||
    lower.includes("code.gs") ||
    lower.includes("not configured") ||
    lower.includes("spreadsheet") ||
    lower.includes("missing sheet") ||
    lower.includes("setupsheets") ||
    lower.includes("deploy") ||
    lower.includes("non-json") ||
    lower.includes("unable to reach") ||
    lower.includes("failed to fetch") ||
    lower.includes("networkerror") ||
    lower.includes("cors") ||
    lower.includes("web app")
  ) {
    return "This service is temporarily unavailable. Please try again in a moment.";
  }

  // Auth & account
  if (lower.includes("invalid credentials") || lower.includes("invalid admin")) {
    return "Those sign-in details don't match our records. Please try again.";
  }
  if (lower.includes("suspended")) {
    return "This account has been suspended. Please contact support for help.";
  }
  if (lower.includes("already exists")) {
    return "An account with this email already exists. Try signing in instead.";
  }
  if (lower.includes("missing credentials")) {
    return "Please enter your sign-in details to continue.";
  }

  // Payments / balances
  if (lower.includes("insufficient")) {
    return "You don't have enough available balance for this amount.";
  }
  if (lower.includes("invalid amount") || lower.includes("amount must be positive")) {
    return "Please enter a valid amount.";
  }
  if (lower.includes("customer not found")) {
    return "We couldn't find that account. Please check the details and try again.";
  }
  if (lower.includes("card not found") || lower.includes("request not found")) {
    return "We couldn't find that card request. It may have already been processed.";
  }
  if (lower.includes("not pending")) {
    return "This request has already been reviewed.";
  }
  if (lower.includes("only issued cards")) {
    return "This card isn't active yet, so it can't be frozen or unfrozen.";
  }
  if (lower.includes("beneficiary not found")) {
    return "That saved recipient could not be found.";
  }
  if (lower.includes("name and account")) {
    return "Please enter the recipient's name and account number.";
  }
  if (lower.includes("session not found") || lower.includes("no longer active")) {
    return "This security step has expired. Please start the transfer again.";
  }
  if (lower.includes("invalid code") || lower.includes("incorrect")) {
    return "That code isn't correct. Please check and try again.";
  }
  if (lower.includes("no code has been issued")) {
    return "A verification code hasn't been issued yet. Please wait for the bank to send one.";
  }
  if (lower.includes("already verified")) {
    return "This step is already complete. Continue with the next one.";
  }

  // Safe to show short, plain language from the server
  if (
    raw.length <= 140 &&
    !lower.includes("error:") &&
    !lower.includes("exception") &&
    !lower.includes("undefined") &&
    !lower.includes("null is") &&
    !/[{\[\]}]/.test(raw) &&
    !lower.includes("stack") &&
    !lower.includes("at object") &&
    !lower.includes("typeerror")
  ) {
    return raw;
  }

  return fallback;
}
