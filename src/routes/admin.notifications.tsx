import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RefreshCw, Loader2, Bell, Save } from "lucide-react";
import { appScriptRequest, isAppScriptConfigured } from "@/lib/appscript";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/notifications")({
  component: NotificationsPage,
});

/** System announcement stored in Config sheet under system_message. */
function NotificationsPage() {
  const [message, setMessage] = useState("");
  const [title, setTitle] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      if (!isAppScriptConfigured()) return;
      const res = await appScriptRequest<Record<string, string>>("getConfig", {});
      if (res.ok && res.data) {
        setTitle(res.data.system_message_title || "");
        setMessage(res.data.system_message || "");
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
      const t = await appScriptRequest("setConfig", {
        key: "system_message_title",
        value: title,
      });
      const m = await appScriptRequest("setConfig", {
        key: "system_message",
        value: message,
      });
      if (t.ok && m.ok) toast.success("Announcement saved to Config sheet");
      else toast.error(t.error || m.error || "Save failed");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Notifications</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Broadcast a system announcement stored in the Config sheet (`system_message`).
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => void load()} disabled={loading}>
          <RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      <Card className="max-w-2xl space-y-4 p-6">
        {loading ? (
          <div className="flex items-center justify-center gap-2 py-8 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading…
          </div>
        ) : (
          <>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Bell className="h-4 w-4" />
              Stored in Config for any client that reads getConfig.
            </div>
            <div>
              <Label className="text-xs">Title</Label>
              <Input
                className="mt-1.5"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="System maintenance"
              />
            </div>
            <div>
              <Label className="text-xs">Message</Label>
              <Textarea
                className="mt-1.5 min-h-[120px]"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Write an announcement for all customers…"
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
                  <Save className="mr-2 h-4 w-4" /> Save announcement
                </>
              )}
            </Button>
          </>
        )}
      </Card>
    </div>
  );
}
