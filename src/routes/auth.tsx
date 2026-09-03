import { useRouter } from "@tanstack/react-router";
import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useRef, useState } from "react";
import { ChevronLeft, Eye, EyeOff, Loader2, Lock, Mail, Phone, User } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import taletailsLogo from "@/assets/taletails-logo.jpg";
import { supabase } from "@/integrations/supabase/client";
import { StatusDialog } from "@/components/ui/status-dialog";
import { useAuth } from "@/lib/auth";
import { registerWithPassword, requestEmailOtp, verifyEmailOtp } from "@/lib/auth-otp.functions";

const SITE_URL = "https://taletails-test.lovable.app";
const OG_IMAGE = `${SITE_URL}${taletailsLogo}`;

const title = "เข้าสู่ระบบ / สมัครสมาชิก | Taletails";
const description = "เข้าสู่ระบบ Taletails เพื่อประมูลการ์ดสะสม ติดตามรายการโปรด และจัดการคอลเลกชันของคุณ";

function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
        fill="#4285F4"
      />
      <path
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        fill="#34A853"
      />
      <path
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
        fill="#FBBC05"
      />
      <path
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
        fill="#EA4335"
      />
    </svg>
  );
}

function FacebookIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
    </svg>
  );
}

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title },
      { name: "description", content: description },
      { property: "og:title", content: title },
      { property: "og:description", content: description },
      { property: "og:url", content: `${SITE_URL}/auth` },
      { property: "og:image", content: OG_IMAGE },
      { name: "twitter:image", content: OG_IMAGE },
    ],
    links: [{ rel: "canonical", href: `${SITE_URL}/auth` }],
  }),
  component: AuthPage,
});

const OTP_LENGTH = 6;

function AuthPage() {
  const router = useRouter();
  const { refresh } = useAuth();
  const sendOtp = useServerFn(requestEmailOtp);
  const checkOtp = useServerFn(verifyEmailOtp);
  const register = useServerFn(registerWithPassword);
  const [mode, setMode] = useState<"login" | "register">("login");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [otpStep, setOtpStep] = useState(false);
  const [otpEmail, setOtpEmail] = useState("");
  const [otpPurpose, setOtpPurpose] = useState<"register" | "login">("register");
  const [otp, setOtp] = useState<string[]>(Array(OTP_LENGTH).fill(""));
  const otpRefs = useRef<Array<HTMLInputElement | null>>([]);
  const [resultOpen, setResultOpen] = useState(false);
  const [result, setResult] = useState<{ title: string; description: string }>({
    title: "",
    description: "",
  });

  const errText = (error: unknown) =>
    error instanceof Error ? error.message : "เกิดข้อผิดพลาด กรุณาลองใหม่";

  const startOtp = async (email: string, purpose: "register" | "login", username?: string) => {
    await sendOtp({ data: { email, purpose, ...(username ? { username } : {}) } });
    setOtpEmail(email);
    setOtpPurpose(purpose);
    setOtp(Array(OTP_LENGTH).fill(""));
    setOtpStep(true);
    toast.success("ส่งรหัส OTP แล้ว", { description: `เราได้ส่งรหัส 6 หลักไปที่ ${email}` });
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const email = String(form.get("email") ?? "").trim().toLowerCase();
    const password = String(form.get("password") ?? "");

    if (mode === "register") {
      const confirm = String(form.get("confirmPassword") ?? "");
      if (password !== confirm) {
        toast.error("รหัสผ่านไม่ตรงกัน", { description: "กรุณายืนยันรหัสผ่านให้ตรงกัน" });
        return;
      }
      const firstName = String(form.get("firstName") ?? "").trim();
      const lastName = String(form.get("lastName") ?? "").trim();
      const phone = String(form.get("phone") ?? "").trim();
      const username = `${firstName} ${lastName}`.trim() || (email.split("@")[0] ?? "");

      setIsLoading(true);
      let accountCreated = false;
      try {
        await register({
          data: { email, password, ...(username ? { username } : {}), ...(phone ? { phone } : {}) },
        });
        accountCreated = true;

        // ยังไม่มีโดเมนสำหรับส่งอีเมล จึงข้ามการยืนยัน OTP และเข้าสู่ระบบให้ทันที
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw new Error(error.message);
        await refresh();
        setResult({
          title: "สมัครสมาชิกสำเร็จ",
          description: `ยินดีต้อนรับ ${username || email} เข้าสู่ระบบเรียบร้อยแล้ว`,
        });
        setResultOpen(true);
      } catch (error) {
        toast.error(
          accountCreated ? "สร้างบัญชีแล้ว แต่เข้าสู่ระบบไม่สำเร็จ" : "สมัครสมาชิกไม่สำเร็จ",
          { description: errText(error) },
        );
      } finally {
        setIsLoading(false);
      }
      return;

    }

    setIsLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        if (/email not confirmed/i.test(error.message)) {
          await startOtp(email, "register");
          return;
        }
        throw new Error(
          /invalid login credentials/i.test(error.message)
            ? "อีเมลหรือรหัสผ่านไม่ถูกต้อง"
            : error.message,
        );
      }
      await refresh();
      setResult({
        title: "เข้าสู่ระบบสำเร็จ",
        description: `ยินดีต้อนรับกลับมา ${email}`,
      });
      setResultOpen(true);
    } catch (error) {
      toast.error("เข้าสู่ระบบไม่สำเร็จ", { description: errText(error) });
    } finally {
      setIsLoading(false);
    }
  };

  const handleOtpLogin = async () => {
    const input = document.getElementById("auth-email") as HTMLInputElement | null;
    const email = (input?.value ?? "").trim().toLowerCase();
    if (!email) {
      toast.error("กรุณากรอกอีเมลก่อนขอรหัส OTP");
      return;
    }
    setIsLoading(true);
    try {
      await startOtp(email, "login");
    } catch (error) {
      toast.error("ขอรหัส OTP ไม่สำเร็จ", { description: errText(error) });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSocialLogin = (provider: string) => {
    toast.info(`ยังไม่ได้เปิดใช้งาน ${provider}`, {
      description: "กรุณาเปิดใช้งานผู้ให้บริการนี้ใน Supabase Auth ก่อน แล้วแจ้งให้เชื่อมต่อได้เลย",
    });
  };

  const setOtpDigit = (index: number, value: string) => {
    const digit = value.replace(/\D/g, "").slice(-1);
    setOtp((prev) => {
      const next = [...prev];
      next[index] = digit;
      return next;
    });
    if (digit && index < OTP_LENGTH - 1) otpRefs.current[index + 1]?.focus();
  };

  const handleVerifyOtp = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (otp.some((d) => !d)) {
      toast.error("กรุณากรอกรหัส OTP ให้ครบ 6 หลัก");
      return;
    }
    setIsLoading(true);
    try {
      const { tokenHash } = await checkOtp({ data: { email: otpEmail, code: otp.join("") } });
      const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type: "email" });
      if (error) throw new Error(error.message);
      await refresh();
      setOtpStep(false);
      setMode("login");
      setResult({
        title: otpPurpose === "register" ? "สมัครสมาชิกสำเร็จ" : "เข้าสู่ระบบสำเร็จ",
        description: `ยืนยันอีเมล ${otpEmail} เรียบร้อยแล้ว`,
      });
      setResultOpen(true);
    } catch (error) {
      toast.error("ยืนยันรหัสไม่สำเร็จ", { description: errText(error) });
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendOtp = async () => {
    setIsLoading(true);
    try {
      await startOtp(otpEmail, otpPurpose);
    } catch (error) {
      toast.error("ส่งรหัสใหม่ไม่สำเร็จ", { description: errText(error) });
    } finally {
      setIsLoading(false);
    }
  };

  const goBack = () => {
    if (otpStep) {
      setOtpStep(false);
      return;
    }
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.history.back();
      return;
    }
    void router.navigate({ to: "/" });
  };

  const socialButtons = (
    <div className="grid grid-cols-2 gap-3">
      <Button
        type="button"
        variant="outline"
        onClick={() => handleSocialLogin("Google")}
        disabled={isLoading}
        className="h-11 gap-2 rounded-xl border-border bg-card text-foreground hover:bg-secondary/60 disabled:opacity-70"
      >
        <GoogleIcon className="h-5 w-5" />
        <span className="font-medium">Google</span>
      </Button>
      <Button
        type="button"
        onClick={() => handleSocialLogin("Facebook")}
        disabled={isLoading}
        className="h-11 gap-2 rounded-xl border-0 bg-[#1877F2] text-white hover:bg-[#166fe5] disabled:opacity-70"
      >
        <FacebookIcon className="h-5 w-5" />
        <span className="font-medium">Facebook</span>
      </Button>
    </div>
  );

  return (
    <div className="flex min-h-screen flex-col bg-background sm:items-center sm:justify-center sm:p-6">
      <main className="relative flex w-full flex-1 flex-col overflow-hidden sm:max-w-md sm:flex-none sm:rounded-3xl sm:border sm:border-border sm:bg-card sm:shadow-card">
        {/* Top panel — vibrant fox-orange gradient like the primary button */}
        <div className="relative shrink-0 bg-gradient-ember px-6 pb-10 pt-14 sm:rounded-t-3xl">
          <button
            type="button"
            onClick={goBack}
            aria-label="ย้อนกลับ"
            className="absolute top-4 left-4 inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/30 bg-white/15 text-white shadow-sm backdrop-blur-sm transition-colors hover:bg-white/25"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>

          <h1 className="font-display text-3xl font-bold leading-tight tracking-tight text-white">
            {otpStep
              ? "ยืนยันอีเมลของคุณ"
              : mode === "login"
                ? "\n"
                : "สร้างบัญชีของคุณ"}
          </h1>
          <p className="mt-2 mb-6 text-sm font-medium leading-relaxed text-white/90">
            {otpStep
              ? `กรอกรหัส 6 หลักที่ส่งไปยัง ${otpEmail}`
              : mode === "login"
                ? "\n"
                : "\n"}
          </p>
        </div>

        {/* Form card */}
        <div className="relative z-10 -mt-6 flex flex-1 flex-col rounded-t-3xl bg-card px-5 pb-8 pt-6 sm:mt-0 sm:rounded-none sm:rounded-b-3xl sm:px-6 sm:pt-8">
          {/* Logo centered between orange header and white card */}
          <div className="-mt-14 mb-6 flex justify-center">
            <div className="h-20 w-20 overflow-hidden rounded-full border-4 border-card bg-card shadow-lg">
              <img
                src={taletailsLogo}
                alt="Taletails"
                className="h-full w-full object-cover"
              />
            </div>
          </div>

          {otpStep ? (
            <form onSubmit={handleVerifyOtp} className="space-y-5">
              <div className="flex justify-between gap-2">
                {otp.map((digit, i) => (
                  <input
                    key={i}
                    ref={(el) => {
                      otpRefs.current[i] = el;
                    }}
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    maxLength={1}
                    value={digit}
                    disabled={isLoading}
                    aria-label={`รหัส OTP หลักที่ ${i + 1}`}
                    onChange={(e) => setOtpDigit(i, e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Backspace" && !otp[i] && i > 0) otpRefs.current[i - 1]?.focus();
                    }}
                    className="h-11 w-11 rounded-xl border border-border bg-secondary/40 text-center font-display text-lg font-bold text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/30"
                  />
                ))}
              </div>

              <Button
                type="submit"
                disabled={isLoading}
                className="h-11 w-full rounded-xl bg-gradient-ember font-semibold text-primary-foreground shadow-glow hover:opacity-90 disabled:opacity-70"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>กำลังยืนยัน...</span>
                  </>
                ) : (
                  "ยืนยันรหัส OTP"
                )}
              </Button>

              <button
                type="button"
                disabled={isLoading}
                onClick={() => void handleResendOtp()}
                className="w-full text-center text-sm font-medium text-primary transition-colors hover:underline disabled:opacity-50"
              >
                ส่งรหัสอีกครั้ง
              </button>
            </form>
          ) : (
            <>
              {/* Login / Register segmented control */}
              <div className="mb-6 flex rounded-xl bg-secondary p-1">
                <button
                  type="button"
                  onClick={() => setMode("login")}
                  disabled={isLoading}
                  className={`flex-1 rounded-lg py-2.5 text-sm font-semibold transition-all ${
                    mode === "login"
                      ? "bg-card text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  เข้าสู่ระบบ
                </button>
                <button
                  type="button"
                  onClick={() => setMode("register")}
                  disabled={isLoading}
                  className={`flex-1 rounded-lg py-2.5 text-sm font-semibold transition-all ${
                    mode === "register"
                      ? "bg-card text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  สมัครสมาชิก
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                {mode === "register" && (
                  <>
                    <div className="space-y-1.5">
                      <Label htmlFor="auth-firstname">ชื่อ</Label>
                      <div className="relative">
                        <User className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <Input
                          id="auth-firstname"
                          name="firstName"
                          autoComplete="given-name"
                          placeholder="สมชาย"
                          required
                          maxLength={60}
                          disabled={isLoading}
                          className="h-11 rounded-xl border-border bg-secondary/40 pl-10"
                        />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="auth-lastname">นามสกุล</Label>
                      <div className="relative">
                        <User className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <Input
                          id="auth-lastname"
                          name="lastName"
                          autoComplete="family-name"
                          placeholder="ใจดี"
                          required
                          maxLength={60}
                          disabled={isLoading}
                          className="h-11 rounded-xl border-border bg-secondary/40 pl-10"
                        />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="auth-phone">เบอร์โทร</Label>
                      <div className="relative">
                        <Phone className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <Input
                          id="auth-phone"
                          name="phone"
                          type="tel"
                          inputMode="tel"
                          autoComplete="tel"
                          pattern="[0-9+\-\s]{9,15}"
                          placeholder="08X-XXX-XXXX"
                          required
                          disabled={isLoading}
                          className="h-11 rounded-xl border-border bg-secondary/40 pl-10"
                        />
                      </div>
                    </div>
                  </>
                )}

                <div className="space-y-1.5">
                  <Label htmlFor="auth-email">อีเมล</Label>
                  <div className="relative">
                    <Mail className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="auth-email"
                      type="email"
                      name="email"
                      autoComplete="email"
                      placeholder="you@example.com"
                      required
                      maxLength={255}
                      disabled={isLoading}
                      className="h-11 rounded-xl border-border bg-secondary/40 pl-10 pr-4"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="auth-password">รหัสผ่าน</Label>
                  <div className="relative">
                    <Lock className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="auth-password"
                      type={showPassword ? "text" : "password"}
                      name="password"
                      minLength={8}
                      autoComplete={mode === "login" ? "current-password" : "new-password"}
                      placeholder="••••••••"
                      required
                      disabled={isLoading}
                      className="h-11 rounded-xl border-border bg-secondary/40 pl-10 pr-11"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      disabled={isLoading}
                      aria-label={showPassword ? "ซ่อนรหัสผ่าน" : "แสดงรหัสผ่าน"}
                      className="absolute top-1/2 right-3 -translate-y-1/2 rounded-md p-1 text-muted-foreground transition-colors hover:text-foreground disabled:opacity-50"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                {mode === "register" && (
                  <div className="space-y-1.5">
                    <Label htmlFor="auth-confirm">ยืนยันรหัสผ่าน</Label>
                    <div className="relative">
                      <Lock className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        id="auth-confirm"
                        type={showConfirm ? "text" : "password"}
                        name="confirmPassword"
                        minLength={8}
                        autoComplete="new-password"
                        placeholder="••••••••"
                        required
                        disabled={isLoading}
                        className="h-11 rounded-xl border-border bg-secondary/40 pl-10 pr-11"
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirm((v) => !v)}
                        disabled={isLoading}
                        aria-label={showConfirm ? "ซ่อนรหัสผ่าน" : "แสดงรหัสผ่าน"}
                        className="absolute top-1/2 right-3 -translate-y-1/2 rounded-md p-1 text-muted-foreground transition-colors hover:text-foreground disabled:opacity-50"
                      >
                        {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>
                )}

                {mode === "login" && (
                  <div className="flex items-center justify-between pt-0.5">
                    <label className="flex cursor-pointer items-center gap-2">
                      <input
                        type="checkbox"
                        checked={rememberMe}
                        onChange={(e) => setRememberMe(e.target.checked)}
                        disabled={isLoading}
                        className="h-4 w-4 rounded border-border text-primary focus:ring-primary disabled:opacity-50"
                      />
                      <span className="text-sm text-muted-foreground">จดจำฉัน</span>
                    </label>
                    <button
                      type="button"
                      disabled={isLoading}
                      onClick={() => void handleOtpLogin()}
                      className="text-sm font-medium text-primary transition-colors hover:underline disabled:opacity-50"
                    >
                      เข้าสู่ระบบด้วยรหัส OTP
                    </button>
                  </div>
                )}

                <Button
                  type="submit"
                  disabled={isLoading}
                  className="h-11 w-full rounded-xl bg-gradient-ember font-semibold text-primary-foreground shadow-glow hover:opacity-90 disabled:opacity-70"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>กำลังดำเนินการ...</span>
                    </>
                  ) : mode === "login" ? (
                    "เข้าสู่ระบบ"
                  ) : (
                    "สร้างบัญชี"
                  )}
                </Button>
              </form>

              <div className="my-5 flex items-center gap-3">
                <div className="h-px flex-1 bg-border" />
                <span className="text-xs font-medium text-muted-foreground">หรือดำเนินการต่อด้วย</span>
                <div className="h-px flex-1 bg-border" />
              </div>

              {socialButtons}
            </>
          )}
        </div>
      </main>

      <StatusDialog
        open={resultOpen}
        onOpenChange={setResultOpen}
        tone="success"
        title={result.title}
        description={result.description}
        actionLabel="ไปที่โปรไฟล์"
        onAction={() => void router.navigate({ to: "/profile" })}
        secondaryLabel="กลับหน้าแรก"
        onSecondary={() => void router.navigate({ to: "/" })}
      />
    </div>
  );
}
