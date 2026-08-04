import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
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
import { AlertTriangle, ArrowLeft, ArrowRight, CheckCircle2, Loader2 } from "lucide-react";
import { cn, userFacingError } from "@/lib/utils";
import { appScriptRequest, isAppScriptConfigured } from "@/lib/appscript";

// Converts ISO 2-letter country code (e.g., 'US') to flag emoji (e.g., '🇺🇸')
function getFlagEmoji(iso2: string): string {
  if (!iso2 || iso2.length !== 2) return "";
  return String.fromCodePoint(
    ...iso2.toUpperCase().split("").map((char) => 127397 + char.charCodeAt(0))
  );
}

// Registration email OTP — uses the shared Apps Script backend (VITE_APP_SCRIPT_URL).
// Local fallback accepts a fixed OTP when the backend URL is not configured.
const FALLBACK_OTP = "1234";
const isFallbackMode = !isAppScriptConfigured();

async function requestEmailOtp(email: string) {
  if (isFallbackMode) {
    await new Promise((r) => setTimeout(r, 500));
    return { ok: true, fallback: true };
  }
  const res = await appScriptRequest<{ sent?: boolean }>("sendOtp", { email });
  if (!res.ok) throw new Error(res.error ?? "Failed to send verification code");
  return res;
}

async function verifyEmailOtp(email: string, code: string) {
  if (isFallbackMode) {
    await new Promise((r) => setTimeout(r, 300));
    return code === FALLBACK_OTP;
  }
  const res = await appScriptRequest<{ valid: boolean }>("verifyOtp", { email, code });
  if (!res.ok) throw new Error(res.error ?? "Failed to verify code");
  // Backend may return { valid } either as data or nested
  const data = res.data as { valid?: boolean } | undefined;
  return Boolean(data?.valid ?? (res as unknown as { valid?: boolean }).valid);
}

export const Route = createFileRoute("/register")({
  head: () => ({ meta: [{ title: "Open an account — Bangue Herutage Bank" }] }),
  component: RegisterPage,
});

const ACCOUNT_TYPES = [
  "Savings Account",
  "Current (Checking) Account",
  "Business Account",
  "Corporate Account",
  "Joint Account",
  "Student Account",
  "Fixed Deposit Account",
  "Foreign Currency Account",
  "Salary Account",
  "Investment Account",
  "Premium/VIP Account",
];

// Country name + ISO2 + international dial code. Full ISO-3166 set
// (197 countries) with their ITU calling codes.
const COUNTRIES: { name: string; iso2: string; dial: string }[] = [
  { name: "Afghanistan", iso2: "AF", dial: "+93" },
  { name: "Albania", iso2: "AL", dial: "+355" },
  { name: "Algeria", iso2: "DZ", dial: "+213" },
  { name: "Andorra", iso2: "AD", dial: "+376" },
  { name: "Angola", iso2: "AO", dial: "+244" },
  { name: "Antigua and Barbuda", iso2: "AG", dial: "+1" },
  { name: "Argentina", iso2: "AR", dial: "+54" },
  { name: "Armenia", iso2: "AM", dial: "+374" },
  { name: "Australia", iso2: "AU", dial: "+61" },
  { name: "Austria", iso2: "AT", dial: "+43" },
  { name: "Azerbaijan", iso2: "AZ", dial: "+994" },
  { name: "Bahamas", iso2: "BS", dial: "+1" },
  { name: "Bahrain", iso2: "BH", dial: "+973" },
  { name: "Bangladesh", iso2: "BD", dial: "+880" },
  { name: "Barbados", iso2: "BB", dial: "+1" },
  { name: "Belarus", iso2: "BY", dial: "+375" },
  { name: "Belgium", iso2: "BE", dial: "+32" },
  { name: "Belize", iso2: "BZ", dial: "+501" },
  { name: "Benin", iso2: "BJ", dial: "+229" },
  { name: "Bhutan", iso2: "BT", dial: "+975" },
  { name: "Bolivia", iso2: "BO", dial: "+591" },
  { name: "Bosnia and Herzegovina", iso2: "BA", dial: "+387" },
  { name: "Botswana", iso2: "BW", dial: "+267" },
  { name: "Brazil", iso2: "BR", dial: "+55" },
  { name: "Brunei", iso2: "BN", dial: "+673" },
  { name: "Bulgaria", iso2: "BG", dial: "+359" },
  { name: "Burkina Faso", iso2: "BF", dial: "+226" },
  { name: "Burundi", iso2: "BI", dial: "+257" },
  { name: "Cabo Verde", iso2: "CV", dial: "+238" },
  { name: "Cambodia", iso2: "KH", dial: "+855" },
  { name: "Cameroon", iso2: "CM", dial: "+237" },
  { name: "Canada", iso2: "CA", dial: "+1" },
  { name: "Central African Republic", iso2: "CF", dial: "+236" },
  { name: "Chad", iso2: "TD", dial: "+235" },
  { name: "Chile", iso2: "CL", dial: "+56" },
  { name: "China", iso2: "CN", dial: "+86" },
  { name: "Colombia", iso2: "CO", dial: "+57" },
  { name: "Comoros", iso2: "KM", dial: "+269" },
  { name: "Congo (Republic)", iso2: "CG", dial: "+242" },
  { name: "Congo (DRC)", iso2: "CD", dial: "+243" },
  { name: "Costa Rica", iso2: "CR", dial: "+506" },
  { name: "Croatia", iso2: "HR", dial: "+385" },
  { name: "Cuba", iso2: "CU", dial: "+53" },
  { name: "Cyprus", iso2: "CY", dial: "+357" },
  { name: "Czech Republic", iso2: "CZ", dial: "+420" },
  { name: "Denmark", iso2: "DK", dial: "+45" },
  { name: "Djibouti", iso2: "DJ", dial: "+253" },
  { name: "Dominica", iso2: "DM", dial: "+1" },
  { name: "Dominican Republic", iso2: "DO", dial: "+1" },
  { name: "Ecuador", iso2: "EC", dial: "+593" },
  { name: "Egypt", iso2: "EG", dial: "+20" },
  { name: "El Salvador", iso2: "SV", dial: "+503" },
  { name: "Equatorial Guinea", iso2: "GQ", dial: "+240" },
  { name: "Eritrea", iso2: "ER", dial: "+291" },
  { name: "Estonia", iso2: "EE", dial: "+372" },
  { name: "Eswatini", iso2: "SZ", dial: "+268" },
  { name: "Ethiopia", iso2: "ET", dial: "+251" },
  { name: "Fiji", iso2: "FJ", dial: "+679" },
  { name: "Finland", iso2: "FI", dial: "+358" },
  { name: "France", iso2: "FR", dial: "+33" },
  { name: "Gabon", iso2: "GA", dial: "+241" },
  { name: "Gambia", iso2: "GM", dial: "+220" },
  { name: "Georgia", iso2: "GE", dial: "+995" },
  { name: "Germany", iso2: "DE", dial: "+49" },
  { name: "Ghana", iso2: "GH", dial: "+233" },
  { name: "Greece", iso2: "GR", dial: "+30" },
  { name: "Grenada", iso2: "GD", dial: "+1" },
  { name: "Guatemala", iso2: "GT", dial: "+502" },
  { name: "Guinea", iso2: "GN", dial: "+224" },
  { name: "Guinea-Bissau", iso2: "GW", dial: "+245" },
  { name: "Guyana", iso2: "GY", dial: "+592" },
  { name: "Haiti", iso2: "HT", dial: "+509" },
  { name: "Honduras", iso2: "HN", dial: "+504" },
  { name: "Hungary", iso2: "HU", dial: "+36" },
  { name: "Iceland", iso2: "IS", dial: "+354" },
  { name: "India", iso2: "IN", dial: "+91" },
  { name: "Indonesia", iso2: "ID", dial: "+62" },
  { name: "Iran", iso2: "IR", dial: "+98" },
  { name: "Iraq", iso2: "IQ", dial: "+964" },
  { name: "Ireland", iso2: "IE", dial: "+353" },
  { name: "Israel", iso2: "IL", dial: "+972" },
  { name: "Italy", iso2: "IT", dial: "+39" },
  { name: "Ivory Coast", iso2: "CI", dial: "+225" },
  { name: "Jamaica", iso2: "JM", dial: "+1" },
  { name: "Japan", iso2: "JP", dial: "+81" },
  { name: "Jordan", iso2: "JO", dial: "+962" },
  { name: "Kazakhstan", iso2: "KZ", dial: "+7" },
  { name: "Kenya", iso2: "KE", dial: "+254" },
  { name: "Kiribati", iso2: "KI", dial: "+686" },
  { name: "Kosovo", iso2: "XK", dial: "+383" },
  { name: "Kuwait", iso2: "KW", dial: "+965" },
  { name: "Kyrgyzstan", iso2: "KG", dial: "+996" },
  { name: "Laos", iso2: "LA", dial: "+856" },
  { name: "Latvia", iso2: "LV", dial: "+371" },
  { name: "Lebanon", iso2: "LB", dial: "+961" },
  { name: "Lesotho", iso2: "LS", dial: "+266" },
  { name: "Liberia", iso2: "LR", dial: "+231" },
  { name: "Libya", iso2: "LY", dial: "+218" },
  { name: "Liechtenstein", iso2: "LI", dial: "+423" },
  { name: "Lithuania", iso2: "LT", dial: "+370" },
  { name: "Luxembourg", iso2: "LU", dial: "+352" },
  { name: "Madagascar", iso2: "MG", dial: "+261" },
  { name: "Malawi", iso2: "MW", dial: "+265" },
  { name: "Malaysia", iso2: "MY", dial: "+60" },
  { name: "Maldives", iso2: "MV", dial: "+960" },
  { name: "Mali", iso2: "ML", dial: "+223" },
  { name: "Malta", iso2: "MT", dial: "+356" },
  { name: "Marshall Islands", iso2: "MH", dial: "+692" },
  { name: "Mauritania", iso2: "MR", dial: "+222" },
  { name: "Mauritius", iso2: "MU", dial: "+230" },
  { name: "Mexico", iso2: "MX", dial: "+52" },
  { name: "Micronesia", iso2: "FM", dial: "+691" },
  { name: "Moldova", iso2: "MD", dial: "+373" },
  { name: "Monaco", iso2: "MC", dial: "+377" },
  { name: "Mongolia", iso2: "MN", dial: "+976" },
  { name: "Montenegro", iso2: "ME", dial: "+382" },
  { name: "Morocco", iso2: "MA", dial: "+212" },
  { name: "Mozambique", iso2: "MZ", dial: "+258" },
  { name: "Myanmar", iso2: "MM", dial: "+95" },
  { name: "Namibia", iso2: "NA", dial: "+264" },
  { name: "Nauru", iso2: "NR", dial: "+674" },
  { name: "Nepal", iso2: "NP", dial: "+977" },
  { name: "Netherlands", iso2: "NL", dial: "+31" },
  { name: "New Zealand", iso2: "NZ", dial: "+64" },
  { name: "Nicaragua", iso2: "NI", dial: "+505" },
  { name: "Niger", iso2: "NE", dial: "+227" },
  { name: "Nigeria", iso2: "NG", dial: "+234" },
  { name: "North Korea", iso2: "KP", dial: "+850" },
  { name: "North Macedonia", iso2: "MK", dial: "+389" },
  { name: "Norway", iso2: "NO", dial: "+47" },
  { name: "Oman", iso2: "OM", dial: "+968" },
  { name: "Pakistan", iso2: "PK", dial: "+92" },
  { name: "Palau", iso2: "PW", dial: "+680" },
  { name: "Palestine", iso2: "PS", dial: "+970" },
  { name: "Panama", iso2: "PA", dial: "+507" },
  { name: "Papua New Guinea", iso2: "PG", dial: "+675" },
  { name: "Paraguay", iso2: "PY", dial: "+595" },
  { name: "Peru", iso2: "PE", dial: "+51" },
  { name: "Philippines", iso2: "PH", dial: "+63" },
  { name: "Poland", iso2: "PL", dial: "+48" },
  { name: "Portugal", iso2: "PT", dial: "+351" },
  { name: "Qatar", iso2: "QA", dial: "+974" },
  { name: "Romania", iso2: "RO", dial: "+40" },
  { name: "Russia", iso2: "RU", dial: "+7" },
  { name: "Rwanda", iso2: "RW", dial: "+250" },
  { name: "Saint Kitts and Nevis", iso2: "KN", dial: "+1" },
  { name: "Saint Lucia", iso2: "LC", dial: "+1" },
  { name: "Saint Vincent and the Grenadines", iso2: "VC", dial: "+1" },
  { name: "Samoa", iso2: "WS", dial: "+685" },
  { name: "San Marino", iso2: "SM", dial: "+378" },
  { name: "Sao Tome and Principe", iso2: "ST", dial: "+239" },
  { name: "Saudi Arabia", iso2: "SA", dial: "+966" },
  { name: "Senegal", iso2: "SN", dial: "+221" },
  { name: "Serbia", iso2: "RS", dial: "+381" },
  { name: "Seychelles", iso2: "SC", dial: "+248" },
  { name: "Sierra Leone", iso2: "SL", dial: "+232" },
  { name: "Singapore", iso2: "SG", dial: "+65" },
  { name: "Slovakia", iso2: "SK", dial: "+421" },
  { name: "Slovenia", iso2: "SI", dial: "+386" },
  { name: "Solomon Islands", iso2: "SB", dial: "+677" },
  { name: "Somalia", iso2: "SO", dial: "+252" },
  { name: "South Africa", iso2: "ZA", dial: "+27" },
  { name: "South Korea", iso2: "KR", dial: "+82" },
  { name: "South Sudan", iso2: "SS", dial: "+211" },
  { name: "Spain", iso2: "ES", dial: "+34" },
  { name: "Sri Lanka", iso2: "LK", dial: "+94" },
  { name: "Sudan", iso2: "SD", dial: "+249" },
  { name: "Suriname", iso2: "SR", dial: "+597" },
  { name: "Sweden", iso2: "SE", dial: "+46" },
  { name: "Switzerland", iso2: "CH", dial: "+41" },
  { name: "Syria", iso2: "SY", dial: "+963" },
  { name: "Taiwan", iso2: "TW", dial: "+886" },
  { name: "Tajikistan", iso2: "TJ", dial: "+992" },
  { name: "Tanzania", iso2: "TZ", dial: "+255" },
  { name: "Thailand", iso2: "TH", dial: "+66" },
  { name: "Timor-Leste", iso2: "TL", dial: "+670" },
  { name: "Togo", iso2: "TG", dial: "+228" },
  { name: "Tonga", iso2: "TO", dial: "+676" },
  { name: "Trinidad and Tobago", iso2: "TT", dial: "+1" },
  { name: "Tunisia", iso2: "TN", dial: "+216" },
  { name: "Turkey", iso2: "TR", dial: "+90" },
  { name: "Turkmenistan", iso2: "TM", dial: "+993" },
  { name: "Tuvalu", iso2: "TV", dial: "+688" },
  { name: "Uganda", iso2: "UG", dial: "+256" },
  { name: "Ukraine", iso2: "UA", dial: "+380" },
  { name: "United Arab Emirates", iso2: "AE", dial: "+971" },
  { name: "United Kingdom", iso2: "GB", dial: "+44" },
  { name: "United States", iso2: "US", dial: "+1" },
  { name: "Uruguay", iso2: "UY", dial: "+598" },
  { name: "Uzbekistan", iso2: "UZ", dial: "+998" },
  { name: "Vanuatu", iso2: "VU", dial: "+678" },
  { name: "Vatican City", iso2: "VA", dial: "+379" },
  { name: "Venezuela", iso2: "VE", dial: "+58" },
  { name: "Vietnam", iso2: "VN", dial: "+84" },
  { name: "Yemen", iso2: "YE", dial: "+967" },
  { name: "Zambia", iso2: "ZM", dial: "+260" },
  { name: "Zimbabwe", iso2: "ZW", dial: "+263" },
];

export interface KycFile {
  name: string;
  size: number;
  type: string;
}

function readFile(file: File): Promise<KycFile> {
  // Local fallback: we capture file metadata for the form state. In production this
  // should upload to object storage (e.g. Google Drive via Apps Script, or S3)
  // and store the returned URL instead of the raw file, since Google Sheets
  // cannot hold binary data.
  return Promise.resolve({ name: file.name, size: file.size, type: file.type });
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const steps = ["Personal", "Identity", "Security", "Verify"] as const;
const OTP_LENGTH = 4;
const RESEND_COOLDOWN = 60; // seconds

/** Ambient drifting background blobs, matching the hero/login treatment */
function AmbientBlobs() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
      <div className="absolute -left-20 top-0 h-72 w-72 animate-float-slow rounded-full bg-[#c9aa54]/20 blur-3xl" />
      <div className="absolute -right-16 top-1/3 h-80 w-80 animate-float-slower rounded-full bg-primary/20 blur-3xl" />
      <div className="absolute bottom-0 left-1/4 h-64 w-64 animate-float-slow rounded-full bg-[#c9aa54]/10 blur-3xl" style={{ animationDelay: "2s" }} />
    </div>
  );
}

function RegisterPage() {
  const [step, setStep] = useState(0);
  const [attempted, setAttempted] = useState(false); // whether the user has tried to leave this step at least once
  const [shake, setShake] = useState(false);
  const [form, setForm] = useState({
    firstName: "", middleName: "", lastName: "", username: "", email: "",
    phoneCountry: "US", phone: "",
    dob: "", gender: "", nationality: "", occupation: "", employer: "",
    address: "", city: "", country: "",
    residesInSwitzerland: "",
    password: "", confirm: "", securityQuestion: "", securityAnswer: "", terms: false,
    accountType: "Savings Account",
  });

// KYC supporting documents (stored as file metadata during local preview — see readFile above)
  const [idDoc, setIdDoc] = useState<KycFile | null>(null);
  const [selfieDoc, setSelfieDoc] = useState<KycFile | null>(null);

  // Email OTP verification
  const [otp, setOtp] = useState("");
  const [otpSending, setOtpSending] = useState(false);
  const [otpVerifying, setOtpVerifying] = useState(false);
  const [otpError, setOtpError] = useState("");
  const [cooldown, setCooldown] = useState(0);
  const otpSentForEmail = useRef<string | null>(null);

  const { register } = useAuth();
  const nav = useNavigate();

  const sendOtp = async () => {
    setOtpSending(true);
    setOtpError("");
    try {
      await requestEmailOtp(form.email);
      otpSentForEmail.current = form.email;
      setCooldown(RESEND_COOLDOWN);
      toast.success(
        `Verification code sent to ${form.email}`
      );
    } catch (err) {
      toast.error(userFacingError(err, "We couldn't send a verification code. Please try again."));
    } finally {
      setOtpSending(false);
    }
  };

  // Send the OTP automatically the first time the Verify step is reached.
  useEffect(() => {
    if (step === 3 && otpSentForEmail.current !== form.email) {
      void sendOtp();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  // Resend cooldown ticker
  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setInterval(() => setCooldown((c) => Math.max(0, c - 1)), 1000);
    return () => clearInterval(t);
  }, [cooldown]);

  const set = (k: string, v: string | boolean) => setForm((f) => ({ ...f, [k]: v }));

  const phoneDialCode = COUNTRIES.find((c) => c.iso2 === form.phoneCountry)?.dial ?? "+1";

  // When the residence country changes, default the phone country to match
  // (the user can still pick a different phone country manually afterwards).
  const setCountry = (name: string) => {
    setForm((f) => {
      const match = COUNTRIES.find((c) => c.name === name);
      return { ...f, country: name, phoneCountry: match ? match.iso2 : f.phoneCountry };
    });
  };

  // Returns the list of missing/invalid field keys for the current step.
  // A field key of "docs:idDoc" etc. refers to the separate file state.
  const missingFields = (): string[] => {
    const missing: string[] = [];
    const need = (cond: unknown, key: string) => { if (!cond) missing.push(key); };

    if (step === 0) {
      need(form.firstName.trim(), "firstName");
      need(form.lastName.trim(), "lastName");
      need(form.username.trim(), "username");
      need(form.email.trim() && EMAIL_RE.test(form.email), "email");
      need(form.phoneCountry, "phoneCountry");
      need(form.phone.trim(), "phone");
      need(form.dob, "dob");
      need(form.gender, "gender");
      need(form.nationality.trim(), "nationality");
      need(form.occupation.trim(), "occupation");
      need(form.employer.trim(), "employer");
      need(form.address.trim(), "address");
      need(form.city.trim(), "city");
      need(form.country.trim(), "country");
      need(form.residesInSwitzerland, "residesInSwitzerland");
    }
    if (step === 1) {
      need(idDoc, "docs:idDoc");
      need(selfieDoc, "docs:selfieDoc");
    }
    if (step === 2) {
      need(form.accountType, "accountType");
      need(form.password && form.password.length >= 8, "password");
      need(form.password && form.password === form.confirm, "confirm");
      need(form.securityQuestion.trim(), "securityQuestion");
      need(form.securityAnswer.trim(), "securityAnswer");
      need(form.terms, "terms");
    }
    if (step === 3) {
      need(otp.length === OTP_LENGTH, "otp");
    }
    return missing;
  };

  const isInvalid = (key: string) => attempted && missingFields().includes(key);
  const canNext = () => missingFields().length === 0;

  const triggerShake = () => {
    setShake(true);
    setTimeout(() => setShake(false), 400);
  };

  const next = async () => {
    setAttempted(true);
    const missing = missingFields();
    if (missing.length > 0) {
      toast.error("Please complete all required fields before continuing.");
      triggerShake();
      return;
    }
    setAttempted(false);

    if (step === steps.length - 1) {
      // Final step: confirm the emailed code with the backend, then create the account.
      setOtpVerifying(true);
      setOtpError("");
      try {
        const valid = await verifyEmailOtp(form.email, otp);
        if (!valid) {
          setOtpError("That code is incorrect or has expired. Please try again.");
          triggerShake();
          return;
        }
      } catch (err) {
        setOtpError(err instanceof Error ? err.message : "Could not verify code");
        triggerShake();
        return;
      } finally {
        setOtpVerifying(false);
      }

      await register({
        ...form,
        phone: `${phoneDialCode}${form.phone}`,
        idDocName: idDoc?.name ?? "",
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

  return (
    <div className="relative min-h-[100dvh] gradient-hero flex items-start justify-center overflow-x-hidden overflow-y-auto sm:items-center">
      <div className="absolute inset-0 animate-gradient-shift opacity-50" />
      <AmbientBlobs />

      <div className="relative mx-auto w-full max-w-2xl px-3 py-6 sm:px-4 sm:py-12">
        <div className="mb-8 flex items-center justify-between animate-step-in">
          <Logo className="animate-float" />
          <Link to="/" className="text-sm text-muted-foreground transition-colors hover:text-foreground">Back to home</Link>
        </div>

        <Card className={cn("glass-card p-3 transition-transform duration-300 sm:p-8", shake && "animate-shake")}>
          <div className="mb-5 flex items-center justify-center gap-1 overflow-x-auto sm:mb-6 sm:gap-2">
            {steps.map((s, i) => (
              <div key={s} className="flex items-center gap-1.5 sm:gap-2">
                <div
                  className={cn(
                    "grid h-7 w-7 shrink-0 place-items-center rounded-full text-xs font-medium transition-colors duration-300",
                    i < step ? "gradient-primary text-primary-foreground" : i === step ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground"
                  )}
                >
                  {i < step ? <CheckCircle2 className="h-4 w-4 animate-pop-check" /> : i + 1}
                </div>
                {i < steps.length - 1 && (
                  <div className="relative h-px w-8 overflow-hidden bg-border sm:w-14">
                    <div
                      className="absolute inset-y-0 left-0 bg-primary transition-all duration-500 ease-out"
                      style={{ width: i < step ? "100%" : "0%" }}
                    />
                  </div>
                )}
              </div>
            ))}
          </div>

          <div key={step} className="animate-step-in">
            <h1 className="text-xl font-semibold">{steps[step]}</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {step === 0 && "Tell us a little about yourself."}
              {step === 1 && "Upload your passport or government ID and a photo of yourself."}
              {step === 2 && "Set a strong password and choose your account type."}
              {step === 3 && `Enter the ${OTP_LENGTH}-digit code we emailed to ${form.email || "your email"}.`}
            </p>

            {attempted && missingFields().length > 0 && (
              <div className="mt-4 flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive animate-step-in">
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
                  <Field label="Username" required val={form.username} onChange={(v) => set("username", v)} invalid={isInvalid("username")} />
                  <Field label="Email" type="email" required val={form.email} onChange={(v) => set("email", v)} invalid={isInvalid("email")} />
                  <PhoneField
                    label="Mobile phone"
                    required
                    countryIso2={form.phoneCountry}
                    onCountryChange={(v) => set("phoneCountry", v)}
                    val={form.phone}
                    onChange={(v) => set("phone", v)}
                    invalid={isInvalid("phone") || isInvalid("phoneCountry")}
                  />
                  <Field label="Date of birth" type="date" required val={form.dob} onChange={(v) => set("dob", v)} invalid={isInvalid("dob")} />
                  <SelectField
                    label="Gender"
                    required
                    val={form.gender}
                    onChange={(v) => set("gender", v)}
                    options={["Female", "Male", "Non-binary", "Prefer not to say"]}
                    invalid={isInvalid("gender")}
                  />
                  <SelectField
                    label="Nationality"
                    required
                    val={form.nationality}
                    onChange={(v) => set("nationality", v)}
                    options={COUNTRIES.map((c) => c.name)}
                    invalid={isInvalid("nationality")}
                  />
                  <Field label="Occupation" required val={form.occupation} onChange={(v) => set("occupation", v)} invalid={isInvalid("occupation")} />
                  <Field label="Employer" required val={form.employer} onChange={(v) => set("employer", v)} invalid={isInvalid("employer")} />
                  <Field label="Residential address" required val={form.address} onChange={(v) => set("address", v)} invalid={isInvalid("address")} className="sm:col-span-2" />
                  <Field label="City" required val={form.city} onChange={(v) => set("city", v)} invalid={isInvalid("city")} />
                  <SelectField
                    label="Country of residence"
                    required
                    val={form.country}
                    onChange={setCountry}
                    options={COUNTRIES.map((c) => c.name)}
                    invalid={isInvalid("country")}
                  />
                  <SelectField label="Do you currently reside in Switzerland?" required val={form.residesInSwitzerland} onChange={(v) => set("residesInSwitzerland", v)} options={["Yes", "No"]} invalid={isInvalid("residesInSwitzerland")} className="sm:col-span-2" />
                  {isNonResident && (
                    <div className="sm:col-span-2 flex items-start gap-2 rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-700 dark:text-amber-400 animate-step-in">
                      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                      <span>
                        As a non-resident applicant, enhanced due diligence applies: expect closer review of your
                        occupation, wealth, and expected transactions. This application will be reviewed by our
                        compliance team before final approval.
                      </span>
                    </div>
                  )}
                </div>
              )}
              {step === 1 && (
                <div className="grid gap-4 sm:grid-cols-2">
                  <FileField
                    label="Passport / government-issued ID (upload)"
                    required
                    file={idDoc}
                    invalid={isInvalid("docs:idDoc")}
                    onChange={async (f) => setIdDoc(f ? await readFile(f) : null)}
                    className="sm:col-span-2"
                  />
                  <FileField
                    label="Photo of yourself (upload)"
                    required
                    file={selfieDoc}
                    invalid={isInvalid("docs:selfieDoc")}
                    onChange={async (f) => setSelfieDoc(f ? await readFile(f) : null)}
                    className="sm:col-span-2"
                    accept="image/*"
                  />
                </div>
              )}
              {step === 2 && (
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
              {step === 3 && (
                <div className="flex flex-col items-center py-4">
                  {isFallbackMode && (
                    <p className="mb-4 text-sm text-muted-foreground">
                      Use code <span className="font-mono font-semibold text-foreground">{FALLBACK_OTP}</span> when backend verification services are unavailable.
                    </p>
                  )}
                  <InputOTP
                    maxLength={OTP_LENGTH}
                    value={otp}
                    onChange={(v) => { setOtp(v); setOtpError(""); }}
                  >
                    <InputOTPGroup className={cn(shake && "animate-shake")}>
                      {Array.from({ length: OTP_LENGTH }).map((_, i) => (
                        <InputOTPSlot key={i} index={i} className={cn("transition-shadow duration-300", otpError && "border-destructive")} />
                      ))}
                    </InputOTPGroup>
                  </InputOTP>
                  {isInvalid("otp") && !otpError && (
                    <p className="mt-2 text-xs text-destructive animate-step-in">Enter all {OTP_LENGTH} digits to continue.</p>
                  )}
                  {otpError && <p className="mt-2 text-xs text-destructive animate-step-in">{otpError}</p>}
                  <div className="mt-4 flex items-center gap-1 text-xs text-muted-foreground">
                    {otpSending ? (
                      <span className="flex items-center gap-1"><Loader2 className="h-3 w-3 animate-spin" /> Sending code…</span>
                    ) : cooldown > 0 ? (
                      <span>Resend available in {cooldown}s</span>
                    ) : (
                      <button type="button" onClick={sendOtp} className="text-primary underline underline-offset-2 transition-opacity hover:opacity-80">
                        Resend code
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="mt-6 flex flex-col-reverse gap-2 sm:mt-8 sm:flex-row sm:items-center sm:justify-between">
            <Button variant="ghost" onClick={back} disabled={step === 0} className="h-11 w-full justify-center transition-transform duration-200 hover:-translate-x-0.5 disabled:hover:translate-x-0 sm:w-auto sm:justify-start">
              <ArrowLeft className="mr-2 h-4 w-4" /> Back
            </Button>
            <Button
              onClick={next}
              disabled={(attempted && !canNext()) || otpVerifying}
              className={cn(
                "shimmer-sweep h-11 w-full justify-center gradient-primary text-primary-foreground transition-transform duration-200 active:scale-95 sm:w-auto",
                !otpVerifying && "hover:scale-[1.03]"
              )}
            >
              {otpVerifying ? (
                <>Verifying… <Loader2 className="ml-2 h-4 w-4 animate-spin" /></>
              ) : (
                <>{step === steps.length - 1 ? "Create account" : "Continue"} <ArrowRight className="ml-2 h-4 w-4 animate-bounce-x" /></>
              )}
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
        className={cn("mt-1.5 transition-shadow duration-300 focus:shadow-[0_0_0_4px_rgba(201,170,84,0.15)]", invalid && "border-destructive focus-visible:ring-destructive")}
      />
      {invalid && <p className="mt-1 text-xs text-destructive animate-step-in">This field is required.</p>}
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
        <SelectTrigger className={cn("mt-1.5 transition-shadow duration-300", invalid && "border-destructive ring-1 ring-destructive")}><SelectValue placeholder="Select" /></SelectTrigger>
        <SelectContent>{options.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
      </Select>
      {invalid && <p className="mt-1 text-xs text-destructive animate-step-in">Please make a selection.</p>}
    </div>
  );
}

function PhoneField({
  label, val, onChange, countryIso2, onCountryChange, className = "", required = false, invalid = false,
}: {
  label: string; val: string; onChange: (v: string) => void;
  countryIso2: string; onCountryChange: (iso2: string) => void;
  className?: string; required?: boolean; invalid?: boolean;
}) {
  const selectedCountry = COUNTRIES.find((c) => c.iso2 === countryIso2);

  return (
    <div className={className}>
      <Label className="text-xs">{label}{required && <span className="text-destructive"> *</span>}</Label>
      <div className="mt-1.5 flex gap-2">
        <Select value={countryIso2} onValueChange={onCountryChange}>
          <SelectTrigger className={cn("w-[110px] shrink-0 transition-shadow duration-300", invalid && "border-destructive ring-1 ring-destructive")}>
            <SelectValue placeholder="Code">
              {selectedCountry && (
                <span className="flex items-center gap-1.5">
                  <span className="text-base leading-none">{getFlagEmoji(selectedCountry.iso2)}</span>
                  <span>{selectedCountry.dial}</span>
                </span>
              )}
            </SelectValue>
          </SelectTrigger>
          <SelectContent className="max-h-60">
            {COUNTRIES.map((c) => (
              <SelectItem key={c.iso2} value={c.iso2}>
                <span className="flex items-center gap-2">
                  <span className="text-base leading-none">{getFlagEmoji(c.iso2)}</span>
                  <span className="font-medium">{c.dial}</span>
                  <span className="text-xs text-muted-foreground truncate max-w-[120px]">{c.name}</span>
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Input
          value={val}
          onChange={(e) => onChange(e.target.value.replace(/[^\d\s-]/g, ""))}
          type="tel"
          inputMode="tel"
          placeholder="xxx xxx xxx"
          className={cn("flex-1 transition-shadow duration-300 focus:shadow-[0_0_0_4px_rgba(201,170,84,0.15)]", invalid && "border-destructive focus-visible:ring-destructive")}
        />
      </div>
      {invalid && <p className="mt-1 text-xs text-destructive animate-step-in">A valid phone number is required.</p>}
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
        className={cn("mt-1.5 transition-shadow duration-300", invalid && "border-destructive focus-visible:ring-destructive")}
        onChange={(e) => onChange(e.target.files?.[0] ?? null)}
      />
      {file && (
        <p className="mt-1 text-xs text-muted-foreground animate-step-in">
          Attached: {file.name} ({Math.round(file.size / 1024)} KB)
        </p>
      )}
      {invalid && !file && <p className="mt-1 text-xs text-destructive animate-step-in">This document is required.</p>}
    </div>
  );
}