import { useState } from "react";
import type { FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { BookOpenCheck, Eye, EyeOff, Flame, Timer, AlertCircle } from "lucide-react";
import { signIn, signUp, useApp } from "../store/store";
import { Button, Field, Input, Logo } from "../components/ui";
import { useToast } from "../components/overlays";
import { cx } from "../lib/utils";

type Mode = "signin" | "signup";

export default function AuthPage() {
  const { status } = useApp();
  const nav = useNavigate();
  const toast = useToast();
  const [mode, setMode] = useState<Mode>("signin");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [fieldErr, setFieldErr] = useState<{ name?: string; email?: string; password?: string }>({});

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (busy) return;
    const fe: typeof fieldErr = {};
    if (mode === "signup" && name.trim().length < 2) fe.name = "Please enter your name.";
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) fe.email = "Enter a valid email address.";
    if (password.length < 6) fe.password = "At least 6 characters.";
    setFieldErr(fe);
    setFormError(null);
    if (Object.keys(fe).length > 0) return;
    setBusy(true);
    const res = mode === "signup" ? await signUp(name, email, password) : await signIn(email, password);
    setBusy(false);
    if (!res.ok) {
      setFormError(res.error);
      return;
    }
    toast({ title: mode === "signup" ? "Welcome to StudyNest 🌱" : "Welcome back", desc: mode === "signup" ? "Let's set up your study space." : "Your nest is right where you left it." });
    nav("/dashboard");
  };

  if (status === "boot") {
    return (
      <div className="min-h-screen flex items-center justify-center app-bg">
        <div className="skeleton w-8 h-8 rounded-full" />
      </div>
    );
  }

  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[1.05fr_1fr] app-bg">
      {/* Brand panel */}
      <div className="hidden lg:flex flex-col justify-between bg-sidebar text-white p-10 xl:p-14 relative overflow-hidden">
        <svg className="absolute -right-24 -top-24 w-[480px] h-[480px] opacity-[0.07]" viewBox="0 0 200 200" aria-hidden="true">
          {[80, 62, 44, 26].map((r) => (
            <circle key={r} cx="100" cy="100" r={r} fill="none" stroke="white" strokeWidth="1.5" />
          ))}
        </svg>
        <Logo size={34} />
        <div className="relative">
          <h1 className="font-display font-extrabold text-[42px] xl:text-[50px] leading-[1.05] tracking-tight text-white">
            Your study life,
            <br />
            in one <span className="text-[#e9c46a]">nest</span>.
          </h1>
          <p className="text-sidebarink text-[15px] mt-4 max-w-md leading-relaxed">
            Organize your syllabus, track focused sessions, build streaks and hit your goals — whether it's JEE, NEET, UPSC or your next interview.
          </p>
          <ul className="mt-8 space-y-4">
            {[
              { icon: BookOpenCheck, title: "Structure any syllabus", body: "Subjects → chapters with priorities and target dates." },
              { icon: Timer, title: "Honest time tracking", body: "A timestamp-accurate timer that survives tab switches." },
              { icon: Flame, title: "Streaks that mean something", body: "Built from real study days — never inflated." },
            ].map((f) => (
              <li key={f.title} className="flex items-start gap-3.5">
                <span className="w-9 h-9 rounded-xl bg-white/8 border border-white/10 text-[#e9c46a] inline-flex items-center justify-center shrink-0">
                  <f.icon className="w-4.5 h-4.5" aria-hidden="true" />
                </span>
                <div>
                  <p className="font-bold text-[14.5px] text-white">{f.title}</p>
                  <p className="text-[13px] text-sidebarink mt-0.5">{f.body}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
        <p className="text-[12px] text-sidebarink/70 relative">Local-first demo · connect Supabase for cloud sync (see README)</p>
      </div>

      {/* Form panel */}
      <div className="flex items-center justify-center px-4 py-10 lg:py-0">
        <div className="w-full max-w-md anim-in">
          <div className="lg:hidden mb-8 flex justify-center">
            <Logo size={34} />
          </div>
          <div className="card p-6 sm:p-8">
            <h2 className="font-display font-extrabold text-[24px] tracking-tight text-ink">
              {mode === "signin" ? "Welcome back" : "Create your nest"}
            </h2>
            <p className="text-sm text-mute mt-1">
              {mode === "signin" ? "Pick up exactly where you left off." : "Free, private, stored in your browser."}
            </p>

            <div className="flex gap-1 bg-raise border border-line rounded-xl p-1 mt-6" role="tablist" aria-label="Authentication mode">
              {(["signin", "signup"] as Mode[]).map((m) => (
                <button
                  key={m}
                  role="tab"
                  aria-selected={mode === m}
                  onClick={() => {
                    setMode(m);
                    setFormError(null);
                    setFieldErr({});
                  }}
                  className={cx(
                    "flex-1 h-9 rounded-lg text-[13.5px] font-bold transition-all",
                    mode === m ? "bg-surface shadow-sm border border-line text-ink" : "text-mute hover:text-ink"
                  )}
                >
                  {m === "signin" ? "Sign in" : "Create account"}
                </button>
              ))}
            </div>

            {formError && (
              <div className="flex items-start gap-2.5 bg-rustwash border border-rust/25 rounded-xl px-3.5 py-3 mt-4" role="alert">
                <AlertCircle className="w-4.5 h-4.5 text-rust shrink-0 mt-0.5" aria-hidden="true" />
                <p className="text-[13px] font-medium text-rust leading-snug">{formError}</p>
              </div>
            )}

            <form onSubmit={submit} className="mt-5 space-y-4" noValidate>
              {mode === "signup" && (
                <Field label="Name" error={fieldErr.name}>
                  <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Asha Verma" autoComplete="name" invalid={!!fieldErr.name} />
                </Field>
              )}
              <Field label="Email" error={fieldErr.email}>
                <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" autoComplete="email" invalid={!!fieldErr.email} />
              </Field>
              <Field label="Password" error={fieldErr.password} hint={mode === "signup" ? "Minimum 6 characters." : undefined}>
                <div className="relative">
                  <Input
                    type={showPw ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    autoComplete={mode === "signup" ? "new-password" : "current-password"}
                    invalid={!!fieldErr.password}
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPw((s) => !s)}
                    aria-label={showPw ? "Hide password" : "Show password"}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-faint hover:text-ink p-1.5 rounded-md transition-colors"
                  >
                    {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </Field>
              <Button type="submit" size="lg" className="w-full" loading={busy}>
                {mode === "signin" ? "Sign in" : "Create account"}
              </Button>
            </form>
          </div>
          <p className="text-center text-xs text-faint mt-5 leading-relaxed max-w-sm mx-auto">
            Demo authentication keeps your data on this device. For production, StudyNest ships with a Supabase-ready data layer.
          </p>
        </div>
      </div>
    </div>
  );
}
