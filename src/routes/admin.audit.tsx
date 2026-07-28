import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { RefreshCw, Loader2, Search, ShieldAlert } from "lucide-react";
import { appScriptRequest, isAppScriptConfigured } from "@/lib/appscript";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/audit")({
  component: AuditPage,
});

interface AuditEntry {
  id: string;
  event: string;
  detail: string;
  at: string;
}

function AuditPage() {
  const [rows, setRows] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      if (!isAppScriptConfigured()) {
        setRows([]);
        return;
      }
      const res = await appScriptRequest<AuditEntry[]>("listAudit", { limit: 300 });
      if (res.ok && Array.isArray(res.data)) setRows(res.data);
      else toast.error(res.error || "Failed to load audit log");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const filtered = rows.filter((r) =>
    `${r.event} ${r.detail} ${r.id}`.toLowerCase().includes(q.toLowerCase()),
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Audit logs</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {isAppScriptConfigured()
              ? "Every admin and system action recorded in Google Sheets."
              : "Configure VITE_APP_SCRIPT_URL to load audit events."}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search events…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              className="w-52 pl-9"
            />
          </div>
          <Button variant="outline" size="sm" onClick={() => void load()} disabled={loading}>
            <RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>
      </div>

      <Card className="overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center gap-2 p-12 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading…
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center gap-2 p-12 text-sm text-muted-foreground">
            <ShieldAlert className="h-8 w-8 opacity-40" />
            No audit events yet.
          </div>
        ) : (
          <ul className="divide-y divide-border">
            {filtered.map((r) => (
              <li key={r.id || `${r.event}-${r.at}`} className="px-5 py-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="outline" className="font-mono text-[10px]">
                        {r.event}
                      </Badge>
                      <span className="text-xs text-muted-foreground font-mono">{r.id}</span>
                    </div>
                    <pre className="mt-2 max-h-32 overflow-auto whitespace-pre-wrap break-all rounded-md bg-muted/40 p-2 text-xs text-muted-foreground">
                      {formatDetail(r.detail)}
                    </pre>
                  </div>
                  <div className="shrink-0 text-xs text-muted-foreground">
                    {r.at ? new Date(r.at).toLocaleString() : "—"}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}

function formatDetail(detail: string) {
  if (!detail) return "—";
  try {
    return JSON.stringify(JSON.parse(detail), null, 2);
  } catch {
    return detail;
  }
}
