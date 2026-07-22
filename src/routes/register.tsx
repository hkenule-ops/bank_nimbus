import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Logo } from "@/components/site/Logo";
import { useAuth } from "@/lib/mock-auth";
import { toast } from "sonner";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { ArrowLeft, ArrowRight, CheckCircle2 } from "lucide-react";

export const Route = createFileRoute("/register")({
  head: () => ({ meta: [{ title: "Open an account — Bangue Herutage Bank" }] }),
  component: RegisterPage,
});

const ACCOUNT_TYPES = ["Savings Account", "Current (Checking) Account", "Business Account", "Corporate Account", "Joint Account", "Student Account", "Fixed Deposit Account", "Foreign Currency Account", "Salary Account", "Investment Account", "Premium/VIP Account"];

function RegisterPage() {
  const [step, setStep] = useState(0);
  const [form, setForm] = useState({
    firstName: "", middleName: "", lastName: "", username: "", email: "", phone: "", altPhone: "",
    dob: "", gender: "", nationality: "", maritalStatus: "", occupation: "", employer: "", income: "",
    address: "", city: "", state: "", country: "", zip: "",
    nationalId: "", ssn: "", passport: "", license: "", tin: "",
    kinName: "", kinRelation: "", kinPhone: "", kinEmail: "", kinAddress: "",
    password: "", confirm: "", securityQuestion: "", securityAnswer: "", terms: false,
    accountType: "Savings Account",
  });
  const [otp, setOtp] = useState("");
  const { register } = useAuth();
  const nav = useNavigate();

  const set = (k: string, v: string | boolean) => setForm((f) => ({ ...f, [k]: v }));

  const steps = ["Personal", "Identity", "Next of kin", "Security", "Verify"];

  const canNext = () => {
    if (step === 0) return form.firstName && form.lastName && form.email && form.phone && form.dob;
    if (step === 3) return form.password && form.password === form.confirm && form.terms;
    if (step === 4) return otp.length === 6;
    return true;
  };

  const next = async () => {
    if (!canNext()) { toast.error("Please complete the required fields"); return; }
    if (step === 4) {
      await register(form);
      toast.success("Account created — welcome to Bangue Herutage");
      nav({ to: "/dashboard" });
      return;
    }
    setStep((s) => s + 1);
  };

  return (
    <div className="min-h-screen gradient-hero">
      <div className="mx-auto max-w-2xl px-4 py-12">
        <div className="mb-8 flex items-center justify-between">
          <Logo />
          <Link to="/" className="text-sm text-muted-foreground hover:text-foreground">Back to home</Link>
        </div>

        <Card className="glass-card p-8">
          <div className="mb-6 flex items-center gap-2">
            {steps.map((s, i) => (
              <div key={s} className="flex flex-1 items-center gap-2">
                <div className={`grid h-7 w-7 shrink-0 place-items-center rounded-full text-xs font-medium ${i < step ? "gradient-primary text-primary-foreground" : i === step ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground"}`}>
                  {i < step ? <CheckCircle2 className="h-4 w-4" /> : i + 1}
                </div>
                {i < steps.length - 1 && <div className={`h-px flex-1 ${i < step ? "bg-primary" : "bg-border"}`} />}
              </div>
            ))}
          </div>

          <h1 className="text-xl font-semibold">{steps[step]}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {step === 0 && "Tell us a little about yourself."}
            {step === 1 && "Identity details are simulated and masked in the app."}
            {step === 2 && "Who should we contact in an emergency?"}
            {step === 3 && "Set a strong password and choose your account type."}
            {step === 4 && "Enter the 6-digit code we emailed you."}
          </p>

          <div className="mt-6 space-y-4">
            {step === 0 && (
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="First name" val={form.firstName} onChange={(v) => set("firstName", v)} />
                <Field label="Middle name" val={form.middleName} onChange={(v) => set("middleName", v)} />
                <Field label="Last name" val={form.lastName} onChange={(v) => set("lastName", v)} />
                <Field label="Username" val={form.username} onChange={(v) => set("username", v)} />
                <Field label="Email" type="email" val={form.email} onChange={(v) => set("email", v)} />
                <Field label="Mobile phone" val={form.phone} onChange={(v) => set("phone", v)} />
                <Field label="Date of birth" type="date" val={form.dob} onChange={(v) => set("dob", v)} />
                <SelectField label="Gender" val={form.gender} onChange={(v) => set("gender", v)} options={["Female", "Male", "Non-binary", "Prefer not to say"]} />
                <Field label="Nationality" val={form.nationality} onChange={(v) => set("nationality", v)} />
                <Field label="Occupation" val={form.occupation} onChange={(v) => set("occupation", v)} />
                <Field label="Residential address" val={form.address} onChange={(v) => set("address", v)} className="sm:col-span-2" />
                <Field label="City" val={form.city} onChange={(v) => set("city", v)} />
                <Field label="Country" val={form.country} onChange={(v) => set("country", v)} />
              </div>
            )}
            {step === 1 && (
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="National ID" val={form.nationalId} onChange={(v) => set("nationalId", v)} />
                <Field label="SSN" val={form.ssn} onChange={(v) => set("ssn", v)} />
                <Field label="Passport (optional)" val={form.passport} onChange={(v) => set("passport", v)} />
                <Field label="Driver's license (optional)" val={form.license} onChange={(v) => set("license", v)} />
                <Field label="Tax ID (optional)" val={form.tin} onChange={(v) => set("tin", v)} className="sm:col-span-2" />
              </div>
            )}
            {step === 2 && (
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Full name" val={form.kinName} onChange={(v) => set("kinName", v)} />
                <Field label="Relationship" val={form.kinRelation} onChange={(v) => set("kinRelation", v)} />
                <Field label="Phone" val={form.kinPhone} onChange={(v) => set("kinPhone", v)} />
                <Field label="Email" val={form.kinEmail} onChange={(v) => set("kinEmail", v)} />
                <Field label="Address" val={form.kinAddress} onChange={(v) => set("kinAddress", v)} className="sm:col-span-2" />
              </div>
            )}
            {step === 3 && (
              <div className="grid gap-4 sm:grid-cols-2">
                <SelectField label="Account type" val={form.accountType} onChange={(v) => set("accountType", v)} options={ACCOUNT_TYPES} className="sm:col-span-2" />
                <Field label="Password" type="password" val={form.password} onChange={(v) => set("password", v)} />
                <Field label="Confirm password" type="password" val={form.confirm} onChange={(v) => set("confirm", v)} />
                <Field label="Security question" val={form.securityQuestion} onChange={(v) => set("securityQuestion", v)} className="sm:col-span-2" />
                <Field label="Security answer" val={form.securityAnswer} onChange={(v) => set("securityAnswer", v)} className="sm:col-span-2" />
                <label className="flex items-start gap-2 sm:col-span-2">
                  <Checkbox checked={form.terms} onCheckedChange={(v) => set("terms", Boolean(v))} className="mt-0.5" />
                  <span className="text-sm text-muted-foreground">I agree to the Terms of Service and Privacy Policy.</span>
                </label>
              </div>
            )}
            {step === 4 && (
              <div className="flex flex-col items-center py-4">
                <p className="mb-4 text-sm text-muted-foreground">Demo code: <span className="font-mono font-semibold text-foreground">123456</span></p>
                <InputOTP maxLength={6} value={otp} onChange={setOtp}>
                  <InputOTPGroup>
                    {[0,1,2,3,4,5].map((i) => <InputOTPSlot key={i} index={i} />)}
                  </InputOTPGroup>
                </InputOTP>
                <p className="mt-4 text-xs text-muted-foreground">Resend available in 60 seconds</p>
              </div>
            )}
          </div>

          <div className="mt-8 flex items-center justify-between">
            <Button variant="ghost" onClick={() => setStep((s) => Math.max(0, s - 1))} disabled={step === 0}>
              <ArrowLeft className="mr-2 h-4 w-4" /> Back
            </Button>
            <Button onClick={next} className="gradient-primary text-primary-foreground">
              {step === 4 ? "Verify & finish" : "Continue"} <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
}

function Field({ label, val, onChange, type = "text", className = "" }: { label: string; val: string; onChange: (v: string) => void; type?: string; className?: string }) {
  return (
    <div className={className}>
      <Label className="text-xs">{label}</Label>
      <Input value={val} onChange={(e) => onChange(e.target.value)} type={type} className="mt-1.5" />
    </div>
  );
}
function SelectField({ label, val, onChange, options, className = "" }: { label: string; val: string; onChange: (v: string) => void; options: string[]; className?: string }) {
  return (
    <div className={className}>
      <Label className="text-xs">{label}</Label>
      <Select value={val} onValueChange={onChange}>
        <SelectTrigger className="mt-1.5"><SelectValue placeholder="Select" /></SelectTrigger>
        <SelectContent>{options.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
      </Select>
    </div>
  );
}
