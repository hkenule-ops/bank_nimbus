import { useRef } from "react";
import type { Customer, Transaction } from "@/lib/mock-auth";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Download, Printer } from "lucide-react";

type FormatFn = (n: number) => string;

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  transaction: Transaction | null;
  user?: Customer | null;
  format: FormatFn;
}

function money(format: FormatFn, type: string, amount: number) {
  const sign = type === "Credit" ? "+" : "−";
  return `${sign}${format(amount)}`;
}

function buildReceiptHtml(tx: Transaction, user: Customer | null | undefined, format: FormatFn) {
  const when = new Date(tx.date);
  const dateStr = when.toLocaleString(undefined, {
    dateStyle: "full",
    timeStyle: "medium",
  });
  const rows: [string, string][] = [
    ["Transaction ID", tx.id],
    ["Date & time", dateStr],
    ["Type", tx.type],
    ["Status", tx.status],
    ["Description", tx.description],
    ["Amount", money(format, tx.type, tx.amount)],
    ["Running balance", format(tx.balance)],
  ];
  if (tx.reference) rows.push(["Reference", tx.reference]);
  if (tx.counterparty) rows.push(["Counterparty", tx.counterparty]);
  if (tx.category) rows.push(["Category", tx.category]);
  if (tx.notes) rows.push(["Notes", tx.notes]);
  if (user) {
    rows.push(
      ["Account holder", `${user.firstName} ${user.lastName}`.trim()],
      ["Account number", user.accountNumber || "—"],
      ["IBAN", user.iban || "—"],
    );
  }

  const bodyRows = rows
    .map(
      ([k, v]) =>
        `<tr><td style="padding:8px 0;color:#6b7280;font-size:12px;width:40%;vertical-align:top">${k}</td><td style="padding:8px 0;font-size:13px;font-weight:500;text-align:right">${String(v).replace(/</g, "&lt;")}</td></tr>`,
    )
    .join("");

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8"/>
<title>Receipt ${tx.id} — Bangue Herutage Bank</title>
<style>
  body{font-family:ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,sans-serif;background:#f8f7f4;color:#1a1a1a;margin:0;padding:24px}
  .card{max-width:480px;margin:0 auto;background:#fff;border:1px solid #e8e4d9;border-radius:16px;padding:28px 32px;box-shadow:0 8px 30px rgba(0,0,0,.06)}
  .brand{font-size:11px;letter-spacing:.14em;text-transform:uppercase;color:#b8901f;font-weight:700}
  h1{font-size:20px;margin:8px 0 4px}
  .muted{color:#6b7280;font-size:12px}
  .amount{font-size:28px;font-weight:700;margin:20px 0 8px;color:${tx.type === "Credit" ? "#15803d" : "#1a1a1a"}}
  table{width:100%;border-collapse:collapse;margin-top:16px}
  tr+tr td{border-top:1px solid #f0eee8}
  .footer{margin-top:24px;padding-top:16px;border-top:1px dashed #e8e4d9;font-size:11px;color:#9ca3af;text-align:center;line-height:1.5}
  @media print{body{background:#fff;padding:0}.card{box-shadow:none;border:none}}
</style>
</head>
<body>
  <div class="card">
    <div class="brand">Bangue Herutage Bank</div>
    <h1>Transaction receipt</h1>
    <p class="muted">Official record of account activity</p>
    <div class="amount">${money(format, tx.type, tx.amount)}</div>
    <p class="muted">${tx.description}</p>
    <table>${bodyRows}</table>
    <div class="footer">
      Generated ${new Date().toLocaleString()} · Bangue Herutage Bank<br/>
      This document is a digital receipt for your records.
    </div>
  </div>
</body>
</html>`;
}

export function downloadTransactionReceipt(
  tx: Transaction,
  user: Customer | null | undefined,
  format: FormatFn,
) {
  const html = buildReceiptHtml(tx, user, format);
  const blob = new Blob([html], { type: "text/html;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `BangueHerutage-Receipt-${tx.id}.html`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export function printTransactionReceipt(
  tx: Transaction,
  user: Customer | null | undefined,
  format: FormatFn,
) {
  const html = buildReceiptHtml(tx, user, format);
  const w = window.open("", "_blank", "noopener,noreferrer,width=560,height=720");
  if (!w) return;
  w.document.write(html);
  w.document.close();
  // allow styles to load then print
  setTimeout(() => {
    w.focus();
    w.print();
  }, 250);
}

export function TransactionReceiptModal({ open, onOpenChange, transaction, user, format }: Props) {
  const printRef = useRef<HTMLDivElement>(null);
  if (!transaction) return null;
  const tx = transaction;
  const when = new Date(tx.date);

  const fields: { label: string; value: string }[] = [
    { label: "Transaction ID", value: tx.id },
    {
      label: "Date & time",
      value: when.toLocaleString(undefined, { dateStyle: "full", timeStyle: "medium" }),
    },
    { label: "Type", value: tx.type },
    { label: "Status", value: tx.status },
    { label: "Description", value: tx.description },
    { label: "Amount", value: money(format, tx.type, tx.amount) },
    { label: "Balance after", value: format(tx.balance) },
  ];
  if (tx.reference) fields.push({ label: "Reference", value: tx.reference });
  if (tx.counterparty) fields.push({ label: "Counterparty", value: tx.counterparty });
  if (tx.category) fields.push({ label: "Category", value: tx.category });
  if (tx.notes) fields.push({ label: "Notes", value: tx.notes });
  if (user) {
    fields.push(
      { label: "Account holder", value: `${user.firstName} ${user.lastName}`.trim() },
      { label: "Account number", value: user.accountNumber || "—" },
      { label: "IBAN", value: user.iban || "—" },
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={
          // Fit within the viewport: fixed max height, flex column, no overflow off-screen
          "flex max-h-[min(92dvh,640px)] w-[calc(100%-1.25rem)] max-w-md " +
          "flex-col gap-0 overflow-hidden rounded-2xl p-0 " +
          "left-1/2 top-1/2 translate-x-[-50%] translate-y-[-50%] " +
          "sm:w-full"
        }
      >
        <DialogHeader className="sr-only">
          <DialogTitle>Transaction receipt</DialogTitle>
          <DialogDescription>Full details for transaction {tx.id}</DialogDescription>
        </DialogHeader>

        {/* Scrollable body — keeps Print/Download pinned in view */}
        <div
          ref={printRef}
          className="min-h-0 flex-1 overflow-y-auto overscroll-contain bg-background px-4 pt-4 pb-3 sm:px-5 sm:pt-5"
        >
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#b8901f]">
                Bangue Herutage Bank
              </p>
              <h2 className="mt-0.5 text-base font-semibold sm:text-lg">Transaction receipt</h2>
              <p className="text-[11px] text-muted-foreground sm:text-xs">
                Official record of account activity
              </p>
            </div>
            <Badge
              variant="outline"
              className={
                "shrink-0 text-[10px] " +
                (tx.type === "Credit"
                  ? "border-success/40 text-success"
                  : "border-border text-muted-foreground")
              }
            >
              {tx.type}
            </Badge>
          </div>

          <div
            className={
              "mt-3 text-2xl font-bold tracking-tight sm:mt-4 sm:text-3xl " +
              (tx.type === "Credit" ? "text-success" : "text-foreground")
            }
          >
            {money(format, tx.type, tx.amount)}
          </div>
          <p className="mt-0.5 text-xs text-muted-foreground sm:text-sm break-words">
            {tx.description}
          </p>
          {(tx.status === "Failed" || tx.status === "Pending") && (
            <p className="mt-2 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-[11px] leading-relaxed text-destructive">
              {tx.status === "Pending"
                ? "Verification in progress. Complete remaining security layers to finish this transfer."
                : "This transfer was not completed. See status and notes below for the security layer that was not passed."}
            </p>
          )}

          <dl className="mt-3 divide-y divide-border/80 rounded-xl border border-border/80 bg-muted/20 px-3 sm:mt-4 sm:px-4">
            {fields.map((f) => (
              <div
                key={f.label}
                className="flex flex-col gap-0.5 py-2 sm:flex-row sm:items-start sm:justify-between sm:gap-4 sm:py-2.5"
              >
                <dt className="shrink-0 text-[11px] text-muted-foreground">{f.label}</dt>
                <dd className="break-all text-xs font-medium sm:text-right">{f.value}</dd>
              </div>
            ))}
          </dl>

          <p className="mt-3 pb-1 text-center text-[10px] leading-relaxed text-muted-foreground">
            Generated {new Date().toLocaleString()} · Digital receipt for your records
          </p>
        </div>

        {/* Sticky footer — always visible inside the dialog */}
        <div className="safe-bottom flex shrink-0 gap-2 border-t border-border bg-muted/40 px-4 py-3 sm:px-5">
          <Button
            type="button"
            variant="outline"
            className="h-11 min-h-[44px] flex-1"
            onClick={() => printTransactionReceipt(tx, user, format)}
          >
            <Printer className="mr-2 h-4 w-4 shrink-0" />
            Print
          </Button>
          <Button
            type="button"
            className="h-11 min-h-[44px] flex-1 gradient-primary text-primary-foreground"
            onClick={() => downloadTransactionReceipt(tx, user, format)}
          >
            <Download className="mr-2 h-4 w-4 shrink-0" />
            Download
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
