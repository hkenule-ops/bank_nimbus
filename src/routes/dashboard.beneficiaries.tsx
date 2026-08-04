import { createFileRoute } from "@tanstack/react-router";
import { userFacingError } from "@/lib/utils";
import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/lib/mock-auth";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Users, Trash2, Pencil, Loader2, RefreshCw, Plus } from "lucide-react";
import {
  listBeneficiaries,
  upsertBeneficiary,
  deleteBeneficiary,
  subscribeBeneficiaries,
  type Beneficiary,
} from "@/lib/beneficiaries";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export const Route = createFileRoute("/dashboard/beneficiaries")({
  head: () => ({ meta: [{ title: "Beneficiaries — Bangue Herutage Bank" }] }),
  component: BenPage,
});

function BenPage() {
  const { user } = useAuth();
  const [list, setList] = useState<Beneficiary[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [f, setF] = useState({ name: "", account: "", bank: "Bangue Herutage Bank", nickname: "" });
  const [editOpen, setEditOpen] = useState(false);
  const [editing, setEditing] = useState<Beneficiary | null>(null);
  const [editForm, setEditForm] = useState({ name: "", account: "", bank: "", nickname: "" });
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!user?.customerId) return;
    setLoading(true);
    try {
      const rows = await listBeneficiaries(user.customerId);
      setList(rows);
    } catch (e) {
      toast.error(userFacingError(e, "We couldn't load your saved recipients. Please try again."));
    } finally {
      setLoading(false);
    }
  }, [user?.customerId]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    return subscribeBeneficiaries(() => {
      void load();
    });
  }, [load]);

  if (!user) return null;

  const add = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!f.name.trim() || !f.account.trim()) {
      return toast.error("Fill in the beneficiary details");
    }
    setSaving(true);
    try {
      await upsertBeneficiary({
        customerId: user.customerId,
        name: f.name,
        account: f.account,
        bank: f.bank,
        nickname: f.nickname,
      });
      setF({ name: "", account: "", bank: "Bangue Herutage Bank", nickname: "" });
      toast.success("Beneficiary saved");
      void load();
    } catch (err) {
      toast.error(userFacingError(err, "We couldn't save that recipient. Please try again."));
    } finally {
      setSaving(false);
    }
  };

  const openEdit = (b: Beneficiary) => {
    setEditing(b);
    setEditForm({
      name: b.name,
      account: b.account,
      bank: b.bank,
      nickname: b.nickname || "",
    });
    setEditOpen(true);
  };

  const saveEdit = async () => {
    if (!editing) return;
    setSaving(true);
    try {
      await upsertBeneficiary({
        id: editing.id,
        customerId: user.customerId,
        name: editForm.name,
        account: editForm.account,
        bank: editForm.bank,
        nickname: editForm.nickname,
      });
      toast.success("Beneficiary updated");
      setEditOpen(false);
      void load();
    } catch (err) {
      toast.error(userFacingError(err, "We couldn't save those changes. Please try again."));
    } finally {
      setSaving(false);
    }
  };

  const remove = async (b: Beneficiary) => {
    if (!confirm(`Remove ${b.name}?`)) return;
    setBusyId(b.id);
    try {
      await deleteBeneficiary(b.id, user.customerId);
      toast.success("Beneficiary removed");
      void load();
    } catch (err) {
      toast.error(userFacingError(err, "We couldn't remove that item. Please try again."));
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="grid gap-6 pb-2 lg:grid-cols-3 md:pb-8">
      <div className="space-y-4 lg:col-span-2">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold sm:text-2xl">Beneficiaries</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              
            </p>
          </div>
          <Button variant="outline" size="sm" className="h-10" onClick={() => void load()} disabled={loading}>
            <RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>

        <Card className="divide-y divide-border">
          {loading ? (
            <div className="flex items-center justify-center gap-2 p-12 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading…
            </div>
          ) : list.length === 0 ? (
            <div className="flex flex-col items-center gap-2 p-12 text-sm text-muted-foreground">
            Saved recipients for faster transfers.   <Users className="h-8 w-8 opacity-40" />
              No beneficiaries yet. Add one on the right.
            </div>
          ) : (
            list.map((b) => (
              <div key={b.id} className="flex items-center justify-between gap-3 px-5 py-4">
                <div className="flex min-w-0 items-center gap-3">
                  <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-primary/10 text-primary">
                    <Users className="h-4 w-4" />
                  </div>
                  <div className="min-w-0">
                    <div className="truncate text-sm font-medium">
                      {b.name}
                      {b.nickname ? (
                        <span className="ml-1.5 text-xs font-normal text-muted-foreground">
                          ({b.nickname})
                        </span>
                      ) : null}
                    </div>
                    <div className="truncate text-xs text-muted-foreground">
                      {b.bank} · {b.account}
                    </div>
                  </div>
                </div>
                <div className="flex shrink-0 gap-1">
                  <Button size="icon" variant="ghost" onClick={() => openEdit(b)}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    disabled={busyId === b.id}
                    onClick={() => void remove(b)}
                  >
                    {busyId === b.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Trash2 className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>
            ))
          )}
        </Card>
      </div>

      <Card className="h-fit p-6">
        <h3 className="font-semibold">Add beneficiary</h3>
        <form onSubmit={add} className="mt-4 space-y-3">
          <div>
            <Label>Full name</Label>
            <Input
              className="mt-1.5"
              value={f.name}
              onChange={(e) => setF({ ...f, name: e.target.value })}
            />
          </div>
          <div>
            <Label>Account number</Label>
            <Input
              className="mt-1.5 font-mono"
              value={f.account}
              onChange={(e) => setF({ ...f, account: e.target.value })}
            />
          </div>
          <div>
            <Label>Bank</Label>
            <Input
              className="mt-1.5"
              value={f.bank}
              onChange={(e) => setF({ ...f, bank: e.target.value })}
            />
          </div>
          <div>
            <Label>Nickname (optional)</Label>
            <Input
              className="mt-1.5"
              value={f.nickname}
              onChange={(e) => setF({ ...f, nickname: e.target.value })}
              placeholder="e.g. Mum, Rent"
            />
          </div>
          <Button
            type="submit"
            disabled={saving}
            className="h-11 w-full gradient-primary text-primary-foreground"
          >
            {saving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <>
                <Plus className="mr-2 h-4 w-4" /> Save beneficiary
              </>
            )}
          </Button>
        </form>
      </Card>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-md rounded-xl">
          <DialogHeader>
            <DialogTitle>Edit beneficiary</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Full name</Label>
              <Input
                className="mt-1.5"
                value={editForm.name}
                onChange={(e) => setEditForm((x) => ({ ...x, name: e.target.value }))}
              />
            </div>
            <div>
              <Label>Account number</Label>
              <Input
                className="mt-1.5 font-mono"
                value={editForm.account}
                onChange={(e) => setEditForm((x) => ({ ...x, account: e.target.value }))}
              />
            </div>
            <div>
              <Label>Bank</Label>
              <Input
                className="mt-1.5"
                value={editForm.bank}
                onChange={(e) => setEditForm((x) => ({ ...x, bank: e.target.value }))}
              />
            </div>
            <div>
              <Label>Nickname</Label>
              <Input
                className="mt-1.5"
                value={editForm.nickname}
                onChange={(e) => setEditForm((x) => ({ ...x, nickname: e.target.value }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>
              Cancel
            </Button>
            <Button
              className="gradient-primary text-primary-foreground"
              disabled={saving}
              onClick={() => void saveEdit()}
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
