import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { useAuth, type Customer } from "@/lib/mock-auth";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import {
  Shield,
  KeyRound,
  Smartphone,
  Monitor,
  Laptop,
  LogOut,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  Eye,
  EyeOff,
  HelpCircle,
  ShieldCheck,
  Clock,
  RefreshCw,
} from "lucide-react";
import { appScriptRequest, isAppScriptConfigured } from "@/lib/appscript";
import { cn, userFacingError } from "@/lib/utils";

export const Route = createFileRoute("/dashboard/profile")({
  head: () => ({ meta: [{ title: "Profile — Bangue Herutage Bank" }] }),
  component: Profile,
});

type DeviceKind = "desktop" | "mobile" | "tablet" | string;

interface SecuritySession {
  id: string;
  customerId: string;
  label: string;
  device: DeviceKind;
  userAgent?: string;
  ip?: string;
  createdAt: string;
  lastActive: string;
  revoked?: boolean;
}

function formatRelative(iso: string): string {
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return "Unknown";
  const diff = Date.now() - t;
  if (diff < 60_000) return "Just now";
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)} min ago`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)} hours ago`;
  return `${Math.floor(diff / 86_400_000)} days ago`;
}

function DeviceIcon({ kind }: { kind: DeviceKind }) {
  const k = String(kind || "").toLowerCase();
  if (k === "mobile") return <Smartphone className="h-4 w-4" />;
  if (k === "tablet") return <Laptop className="h-4 w-4" />;
  return <Monitor className="h-4 w-4" />;
}

function Profile() {
  const { user, logout } = useAuth();
  if (!user) return null;

  return (
    <div className="space-y-6 pb-2 md:pb-0">
      <div>
        <h1 className="text-xl font-bold sm:text-2xl">Profile</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Update your personal information and security preferences.
        </p>
      </div>

      <Card className="p-6">
        <div className="flex items-center gap-4">
          <div className="grid h-16 w-16 place-items-center rounded-full gradient-primary text-lg font-semibold text-primary-foreground">
            {user.firstName[0]}
            {user.lastName[0]}
          </div>
          <div>
            <div className="font-semibold">
              {user.firstName} {user.lastName}
            </div>
            <div className="text-sm text-muted-foreground">{user.email}</div>
            <div className="mt-1 flex flex-wrap gap-2">
              <Badge variant="secondary" className="text-xs">
                {user.accountType || "Account"}
              </Badge>
              <Badge variant={user.status === "Active" ? "default" : "outline"} className="text-xs">
                {user.status}
              </Badge>
            </div>
          </div>
        </div>
      </Card>

      <PersonalDetailsCard user={user} />
      <SecuritySection user={user} onLogout={logout} />
    </div>
  );
}

function PersonalDetailsCard({ user }: { user: Customer }) {
  const [phone, setPhone] = useState(user.phone || "");
  const [email, setEmail] = useState(user.email || "");
  const [address, setAddress] = useState(user.address || "");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setPhone(user.phone || "");
    setEmail(user.email || "");
    setAddress(user.address || "");
  }, [user.phone, user.email, user.address]);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAppScriptConfigured()) {
      toast.error("Banking services are unavailable. Please try again later.");
      return;
    }
    setSaving(true);
    try {
      const res = await appScriptRequest<Customer>("updateCustomer", {
        customerId: user.customerId,
        phone: phone.trim(),
        email: email.trim(),
        address: address.trim(),
      });
      if (!res.ok) {
        toast.error(userFacingError(res.error, "Could not update profile."));
        return;
      }
      toast.success("Profile updated");
    } catch (err) {
      toast.error(userFacingError(err, "Could not update profile."));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card className="p-6">
      <h3 className="font-semibold">Personal details</h3>
      <form onSubmit={save} className="mt-4 grid gap-4 sm:grid-cols-2">
        <div>
          <Label>Phone</Label>
          <Input value={phone} onChange={(e) => setPhone(e.target.value)} className="mt-1.5" />
        </div>
        <div>
          <Label>Email</Label>
          <Input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mt-1.5"
          />
        </div>
        <div className="sm:col-span-2">
          <Label>Address</Label>
          <Input
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="Street, city, country"
            className="mt-1.5"
          />
        </div>
        <div className="sm:col-span-2">
          <Button type="submit" disabled={saving} className="gradient-primary text-primary-foreground">
            {saving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving…
              </>
            ) : (
              "Save changes"
            )}
          </Button>
        </div>
      </form>
    </Card>
  );
}

function SecuritySection({ user, onLogout }: { user: Customer; onLogout: () => void }) {
  const [twoFa, setTwoFa] = useState(Boolean(user.twoFactorEnabled));
  const [twoFaSaving, setTwoFaSaving] = useState(false);
  const [sessions, setSessions] = useState<SecuritySession[]>([]);
  const [sessionsLoading, setSessionsLoading] = useState(true);
  const [sessionBusy, setSessionBusy] = useState<string | null>(null);

  const currentSessionId = user.sessionId || "";

  const loadSessions = useCallback(async () => {
    if (!isAppScriptConfigured()) {
      setSessions([]);
      setSessionsLoading(false);
      return;
    }
    setSessionsLoading(true);
    try {
      const res = await appScriptRequest<SecuritySession[]>("listMySessions", {
        customerId: user.customerId,
      });
      if (res.ok && Array.isArray(res.data)) {
        setSessions(res.data);
      } else {
        setSessions([]);
        if (res.error) toast.error(userFacingError(res.error, "Could not load sessions."));
      }
      if (currentSessionId) {
        void appScriptRequest("touchSession", {
          id: currentSessionId,
          customerId: user.customerId,
        });
      }
    } catch (err) {
      setSessions([]);
      toast.error(userFacingError(err, "Could not load sessions."));
    } finally {
      setSessionsLoading(false);
    }
  }, [user.customerId, currentSessionId]);

  useEffect(() => {
    setTwoFa(Boolean(user.twoFactorEnabled));
  }, [user.twoFactorEnabled]);

  useEffect(() => {
    void loadSessions();
  }, [loadSessions]);

  const toggleTwoFa = async (on: boolean) => {
    if (!isAppScriptConfigured()) {
      toast.error("Banking services are unavailable. Please try again later.");
      return;
    }
    setTwoFaSaving(true);
    const prev = twoFa;
    setTwoFa(on);
    try {
      const res = await appScriptRequest<{ twoFactorEnabled: boolean }>("setTwoFactor", {
        customerId: user.customerId,
        enabled: on,
      });
      if (!res.ok) {
        setTwoFa(prev);
        toast.error(userFacingError(res.error, "Could not update two-factor settings."));
        return;
      }
      setTwoFa(Boolean(res.data?.twoFactorEnabled ?? on));
      toast.success(
        on
          ? "Two-factor authentication enabled. Codes will be required on new devices."
          : "Two-factor authentication disabled.",
      );
    } catch (err) {
      setTwoFa(prev);
      toast.error(userFacingError(err, "Could not update two-factor settings."));
    } finally {
      setTwoFaSaving(false);
    }
  };

  const revokeSession = async (id: string) => {
    if (!isAppScriptConfigured()) {
      toast.error("Banking services are unavailable. Please try again later.");
      return;
    }
    setSessionBusy(id);
    try {
      const res = await appScriptRequest("revokeSession", {
        id,
        customerId: user.customerId,
      });
      if (!res.ok) {
        toast.error(userFacingError(res.error, "Could not sign out that session."));
        return;
      }
      if (id === currentSessionId) {
        onLogout();
        toast.message("Signed out of this device");
        return;
      }
      toast.success("Session signed out");
      await loadSessions();
    } catch (err) {
      toast.error(userFacingError(err, "Could not sign out that session."));
    } finally {
      setSessionBusy(null);
    }
  };

  const revokeOthers = async () => {
    if (!isAppScriptConfigured()) {
      toast.error("Banking services are unavailable. Please try again later.");
      return;
    }
    if (!currentSessionId) {
      toast.error("Current session is unknown. Sign out and sign in again, then retry.");
      return;
    }
    setSessionBusy("others");
    try {
      const res = await appScriptRequest<{ revoked: number }>("revokeOtherSessions", {
        customerId: user.customerId,
        keepSessionId: currentSessionId,
      });
      if (!res.ok) {
        toast.error(userFacingError(res.error, "Could not sign out other sessions."));
        return;
      }
      toast.success(
        res.data?.revoked
          ? `Signed out ${res.data.revoked} other session${res.data.revoked === 1 ? "" : "s"}`
          : "No other sessions to sign out",
      );
      await loadSessions();
    } catch (err) {
      toast.error(userFacingError(err, "Could not sign out other sessions."));
    } finally {
      setSessionBusy(null);
    }
  };

  const activeCount = sessions.length;
  const hasOthers = sessions.some((s) => s.id !== currentSessionId);

  return (
    <div className="space-y-6">
      <Card className="overflow-hidden p-0">
        <div className="flex items-start gap-3 border-b border-border/60 bg-muted/30 px-6 py-4">
          <div className="grid h-10 w-10 place-items-center rounded-full bg-primary/15 text-primary">
            <Shield className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="font-semibold">Security</h3>
            <p className="text-sm text-muted-foreground">
              Password, verification codes, security question, and signed-in devices — stored on your
              bank record.
            </p>
          </div>
          <Badge variant={twoFa ? "default" : "outline"} className="shrink-0 text-xs">
            {twoFa ? (
              <span className="flex items-center gap-1">
                <ShieldCheck className="h-3 w-3" /> 2FA on
              </span>
            ) : (
              "2FA off"
            )}
          </Badge>
        </div>

        <div className="space-y-8 p-6">
          {!isAppScriptConfigured() && (
            <div className="flex items-start gap-2 rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-800 dark:text-amber-300">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>Security settings require a live connection to the bank backend.</span>
            </div>
          )}

          <div className="grid gap-3 sm:grid-cols-3">
            <StatusTile
              icon={<KeyRound className="h-4 w-4" />}
              label="Password"
              value="Protected"
              tone="ok"
            />
            <StatusTile
              icon={<HelpCircle className="h-4 w-4" />}
              label="Security question"
              value={user.securityQuestion ? "Set" : "Not set"}
              tone={user.securityQuestion ? "ok" : "warn"}
            />
            <StatusTile
              icon={<Clock className="h-4 w-4" />}
              label="Active sessions"
              value={
                sessionsLoading
                  ? "…"
                  : `${activeCount} device${activeCount === 1 ? "" : "s"}`
              }
              tone="neutral"
            />
          </div>

          <Separator />

          <ChangePasswordForm customerId={user.customerId} />

          <Separator />

          <SecurityQuestionForm
            customerId={user.customerId}
            initialQuestion={user.securityQuestion || ""}
          />

          <Separator />

          <div>
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <h4 className="flex items-center gap-2 font-medium">
                  <Smartphone className="h-4 w-4 text-primary" />
                  Two-factor authentication
                </h4>
                <p className="mt-1 text-sm text-muted-foreground">
                  When enabled, sensitive actions and new device sign-ins require a one-time code
                  sent to your email.
                </p>
              </div>
              <Switch
                checked={twoFa}
                disabled={twoFaSaving || !isAppScriptConfigured()}
                onCheckedChange={(v) => void toggleTwoFa(v)}
                aria-label="Toggle two-factor authentication"
              />
            </div>
            {twoFa && (
              <div className="mt-3 flex items-start gap-2 rounded-md border border-success/30 bg-success/10 px-3 py-2 text-sm text-success">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
                <span>2FA is enabled on your account record.</span>
              </div>
            )}
            {!twoFa && (
              <div className="mt-3 flex items-start gap-2 rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-800 dark:text-amber-300">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                <span>
                  We recommend enabling two-factor authentication to better protect your account.
                </span>
              </div>
            )}
          </div>

          <Separator />

          <div>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h4 className="flex items-center gap-2 font-medium">
                  <Monitor className="h-4 w-4 text-primary" />
                  Active sessions
                </h4>
                <p className="mt-1 text-sm text-muted-foreground">
                  Devices currently signed in to your account. Sign out anything you don’t recognise.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => void loadSessions()}
                  disabled={sessionsLoading}
                >
                  <RefreshCw className={cn("mr-2 h-3.5 w-3.5", sessionsLoading && "animate-spin")} />
                  Refresh
                </Button>
                {hasOthers && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => void revokeOthers()}
                    disabled={sessionBusy === "others"}
                  >
                    {sessionBusy === "others" ? (
                      <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <LogOut className="mr-2 h-3.5 w-3.5" />
                    )}
                    Sign out other devices
                  </Button>
                )}
              </div>
            </div>

            <ul className="mt-4 space-y-2">
              {sessionsLoading && (
                <li className="flex items-center justify-center gap-2 rounded-xl border border-border/60 px-4 py-6 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" /> Loading sessions…
                </li>
              )}
              {!sessionsLoading &&
                sessions.map((s) => {
                  const isCurrent = Boolean(currentSessionId) && s.id === currentSessionId;
                  return (
                    <li
                      key={s.id}
                      className={cn(
                        "flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border/60 bg-background/60 px-4 py-3",
                        isCurrent && "ring-1 ring-primary/30",
                      )}
                    >
                      <div className="flex min-w-0 items-start gap-3">
                        <div className="mt-0.5 grid h-9 w-9 place-items-center rounded-full bg-muted text-muted-foreground">
                          <DeviceIcon kind={s.device} />
                        </div>
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-sm font-medium">{s.label}</span>
                            {isCurrent && (
                              <Badge className="text-[10px]" variant="secondary">
                                This device
                              </Badge>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground">
                            Last active {formatRelative(s.lastActive || s.createdAt)}
                            {s.createdAt ? ` · Signed in ${formatRelative(s.createdAt)}` : ""}
                          </p>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        className={cn(
                          isCurrent ? "text-muted-foreground" : "text-destructive hover:text-destructive",
                        )}
                        disabled={sessionBusy === s.id}
                        onClick={() => void revokeSession(s.id)}
                      >
                        {sessionBusy === s.id ? (
                          <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                        ) : null}
                        {isCurrent ? "Sign out here" : "Sign out"}
                      </Button>
                    </li>
                  );
                })}
              {!sessionsLoading && sessions.length === 0 && (
                <li className="rounded-xl border border-dashed border-border px-4 py-6 text-center text-sm text-muted-foreground">
                  No active sessions on record. Sign out and sign in again to register this device.
                </li>
              )}
            </ul>
          </div>
        </div>
      </Card>
    </div>
  );
}

function StatusTile({
  icon,
  label,
  value,
  tone,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  tone: "ok" | "warn" | "neutral";
}) {
  return (
    <div className="rounded-xl border border-border/60 bg-muted/20 px-4 py-3">
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        {icon}
        {label}
      </div>
      <div
        className={cn(
          "mt-1 text-sm font-semibold",
          tone === "ok" && "text-success",
          tone === "warn" && "text-amber-700 dark:text-amber-400",
        )}
      >
        {value}
      </div>
    </div>
  );
}

function ChangePasswordForm({ customerId }: { customerId: string }) {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [show, setShow] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = () => {
    const e: Record<string, string> = {};
    if (!current.trim()) e.current = "Enter your current password.";
    if (next.length < 8) e.next = "New password must be at least 8 characters.";
    if (next && next === current) e.next = "New password must be different from the current one.";
    if (next !== confirm) e.confirm = "Passwords do not match.";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    if (!isAppScriptConfigured()) {
      toast.error("Banking services are unavailable. Please try again later.");
      return;
    }
    setSaving(true);
    try {
      const res = await appScriptRequest("changePassword", {
        customerId,
        currentPassword: current,
        password: next,
      });
      if (!res.ok) {
        toast.error(userFacingError(res.error, "Could not change password."));
        return;
      }
      setCurrent("");
      setNext("");
      setConfirm("");
      setErrors({});
      toast.success("Password updated successfully");
    } catch (err) {
      toast.error(userFacingError(err, "Could not change password."));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <h4 className="flex items-center gap-2 font-medium">
        <KeyRound className="h-4 w-4 text-primary" />
        Change password
      </h4>
      <p className="mt-1 text-sm text-muted-foreground">
        Verified against your current password on the bank backend. Minimum 8 characters.
      </p>
      <form onSubmit={submit} className="mt-4 grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <Label htmlFor="cur-pw">Current password</Label>
          <div className="relative mt-1.5">
            <Input
              id="cur-pw"
              type={show ? "text" : "password"}
              autoComplete="current-password"
              value={current}
              onChange={(e) => setCurrent(e.target.value)}
              className={cn(errors.current && "border-destructive")}
            />
            <button
              type="button"
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-muted-foreground hover:text-foreground"
              onClick={() => setShow((s) => !s)}
              aria-label={show ? "Hide passwords" : "Show passwords"}
            >
              {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          {errors.current && <p className="mt-1 text-xs text-destructive">{errors.current}</p>}
        </div>
        <div>
          <Label htmlFor="new-pw">New password</Label>
          <Input
            id="new-pw"
            type={show ? "text" : "password"}
            autoComplete="new-password"
            value={next}
            onChange={(e) => setNext(e.target.value)}
            className={cn("mt-1.5", errors.next && "border-destructive")}
          />
          {errors.next && <p className="mt-1 text-xs text-destructive">{errors.next}</p>}
        </div>
        <div>
          <Label htmlFor="confirm-pw">Confirm new password</Label>
          <Input
            id="confirm-pw"
            type={show ? "text" : "password"}
            autoComplete="new-password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            className={cn("mt-1.5", errors.confirm && "border-destructive")}
          />
          {errors.confirm && <p className="mt-1 text-xs text-destructive">{errors.confirm}</p>}
        </div>
        <div className="sm:col-span-2">
          <Button type="submit" disabled={saving} className="gradient-primary text-primary-foreground">
            {saving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Updating…
              </>
            ) : (
              "Update password"
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}

function SecurityQuestionForm({
  customerId,
  initialQuestion,
}: {
  customerId: string;
  initialQuestion: string;
}) {
  const [question, setQuestion] = useState(initialQuestion);
  const [answer, setAnswer] = useState("");
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    setQuestion(initialQuestion);
  }, [initialQuestion]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const eMap: Record<string, string> = {};
    if (!question.trim()) eMap.question = "Enter a security question.";
    if (!answer.trim()) eMap.answer = "Enter an answer.";
    setErrors(eMap);
    if (Object.keys(eMap).length > 0) return;
    if (!isAppScriptConfigured()) {
      toast.error("Banking services are unavailable. Please try again later.");
      return;
    }

    setSaving(true);
    try {
      const res = await appScriptRequest("updateCustomer", {
        customerId,
        securityQuestion: question.trim(),
        securityAnswer: answer.trim(),
      });
      if (!res.ok) {
        toast.error(userFacingError(res.error, "Could not update security question."));
        return;
      }
      setAnswer("");
      setErrors({});
      toast.success("Security question updated");
    } catch (err) {
      toast.error(userFacingError(err, "Could not update security question."));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <h4 className="flex items-center gap-2 font-medium">
        <HelpCircle className="h-4 w-4 text-primary" />
        Security question
      </h4>
      <p className="mt-1 text-sm text-muted-foreground">
        Stored on your customer record and used when recovering access.
      </p>
      <form onSubmit={submit} className="mt-4 grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <Label htmlFor="sec-q">Question</Label>
          <Input
            id="sec-q"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="e.g. Name of your first school"
            className={cn("mt-1.5", errors.question && "border-destructive")}
          />
          {errors.question && <p className="mt-1 text-xs text-destructive">{errors.question}</p>}
        </div>
        <div className="sm:col-span-2">
          <Label htmlFor="sec-a">Answer</Label>
          <Input
            id="sec-a"
            type="password"
            autoComplete="off"
            value={answer}
            onChange={(e) => setAnswer(e.target.value)}
            placeholder="Your answer"
            className={cn("mt-1.5", errors.answer && "border-destructive")}
          />
          {errors.answer && <p className="mt-1 text-xs text-destructive">{errors.answer}</p>}
        </div>
        <div className="sm:col-span-2">
          <Button type="submit" disabled={saving} variant="outline">
            {saving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving…
              </>
            ) : (
              "Save security question"
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
