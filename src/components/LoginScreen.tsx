import { useState } from "react";
import { useAuth } from "@/lib/auth";
import { Sparkles, Lock, User as UserIcon, AlertCircle } from "lucide-react";

export function LoginScreen() {
  const { login, register } = useAuth();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const r = mode === "login" ? login(username, password) : register(username, password);
    if (!r.ok) setError(r.error ?? "Terjadi kesalahan.");
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden px-4">
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(80,60,180,0.3),transparent_55%),radial-gradient(ellipse_at_bottom,rgba(16,185,129,0.2),transparent_55%)]" />
        <div className="orb orb-float left-[-10%] top-[-10%] h-[520px] w-[520px] bg-gradient-to-tr from-purple-600/40 via-fuchsia-500/30 to-blue-500/30" />
        <div className="orb orb-float-slow right-[-8%] top-[10%] h-[480px] w-[480px] bg-gradient-to-tr from-blue-500/30 via-cyan-400/30 to-emerald-500/30" />
        <div className="orb orb-float bottom-[-12%] left-[30%] h-[600px] w-[600px] bg-gradient-to-tr from-emerald-500/30 via-teal-400/20 to-violet-500/30" />
      </div>

      <div className="glass glass-sheen grid w-full max-w-5xl grid-cols-1 overflow-hidden rounded-3xl shadow-2xl md:grid-cols-2">
        <div className="relative hidden flex-col justify-between bg-gradient-to-br from-[var(--emerald)]/15 via-transparent to-[var(--electric)]/15 p-10 md:flex">
          <div className="flex flex-col items-center justify-center text-center">
            <img
              src="/logo.png"
              alt="Greenpark Logo"
              className="mx-auto block h-28 w-auto object-contain drop-shadow-[0_8px_24px_rgba(16,185,129,0.35)]"
              onError={(e) => {
                const t = e.currentTarget;
                t.style.display = "none";
                const fb = t.nextElementSibling as HTMLElement | null;
                if (fb) fb.style.display = "inline-block";
              }}
            />
            <span style={{ display: "none" }} className="text-2xl font-extrabold tracking-widest text-[var(--emerald)]">
              GREENPARK
            </span>
          </div>
          <div>
            <p className="inline-flex items-center gap-2 rounded-full border border-[var(--emerald)]/40 bg-[var(--emerald)]/10 px-3 py-1 text-xs font-semibold text-[var(--emerald)]">
              <Sparkles className="h-3 w-3" /> Enterprise KPI Health Dashboard
            </p>
            <h2 className="mt-4 text-3xl font-bold leading-tight tracking-tight">
              Pantau performa <span className="text-[var(--emerald)]">Sales</span>,{" "}
              <span className="text-[var(--electric)]">Marketing</span>, dan Teknik dalam satu layar.
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
              Visibilitas realtime untuk eksekutif Greenpark Group — fintech-grade analytics, zero
              guesswork, full data integrity.
            </p>
          </div>
          <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
            <span className="h-2 w-2 rounded-full bg-[var(--emerald)] pulse-dot" />
            Secure session · v1.0
          </div>
        </div>

        <div className="p-8 md:p-10">
          <div className="mb-6">
            <h1 className="text-2xl font-bold tracking-tight">
              {mode === "login" ? "Selamat Datang Kembali" : "Buat Akun Baru"}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {mode === "login"
                ? "Masuk ke dashboard analitik Greenpark Group."
                : "Daftar akun baru — cukup username & password."}
            </p>
          </div>

          <form onSubmit={submit} className="space-y-4">
            <Field icon={<UserIcon className="h-4 w-4" />} label="Username" value={username} onChange={setUsername} placeholder="admin.dashboard" />
            <Field icon={<Lock className="h-4 w-4" />} label="Password" value={password} onChange={setPassword} placeholder="••••••••" type="password" />

            {error && (
              <div className="flex items-start gap-2 rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-xs text-destructive">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                {error}
              </div>
            )}

            <button
              type="submit"
              className="w-full rounded-lg bg-[var(--emerald)] py-2.5 text-sm font-semibold text-primary-foreground transition-all hover:opacity-90"
            >
              {mode === "login" ? "Masuk" : "Daftar & Masuk"}
            </button>
          </form>

          <button
            onClick={() => { setError(null); setMode(mode === "login" ? "register" : "login"); }}
            className="mt-4 w-full text-center text-xs text-muted-foreground transition hover:text-foreground"
          >
            {mode === "login" ? "Belum punya akun? " : "Sudah punya akun? "}
            <span className="font-semibold text-[var(--emerald)]">
              {mode === "login" ? "Daftar di sini" : "Masuk di sini"}
            </span>
          </button>

          {mode === "login" && (
            <div className="mt-6 rounded-lg border border-dashed bg-muted/30 p-3 text-[11px] text-muted-foreground">
              <span className="font-semibold text-foreground">Master credential:</span>{" "}
              <code className="rounded bg-background px-1 py-0.5">admin.dashboard</code> /{" "}
              <code className="rounded bg-background px-1 py-0.5">bismillah</code>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Field({ icon, label, value, onChange, placeholder, type = "text" }: {
  icon: React.ReactNode; label: string; value: string; onChange: (v: string) => void; placeholder?: string; type?: string;
}) {
  return (
    <label className="block">
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      <div className="relative mt-1.5">
        <div className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">{icon}</div>
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="h-11 w-full rounded-lg border bg-input/40 pl-9 pr-3 text-sm focus:border-[var(--emerald)]/60 focus:outline-none focus:ring-2 focus:ring-[var(--emerald)]/20"
        />
      </div>
    </label>
  );
}
