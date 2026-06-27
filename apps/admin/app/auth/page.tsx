"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { createClient } from "@/lib/supabase-browser";

const LOGO_SVG = `<svg width="48" height="48" viewBox="0 0 48 48" fill="none"><defs><linearGradient id="ab" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#FF6A4D"/><stop offset="1" stop-color="#C32E1C"/></linearGradient><linearGradient id="as" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#FFDD86"/><stop offset="1" stop-color="#FFA51F"/></linearGradient></defs><path d="M16 19 c-2.7-2.3 2.7-4.6 0-6.9c-2.7-2.3 2.7-4.6 0-6.9" stroke="#E5402A" stroke-width="2.4" fill="none" stroke-linecap="round" opacity=".5"/><path d="M24 17 c-2.7-2.3 2.7-4.6 0-6.9c-2.7-2.3 2.7-4.6 0-6.9" stroke="#E5402A" stroke-width="2.4" fill="none" stroke-linecap="round" opacity=".5"/><path d="M32 19 c-2.7-2.3 2.7-4.6 0-6.9c-2.7-2.3 2.7-4.6 0-6.9" stroke="#E5402A" stroke-width="2.4" fill="none" stroke-linecap="round" opacity=".5"/><path d="M5 22C5.5 33 13 42 24 42C35 42 42.5 33 43 22Z" fill="url(#ab)"/><ellipse cx="16.5" cy="30" rx="4" ry="7.5" fill="#fff" opacity=".16" transform="rotate(-20 16.5 30)"/><ellipse cx="24" cy="22" rx="18.5" ry="4.6" fill="url(#as)"/></svg>`;

const FEATURES = [
  "Pedidos em tempo real, do balcão à entrega",
  "WhatsApp e cardápio digital integrados",
  "Campanhas, cupons e fidelidade que vendem",
];

function EyeIcon({ off }: { off: boolean }) {
  return off ? (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M9.88 9.88a3 3 0 1 0 4.24 4.24" /><path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68" /><path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61" /><line x1="2" x2="22" y1="2" y2="22" />
    </svg>
  ) : (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" /><circle cx="12" cy="12" r="3" />
    </svg>
  );
}

export default function AuthPage() {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const router = useRouter();

  async function handleLogin(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault(); setLoading(true); setError("");
    const form = new FormData(e.currentTarget);
    try {
      const supabase = createClient();
      const { error: err } = await supabase.auth.signInWithPassword({ email: form.get("email") as string, password: form.get("password") as string });
      if (err) throw new Error(err.message);
      router.push("/pedidos");
    } catch (err: any) { setError(err.message); } finally { setLoading(false); }
  }

  async function handleRegister(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault(); setLoading(true); setError("");
    const form = new FormData(e.currentTarget);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/auth/register`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: form.get("email"), password: form.get("password"), full_name: form.get("full_name"),
          restaurant_name: form.get("restaurant_name"), restaurant_slug: (form.get("restaurant_name") as string).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") }),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error);
      const supabase = createClient();
      await supabase.auth.setSession(result.session);
      router.push("/onboarding");
    } catch (err: any) { setError(err.message); } finally { setLoading(false); }
  }

  const inputClass =
    "w-full border border-cafe/10 bg-white rounded-btn px-3.5 py-3 text-sm text-body placeholder:text-neutral focus:ring-2 focus:ring-paprica/25 focus:border-paprica outline-none transition-colors";

  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-2">
      {/* ── Left: brand showcase imagery ── */}
      <aside className="relative hidden lg:flex flex-col justify-between overflow-hidden p-12 text-white">
        <Image
          src="https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=1400&q=80"
          alt="Pratos preparados em um restaurante"
          fill
          priority
          sizes="50vw"
          className="object-cover"
        />
        {/* brand gradient overlay for legibility + on-brand warmth */}
        <div className="absolute inset-0 bg-gradient-to-br from-cafe/95 via-paprica-dark/85 to-paprica/65" />
        {/* decorative glow */}
        <div className="absolute -top-24 -right-24 h-72 w-72 rounded-full bg-gema/30 blur-3xl" aria-hidden="true" />

        <div className="relative flex items-center gap-3">
          <span className="grid place-items-center h-11 w-11 rounded-card bg-white/15 backdrop-blur-sm" dangerouslySetInnerHTML={{ __html: LOGO_SVG }} />
          <span className="font-display font-bold text-2xl tracking-tight">Lotta<span className="text-gema">.</span></span>
        </div>

        <div className="relative max-w-md">
          <h2 className="font-display font-bold text-4xl leading-[1.1] tracking-tight">
            A solução que <span className="text-gema">lota</span> o seu delivery.
          </h2>
          <ul className="mt-8 space-y-3.5">
            {FEATURES.map((f) => (
              <li key={f} className="flex items-start gap-3 text-sm text-white/90">
                <svg className="mt-0.5 shrink-0 text-gema" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M20 6 9 17l-5-5" />
                </svg>
                {f}
              </li>
            ))}
          </ul>
        </div>

        <p className="relative font-mono text-xs text-white/70 tracking-wider">
          © {new Date().getFullYear()} Lotta — feito para restaurantes brasileiros
        </p>
      </aside>

      {/* ── Right: auth form ── */}
      <main className="flex min-h-dvh items-center justify-center bg-creme px-4 py-10 lg:min-h-0">
        <div className="w-full max-w-md">
          {/* mobile-only brand header (left panel is hidden < lg) */}
          <div className="lg:hidden text-center mb-8">
            <div className="inline-block mb-2" dangerouslySetInnerHTML={{ __html: LOGO_SVG }} />
            <h1 className="font-display font-bold text-3xl text-cafe tracking-tight">
              Lotta<span className="text-gema-dot">.</span>
            </h1>
            <p className="font-mono text-xs text-muted tracking-wider mt-1">a solução que lota o seu delivery</p>
          </div>

          <div className="bg-white rounded-card shadow-[0_4px_24px_rgba(42,20,16,.08)] border border-cafe/10 p-8">
            <h2 className="font-display text-2xl font-bold text-cafe text-center">{mode === "login" ? "Bem-vindo de volta" : "Criar conta"}</h2>
            <p className="text-center text-sm text-muted mt-1 mb-6">
              {mode === "login" ? "Entre para acessar o seu painel" : "Comece a vender em poucos minutos"}
            </p>

            {error && (
              <div role="alert" aria-live="polite" className="bg-paprica/10 text-paprica text-sm rounded-btn px-3 py-2.5 mb-4">
                {error}
              </div>
            )}

            <form onSubmit={mode === "login" ? handleLogin : handleRegister} className="space-y-4">
              {mode === "register" && (
                <>
                  <div>
                    <label htmlFor="full_name" className="block text-sm font-medium text-body mb-1.5">Seu nome</label>
                    <input id="full_name" name="full_name" autoComplete="name" required className={inputClass} />
                  </div>
                  <div>
                    <label htmlFor="restaurant_name" className="block text-sm font-medium text-body mb-1.5">Nome do restaurante</label>
                    <input id="restaurant_name" name="restaurant_name" autoComplete="organization" required className={inputClass} />
                  </div>
                </>
              )}

              <div>
                <label htmlFor="email" className="block text-sm font-medium text-body mb-1.5">E-mail</label>
                <input id="email" name="email" type="email" inputMode="email" autoComplete="email" required placeholder="voce@restaurante.com.br" className={inputClass} />
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-medium text-body mb-1.5">Senha</label>
                <div className="relative">
                  <input
                    id="password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    autoComplete={mode === "login" ? "current-password" : "new-password"}
                    required
                    minLength={6}
                    className={`${inputClass} pr-11`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
                    className="absolute right-2 top-1/2 -translate-y-1/2 grid place-items-center h-9 w-9 rounded-btn text-muted hover:text-cafe hover:bg-creme transition-colors"
                  >
                    <EyeIcon off={showPassword} />
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-paprica text-white rounded-btn py-3 text-sm font-bold hover:bg-paprica-dark disabled:opacity-60 disabled:cursor-not-allowed transition-colors cursor-pointer"
              >
                {loading ? "Aguarde..." : mode === "login" ? "Entrar" : "Criar conta"}
              </button>
            </form>

            <p className="text-center text-sm text-muted mt-6">
              {mode === "login" ? "Não tem conta?" : "Já tem conta?"}{" "}
              <button
                onClick={() => { setMode(mode === "login" ? "register" : "login"); setError(""); }}
                className="text-paprica font-semibold hover:underline cursor-pointer"
              >
                {mode === "login" ? "Criar conta" : "Entrar"}
              </button>
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
