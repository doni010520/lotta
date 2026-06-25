"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase-browser";

const LOGO_SVG = `<svg width="48" height="48" viewBox="0 0 48 48" fill="none"><defs><linearGradient id="ab" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#FF6A4D"/><stop offset="1" stop-color="#C32E1C"/></linearGradient><linearGradient id="as" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#FFDD86"/><stop offset="1" stop-color="#FFA51F"/></linearGradient></defs><path d="M16 19 c-2.7-2.3 2.7-4.6 0-6.9c-2.7-2.3 2.7-4.6 0-6.9" stroke="#E5402A" stroke-width="2.4" fill="none" stroke-linecap="round" opacity=".5"/><path d="M24 17 c-2.7-2.3 2.7-4.6 0-6.9c-2.7-2.3 2.7-4.6 0-6.9" stroke="#E5402A" stroke-width="2.4" fill="none" stroke-linecap="round" opacity=".5"/><path d="M32 19 c-2.7-2.3 2.7-4.6 0-6.9c-2.7-2.3 2.7-4.6 0-6.9" stroke="#E5402A" stroke-width="2.4" fill="none" stroke-linecap="round" opacity=".5"/><path d="M5 22C5.5 33 13 42 24 42C35 42 42.5 33 43 22Z" fill="url(#ab)"/><ellipse cx="16.5" cy="30" rx="4" ry="7.5" fill="#fff" opacity=".16" transform="rotate(-20 16.5 30)"/><ellipse cx="24" cy="22" rx="18.5" ry="4.6" fill="url(#as)"/></svg>`;

export default function AuthPage() {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
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

  return (
    <div className="min-h-screen flex items-center justify-center bg-creme px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-block mb-3" dangerouslySetInnerHTML={{ __html: LOGO_SVG }} />
          <h1 className="font-display font-bold text-3xl text-cafe" style={{ letterSpacing: "-0.045em" }}>
            Lotta<span className="text-gema-dot">.</span>
          </h1>
          <p className="font-mono text-xs text-muted tracking-wider mt-1">a solução que lota o seu delivery</p>
        </div>

        <div className="bg-white rounded-card shadow-[0_1px_3px_rgba(0,0,0,.08)] border p-8">
          <h2 className="text-lg font-semibold text-center mb-6">{mode === "login" ? "Entrar" : "Criar conta"}</h2>
          {error && <div className="bg-paprica/10 text-paprica text-sm rounded-btn p-3 mb-4">{error}</div>}

          <form onSubmit={mode === "login" ? handleLogin : handleRegister} className="space-y-4">
            {mode === "register" && (
              <>
                <div><label className="block text-sm font-medium text-body mb-1">Seu nome</label>
                  <input name="full_name" required className="w-full border rounded-btn px-3 py-2.5 text-sm focus:ring-2 focus:ring-paprica/20 focus:border-paprica outline-none" /></div>
                <div><label className="block text-sm font-medium text-body mb-1">Nome do restaurante</label>
                  <input name="restaurant_name" required className="w-full border rounded-btn px-3 py-2.5 text-sm focus:ring-2 focus:ring-paprica/20 focus:border-paprica outline-none" /></div>
              </>
            )}
            <div><label className="block text-sm font-medium text-body mb-1">E-mail</label>
              <input name="email" type="email" required className="w-full border rounded-btn px-3 py-2.5 text-sm focus:ring-2 focus:ring-paprica/20 focus:border-paprica outline-none" /></div>
            <div><label className="block text-sm font-medium text-body mb-1">Senha</label>
              <input name="password" type="password" required minLength={6} className="w-full border rounded-btn px-3 py-2.5 text-sm focus:ring-2 focus:ring-paprica/20 focus:border-paprica outline-none" /></div>
            <button type="submit" disabled={loading}
              className="w-full bg-paprica text-white rounded-btn py-3 text-sm font-bold hover:bg-paprica-dark disabled:opacity-50 transition-colors">
              {loading ? "Aguarde..." : mode === "login" ? "Entrar" : "Criar conta"}</button>
          </form>

          <p className="text-center text-sm text-muted mt-4">
            {mode === "login" ? "Não tem conta?" : "Já tem conta?"}{" "}
            <button onClick={() => setMode(mode === "login" ? "register" : "login")} className="text-paprica font-semibold hover:underline">
              {mode === "login" ? "Criar conta" : "Entrar"}</button>
          </p>
        </div>
      </div>
    </div>
  );
}
