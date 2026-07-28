import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RefreshCw, Loader2, Save } from "lucide-react";
import { appScriptRequest, isAppScriptConfigured } from "@/lib/appscript";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/settings")({
  component: SettingsPage,
});

type ConfigMap = Record<string, string>;

function SettingsPage() {
  const [config, setConfig] = useState<ConfigMap>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [bankName, setBankName] = useState("");
  const [adminUsername, setAdminUsername] = useState("");
  const [adminPassword, setAdminPassword] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      if (!isAppScriptConfigured()) {
        setConfig({});
        return;
      }
      const res = await appScriptRequest<ConfigMap>("getConfig", {});
      if (res.ok && res.data) {
        setConfig(res.data);
        setBankName(res.data.bank_name || "");
        setAdminUsername(res.data.admin_username || "");
        setAdminPassword("");
      } else {
        toast.error(res.error || "Failed to load settings");
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const save = async () => {
    if (!isAppScriptConfigured()) {
      toast.error("Apps Script is not configured");
      return;
    }
    setSaving(true);
    try {
      const updates: { key: string; value: string }[] = [
        { key: "bank_name", value: bankName },
        { key: "admin_username", value: adminUsername },
      ];
      if (adminPassword.trim()) {
        updates.push({ key: "admin_password", value: adminPassword.trim() });
      }

      for (const u of updates) {
        const res = await appScriptRequest<ConfigMap>("setConfig", u);
        if (!res.ok) {
          toast.error(res.error || `Failed to save ${u.key}`);
          return;
        }
        if (res.data) setConfig(res.data);
      }
      setAdminPassword("");
      toast.success("Settings saved");
      void load();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold sm:text-2xl">Settings</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {isAppScriptConfigured()
              ? "Bank identity and admin credentials stored in the Config sheet."
              : "Configure VITE_APP_SCRIPT_URL to manage settings."}
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => void load()} disabled={loading}>
          <RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      {loading ? (
        <Card className="flex items-center justify-center gap-2 p-12 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading…
        </Card>
      ) : (
        <div className="grid gap-6 lg:grid-cols-2">
          <Card className="space-y-4 p-6">
            <h2 className="font-semibold">Bank profile</h2>
            <div>
              <Label className="text-xs">Bank name</Label>
              <Input
                className="mt-1.5"
                value={bankName}
                onChange={(e) => setBankName(e.target.value)}
                placeholder="Bangue Herutage Bank"
              />
            </div>
            <div>
              <Label className="text-xs">Admin username</Label>
              <Input
                className="mt-1.5"
                value={adminUsername}
                onChange={(e) => setAdminUsername(e.target.value)}
                placeholder="admin"
              />
            </div>
            <div>
              <Label className="text-xs">New admin password (leave blank to keep)</Label>
              <Input
                className="mt-1.5"
                type="password"
                value={adminPassword}
                onChange={(e) => setAdminPassword(e.target.value)}
                placeholder="••••••••"
              />
            </div>
            <Button
              className="gradient-primary text-primary-foreground"
              onClick={() => void save()}
              disabled={saving || !isAppScriptConfigured()}
            >
              {saving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving…
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" /> Save settings
                </>
              )}
            </Button>
          </Card>

          <Card className="p-6">
            <h2 className="font-semibold">Raw config keys</h2>
            <p className="mt-1 text-xs text-muted-foreground">
              Values currently stored in the Config sheet (password values are masked).
            </p>
            <ul className="mt-4 divide-y divide-border text-sm">
              {Object.keys(config).length === 0 && (
                <li className="py-3 text-muted-foreground">No config rows.</li>
              )}
              {Object.entries(config).map(([k, v]) => (
                <li key={k} className="flex items-center justify-between gap-4 py-2">
                  <span className="font-mono text-xs text-muted-foreground">{k}</span>
                  <span className="truncate font-medium">
                    {k.includes("password") ? "••••••••" : v}
                  </span>
                </li>
              ))}
            </ul>
          </Card>
        </div>
      )}
    </div>
  );
}
