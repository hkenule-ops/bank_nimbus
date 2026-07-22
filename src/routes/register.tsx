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
import { AlertTriangle, ArrowLeft, ArrowRight, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/register")({
  head: () => ({ meta: [{ title: "Open an account — Bangue Herutage Bank" }] }),
  component: RegisterPage,
});

const ACCOUNT_TYPES = ["Savings Account", "Current (Checking) Account", "Business Account", "Corporate Account", "Joint Account", "Student Account", "Fixed Deposit Account", "Foreign Currency Account", "Salary Account", "Investment Account", "Premium/VIP Account"];

const SOURCE_OF_FUNDS = ["Salary / employment income", "Business income", "Investments", "Inheritance", "Sale of property", "Savings", "Other"];
const ACCOUNT_PURPOSES = ["Everyday savings", "Investments", "Salary / payroll", "International transfers", "Business operations", "Other"];

export interface KycFile {
  name: string;
  size: number;
  type: string;
}

function readFile(file: File): Promise<KycFile> {
  // Demo-only: we capture file metadata for the form state. In production this
  // should upload to object storage (e.g. Google Drive via Apps Script, or S3)
  // and store the returned URL instead of the raw file, since Google Sheets
  // cannot hold binary data.
  return Promise.resolve({ name: file.name, size: file.size, type: file.type });
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const steps = [
  "Personal",
  "Identity",
  "Compliance",
  "Verify identity",
  "Next of kin",
  "Security",
  "E-signature",
  "Confirm",
] as const;

function RegisterPage() {
  const [step, setStep] = useState(0);
  const [attempted, setAttempted] = useState(false); // whether the user has tried to leave this step at least once
  const [form, setForm] = useState({
    firstName: "", middleName: "", lastName: "", username: "", email: "", phone: "", altPhone: "",
    dob: "", gender: "", nationality: "", maritalStatus: "", occupation: "", employer: "", income: "",
    address: "", city: "", state: "", country: "", zip: "",
    residesInSwitzerland: "",
    nationalId: "", ssn: "", passport: "", license: "", tin: "",
    // --- KYC / AML compliance fields ---
    taxResidenceCountry: "",
    sourceOfFunds: "",
    sourceOfFundsOther: "",
    purposeOfAccount: "",
    expectedActivity: "",
    isUsPerson: "",
    beneficialOwner: false,
    selfieConsent: false,
    kinName: "", kinRelation: "", kinPhone: "", kinEmail: "", kinAddress: "",
    password: "", confirm: "", securityQuestion: "", securityAnswer: "", terms: false,
    accountType: "Savings Account",
    signatureName: "", eSignConsent: false,
  });

  // KYC supporting documents (metadata only in this demo — see readFile above)
  const [passportDoc, setPassportDoc] = useState<KycFile | null>(null);
  const [addressProofDoc, setAddressProofDoc] = useState<KycFile | null>(null);
  const [fundsProofDoc, setFundsProofDoc] = useState<KycFile | null>(null);
  const [selfieDoc, setSelfieDoc] = useState<KycFile | null>(null);

  const [otp, setOtp] = useState("");
  const { register } = useAuth();
  const nav = useNavigate();

  const set = (k: string, v: string | boolean) => setForm((f) => ({ ...f, [k]: v }));

  // Returns the list of missing/invalid field keys for the current step.
  // A field key of "docs:passportDoc" etc. refers to the separate file state.
  const missingFields = (): string[] => {
    const missing: string[] = [];
    const need = (cond: unknown, key: string) => { if (!cond) missing.push(key); };

    if (step === 0) {
      need(form.firstName.trim(), "firstName");
      need(form.lastName.trim(), "lastName");
      need(form.email.trim() && EMAIL_RE.test(form.email), "email");
      need(form.phone.trim(), "phone");
      need(form.dob, "dob");
      need(form.nationality.trim(), "nationality");
      need(form.occupation.trim(), "occupation");
      need(form.address.trim(), "address");
      need(form.city.trim(), "city");
      need(form.country.trim(), "country");
      need(form.residesInSwitzerland, "residesInSwitzerland");
    }
    if (step === 1) {
      need(form.nationalId.trim(), "nationalId");
      need(form.passport.trim(), "passport");
    }
    if (step === 2) {
      need(passportDoc, "docs:passportDoc");
      need(addressProofDoc, "docs:addressProofDoc");
      need(form.tin.trim(), "tin");
      need(form.taxResidenceCountry.trim(), "taxResidenceCountry");
      need(form.sourceOfFunds, "sourceOfFunds");
      if (form.sourceOfFunds === "Other") need(form.sourceOfFundsOther.trim(), "sourceOfFundsOther");
      need(form.purposeOfAccount, "purposeOfAccount");
      need(form.expectedActivity.trim(), "expectedActivity");
      need(form.isUsPerson, "isUsPerson");
      need(form.beneficialOwner, "beneficialOwner");
    }
    if (step === 3) {
      need(selfieDoc, "docs:selfieDoc");
      need(form.selfieConsent, "selfieConsent");
    }
    // step 4 (Next of kin) has no hard requirement
    if (step === 5) {
      need(form.accountType, "accountType");
      need(form.password && form.password.length >= 8, "password");
      need(form.password && form.password === form.confirm, "confirm");
      need(form.securityQuestion.trim(), "securityQuestion");
      need(form.securityAnswer.trim(), "securityAnswer");
      need(form.terms, "terms");
    }
    if (step === 6) {
      const fullName = `${form.firstName} ${form.lastName}`.trim().toLowerCase();
      need(form.signatureName.trim() && form.signatureName.trim().toLowerCase() === fullName, "signatureName");
      need(form.eSignConsent, "eSignConsent");
    }
    if (step === 7) {
      need(otp.length === 6, "otp");
    }
    return missing;
  };

  const isInvalid = (key: string) => attempted && missingFields().includes(key);
  const canNext = () => missingFields().length === 0;

  const next = async () => {
    setAttempted(true);
    const missing = missingFields();
    if (missing.length > 0) {
      toast.error("Please complete all required fields before continuing.");
      return;
    }
    setAttempted(false);
    if (step === steps.length - 1) {
      await register({
        ...form,
        passportDocName: passportDoc?.name ?? "",
        addressProofDocName: addressProofDoc?.name ?? "",
        fundsProofDocName: fundsProofDoc?.name ?? "",
        selfieDocName: selfieDoc?.name ?? "",
      } as never);
      toast.success("Account created — welcome to Bangue Herutage");
      nav({ to: "/dashboard" });
      return;
    }
    setStep((s) => s + 1);
  };

  const back = () => {
    setAttempted(false);
    setStep((s) => Math.max(0, s - 1));
  };

  const isNonResident = form.residesInSwitzerland === "No";
  const fullLegalName = `${form.firstName} ${form.lastName}`.trim();

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
            {step === 2 && "Required for AML / KYC compliance before your account can be verified."}
            {step === 3 && "Online applications require a live identity check."}
            {step === 4 && "Who should we contact in an emergency? (optional)"}
            {step === 5 && "Set a strong password and choose your account type."}
            {step === 6 && "Sign the account opening documents electronically."}
            {step === 7 && "Enter the 6-digit code we emailed you."}
          </p>

          {attempted && missingFields().length > 0 && (
            <div className="mt-4 flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>Please fill in every required field (marked *) before continuing.</span>
            </div>
          )}

          <div className="mt-6 space-y-4">
            {step === 0 && (
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="First name" required val={form.firstName} onChange={(v) => set("firstName", v)} invalid={isInvalid("firstName")} />
                <Field label="Middle name" val={form.middleName} onChange={(v) => set("middleName", v)} />
                <Field label="Last name" required val={form.lastName} onChange={(v) => set("lastName", v)} invalid={isInvalid("lastName")} />
                <Field label="Username" val={form.username} onChange={(v) => set("username", v)} />
                <Field label="Email" type="email" required val={form.email} onChange={(v) => set("email", v)} invalid={isInvalid("email")} />
                <Field label="Mobile phone" required val={form.phone} onChange={(v) => set("phone", v)} invalid={isInvalid("phone")} />
                <Field label="Date of birth" type="date" required val={form.dob} onChange={(v) => set("dob", v)} invalid={isInvalid("dob")} />
                <SelectField label="Gender" val={form.gender} onChange={(v) => set("gender", v)} options={["Female", "Male", "Non-binary", "Prefer not to say"]} />
                <Field label="Nationality" required val={form.nationality} onChange={(v) => set("nationality", v)} invalid={isInvalid("nationality")} />
                <Field label="Occupation" required val={form.occupation} onChange={(v) => set("occupation", v)} invalid={isInvalid("occupation")} />
                <Field label="Employer" val={form.employer} onChange={(v) => set("employer", v)} />
                <Field label="Residential address" required val={form.address} onChange={(v) => set("address", v)} invalid={isInvalid("address")} className="sm:col-span-2" />
                <Field label="City" required val={form.city} onChange={(v) => set("city", v)} invalid={isInvalid("city")} />
                <Field label="Country of residence" required val={form.country} onChange={(v) => set("country", v)} invalid={isInvalid("country")} />
                <SelectField label="Do you currently reside in Switzerland?" required val={form.residesInSwitzerland} onChange={(v) => set("residesInSwitzerland", v)} options={["Yes", "No"]} invalid={isInvalid("residesInSwitzerland")} className="sm:col-span-2" />
                {isNonResident && (
                  <div className="sm:col-span-2 flex items-start gap-2 rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-700 dark:text-amber-400">
                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                    <span>
                      As a non-resident applicant, enhanced due diligence applies: expect closer review of your
                      occupation, wealth, and expected transactions, plus supporting documents for your income and
                      assets. Some banks also require in-branch verification for non-residents — this application
                      will be reviewed by our compliance team before final approval.
                    </span>
                  </div>
                )}
              </div>
            )}
            {step === 1 && (
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="National ID / government ID number" required val={form.nationalId} onChange={(v) => set("nationalId", v)} invalid={isInvalid("nationalId")} />
                <Field label="SSN (if applicable)" val={form.ssn} onChange={(v) => set("ssn", v)} />
                <Field label="Passport number" required val={form.passport} onChange={(v) => set("passport", v)} invalid={isInvalid("passport")} />
                <Field label="Driver's license (optional)" val={form.license} onChange={(v) => set("license", v)} />
              </div>
            )}
            {step === 2 && (
              <div className="grid gap-4 sm:grid-cols-2">
                <FileField
                  label="Passport / government photo ID (upload)"
                  required
                  file={passportDoc}
                  invalid={isInvalid("docs:passportDoc")}
                  onChange={async (f) => setPassportDoc(f ? await readFile(f) : null)}
                  className="sm:col-span-2"
                />
                <FileField
                  label="Proof of address — utility bill or bank statement, less than 3 months old (upload)"
                  required
                  file={addressProofDoc}
                  invalid={isInvalid("docs:addressProofDoc")}
                  onChange={async (f) => setAddressProofDoc(f ? await readFile(f) : null)}
                  className="sm:col-span-2"
                />
                <Field label="Tax Identification Number (TIN)" required val={form.tin} onChange={(v) => set("tin", v)} invalid={isInvalid("tin")} />
                <Field label="Country of tax residence" required val={form.taxResidenceCountry} onChange={(v) => set("taxResidenceCountry", v)} invalid={isInvalid("taxResidenceCountry")} />
                <SelectField label="Source of funds" required val={form.sourceOfFunds} onChange={(v) => set("sourceOfFunds", v)} options={SOURCE_OF_FUNDS} invalid={isInvalid("sourceOfFunds")} />
                {form.sourceOfFunds === "Other" && (
                  <Field label="Describe source of funds" required val={form.sourceOfFundsOther} onChange={(v) => set("sourceOfFundsOther", v)} invalid={isInvalid("sourceOfFundsOther")} />
                )}
                <SelectField label="Purpose of this account" required val={form.purposeOfAccount} onChange={(v) => set("purposeOfAccount", v)} options={ACCOUNT_PURPOSES} invalid={isInvalid("purposeOfAccount")} />
                <Field label="Expected monthly activity (e.g. deposits/withdrawals, approx. amount)" required val={form.expectedActivity} onChange={(v) => set("expectedActivity", v)} invalid={isInvalid("expectedActivity")} className="sm:col-span-2" />
                <FileField
                  label="Proof of source of funds — payslip, employment letter, tax return, or sale agreement (upload, if available)"
                  file={fundsProofDoc}
                  onChange={async (f) => setFundsProofDoc(f ? await readFile(f) : null)}
                  className="sm:col-span-2"
                />
                <SelectField label="Are you a U.S. person for tax purposes? (FATCA)" required val={form.isUsPerson} onChange={(v) => set("isUsPerson", v)} options={["Yes", "No"]} invalid={isInvalid("isUsPerson")} />
                <label className="flex items-start gap-2 sm:col-span-2">
                  <Checkbox checked={form.beneficialOwner} onCheckedChange={(v) => set("beneficialOwner", Boolean(v))} className={cn("mt-0.5", isInvalid("beneficialOwner") && "border-destructive")} />
                  <span className={cn("text-sm text-muted-foreground", isInvalid("beneficialOwner") && "text-destructive")}>
                    I confirm that I am the true beneficial owner of the funds used to open and operate this account. *
                  </span>
                </label>
              </div>
            )}
            {step === 3 && (
              <div className="grid gap-4 sm:grid-cols-2">
                <p className="sm:col-span-2 text-sm text-muted-foreground">
                  Opening an account online requires a live identity check: a clear selfie taken with your smartphone
                  or webcam, matching the photo ID you uploaded. You may also be contacted for a short video
                  verification call before your account is activated.
                </p>
                <FileField
                  label="Live selfie photo (upload)"
                  required
                  file={selfieDoc}
                  invalid={isInvalid("docs:selfieDoc")}
                  onChange={async (f) => setSelfieDoc(f ? await readFile(f) : null)}
                  className="sm:col-span-2"
                  accept="image/*"
                />
                <label className="flex items-start gap-2 sm:col-span-2">
                  <Checkbox checked={form.selfieConsent} onCheckedChange={(v) => set("selfieConsent", Boolean(v))} className={cn("mt-0.5", isInvalid("selfieConsent") && "border-destructive")} />
                  <span className={cn("text-sm text-muted-foreground", isInvalid("selfieConsent") && "text-destructive")}>
                    I consent to selfie-based identity verification and, if requested, a live video verification call. *
                  </span>
                </label>
              </div>
            )}
            {step === 4 && (
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Full name" val={form.kinName} onChange={(v) => set("kinName", v)} />
                <Field label="Relationship" val={form.kinRelation} onChange={(v) => set("kinRelation", v)} />
                <Field label="Phone" val={form.kinPhone} onChange={(v) => set("kinPhone", v)} />
                <Field label="Email" val={form.kinEmail} onChange={(v) => set("kinEmail", v)} />
                <Field label="Address" val={form.kinAddress} onChange={(v) => set("kinAddress", v)} className="sm:col-span-2" />
              </div>
            )}
            {step === 5 && (
              <div className="grid gap-4 sm:grid-cols-2">
                <SelectField label="Account type" required val={form.accountType} onChange={(v) => set("accountType", v)} options={ACCOUNT_TYPES} invalid={isInvalid("accountType")} className="sm:col-span-2" />
                <Field label="Password (min. 8 characters)" type="password" required val={form.password} onChange={(v) => set("password", v)} invalid={isInvalid("password")} />
                <Field label="Confirm password" type="password" required val={form.confirm} onChange={(v) => set("confirm", v)} invalid={isInvalid("confirm")} />
                <Field label="Security question" required val={form.securityQuestion} onChange={(v) => set("securityQuestion", v)} invalid={isInvalid("securityQuestion")} className="sm:col-span-2" />
                <Field label="Security answer" required val={form.securityAnswer} onChange={(v) => set("securityAnswer", v)} invalid={isInvalid("securityAnswer")} className="sm:col-span-2" />
                <label className="flex items-start gap-2 sm:col-span-2">
                  <Checkbox checked={form.terms} onCheckedChange={(v) => set("terms", Boolean(v))} className={cn("mt-0.5", isInvalid("terms") && "border-destructive")} />
                  <span className={cn("text-sm text-muted-foreground", isInvalid("terms") && "text-destructive")}>
                    I agree to the Terms of Service and Privacy Policy. *
                  </span>
                </label>
              </div>
            )}
            {step === 6 && (
              <div className="grid gap-4">
                <p className="text-sm text-muted-foreground">
                  Type your full legal name below to electronically sign your account opening documents, consistent
                  with the e-signature process used for online bank applications.
                </p>
                <Field
                  label={`Type your full name to sign ("${fullLegalName}")`}
                  required
                  val={form.signatureName}
                  onChange={(v) => set("signatureName", v)}
                  invalid={isInvalid("signatureName")}
                />
                <label className="flex items-start gap-2">
                  <Checkbox checked={form.eSignConsent} onCheckedChange={(v) => set("eSignConsent", Boolean(v))} className={cn("mt-0.5", isInvalid("eSignConsent") && "border-destructive")} />
                  <span className={cn("text-sm text-muted-foreground", isInvalid("eSignConsent") && "text-destructive")}>
                    I understand that typing my name above constitutes my legally binding electronic signature. *
                  </span>
                </label>
              </div>
            )}
            {step === 7 && (
              <div className="flex flex-col items-center py-4">
                <p className="mb-4 text-sm text-muted-foreground">Demo code: <span className="font-mono font-semibold text-foreground">123456</span></p>
                <InputOTP maxLength={6} value={otp} onChange={setOtp}>
                  <InputOTPGroup>
                    {[0,1,2,3,4,5].map((i) => <InputOTPSlot key={i} index={i} />)}
                  </InputOTPGroup>
                </InputOTP>
                {isInvalid("otp") && <p className="mt-2 text-xs text-destructive">Enter all 6 digits to continue.</p>}
                <p className="mt-4 text-xs text-muted-foreground">Resend available in 60 seconds</p>
              </div>
            )}
          </div>

          <div className="mt-8 flex items-center justify-between">
            <Button variant="ghost" onClick={back} disabled={step === 0}>
              <ArrowLeft className="mr-2 h-4 w-4" /> Back
            </Button>
            <Button onClick={next} disabled={attempted && !canNext()} className="gradient-primary text-primary-foreground">
              {step === steps.length - 1 ? "Verify & finish" : "Continue"} <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
}

function Field({
  label, val, onChange, type = "text", className = "", required = false, invalid = false,
}: { label: string; val: string; onChange: (v: string) => void; type?: string; className?: string; required?: boolean; invalid?: boolean }) {
  return (
    <div className={className}>
      <Label className="text-xs">{label}{required && <span className="text-destructive"> *</span>}</Label>
      <Input
        value={val}
        onChange={(e) => onChange(e.target.value)}
        type={type}
        className={cn("mt-1.5", invalid && "border-destructive focus-visible:ring-destructive")}
      />
      {invalid && <p className="mt-1 text-xs text-destructive">This field is required.</p>}
    </div>
  );
}
function SelectField({
  label, val, onChange, options, className = "", required = false, invalid = false,
}: { label: string; val: string; onChange: (v: string) => void; options: string[]; className?: string; required?: boolean; invalid?: boolean }) {
  return (
    <div className={className}>
      <Label className="text-xs">{label}{required && <span className="text-destructive"> *</span>}</Label>
      <Select value={val} onValueChange={onChange}>
        <SelectTrigger className={cn("mt-1.5", invalid && "border-destructive ring-1 ring-destructive")}><SelectValue placeholder="Select" /></SelectTrigger>
        <SelectContent>{options.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
      </Select>
      {invalid && <p className="mt-1 text-xs text-destructive">Please make a selection.</p>}
    </div>
  );
}
function FileField({
  label, file, onChange, className = "", required = false, invalid = false, accept = "image/*,application/pdf",
}: { label: string; file: KycFile | null; onChange: (f: File | null) => void; className?: string; required?: boolean; invalid?: boolean; accept?: string }) {
  return (
    <div className={className}>
      <Label className="text-xs">{label}{required && <span className="text-destructive"> *</span>}</Label>
      <Input
        type="file"
        accept={accept}
        className={cn("mt-1.5", invalid && "border-destructive focus-visible:ring-destructive")}
        onChange={(e) => onChange(e.target.files?.[0] ?? null)}
      />
      {file && (
        <p className="mt-1 text-xs text-muted-foreground">
          Attached: {file.name} ({Math.round(file.size / 1024)} KB)
        </p>
      )}
      {invalid && !file && <p className="mt-1 text-xs text-destructive">This document is required.</p>}
    </div>
  );
}