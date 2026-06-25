"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  UtensilsCrossed, Settings, ShoppingBag, Users, MessageSquare,
  Megaphone, BarChart3, LogOut, Plug, CreditCard, Star, Ticket,
  Zap, TrendingUp,
} from "lucide-react";
import { createClient } from "@/lib/supabase-browser";
import { useRouter } from "next/navigation";

const ICON_SVG = `<svg width="28" height="28" viewBox="0 0 48 48" fill="none"><defs><linearGradient id="sb" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#FFFFFF"/><stop offset="1" stop-color="#FFE3D8"/></linearGradient><linearGradient id="ss" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#FFE08A"/><stop offset="1" stop-color="#FFB02E"/></linearGradient></defs><path d="M16 19 c-2.7-2.3 2.7-4.6 0-6.9c-2.7-2.3 2.7-4.6 0-6.9" stroke="#fff" stroke-width="2.4" fill="none" stroke-linecap="round" opacity=".62"/><path d="M24 17 c-2.7-2.3 2.7-4.6 0-6.9c-2.7-2.3 2.7-4.6 0-6.9" stroke="#fff" stroke-width="2.4" fill="none" stroke-linecap="round" opacity=".62"/><path d="M32 19 c-2.7-2.3 2.7-4.6 0-6.9c-2.7-2.3 2.7-4.6 0-6.9" stroke="#fff" stroke-width="2.4" fill="none" stroke-linecap="round" opacity=".62"/><path d="M5 22C5.5 33 13 42 24 42C35 42 42.5 33 43 22Z" fill="url(#sb)"/><ellipse cx="24" cy="22" rx="18.5" ry="4.6" fill="url(#ss)"/></svg>`;

const NAV = [
  { href: "/pedidos", label: "Pedidos", icon: ShoppingBag },
  { href: "/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/cardapio", label: "Cardápio", icon: UtensilsCrossed },
  { href: "/clientes", label: "Clientes", icon: Users },
  { href: "/campanhas", label: "Campanhas", icon: Megaphone },
  { href: "/conversas", label: "Conversas", icon: MessageSquare },
  { href: "/fidelidade", label: "Fidelidade", icon: Star },
  { href: "/cupons", label: "Cupons", icon: Ticket },
  { href: "/trafego", label: "Tráfego Pago", icon: TrendingUp },
  { href: "/integracoes", label: "Integrações", icon: Plug },
  { href: "/whatsapp", label: "WhatsApp", icon: Zap },
  { href: "/configuracoes", label: "Configurações", icon: Settings },
  { href: "/configuracoes/pagamento", label: "Pagamento", icon: CreditCard },
];

export function Sidebar({ restaurantName }: { restaurantName: string }) {
  const pathname = usePathname();
  const router = useRouter();

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/auth");
  }

  return (
    <aside className="w-64 bg-cafe border-r border-cafe/10 h-screen flex flex-col">
      <div className="p-4 border-b border-white/10 flex items-center gap-3">
        <div className="w-9 h-9 rounded-[24%] bg-paprica flex items-center justify-center shadow-[0_6px_16px_rgba(229,64,42,.32)]"
          dangerouslySetInnerHTML={{ __html: ICON_SVG }} />
        <div>
          <h2 className="font-display font-bold text-white text-base tracking-tight truncate">{restaurantName}</h2>
          <p className="font-mono text-[10px] text-white/40 tracking-widest uppercase">Lotta</p>
        </div>
      </div>

      <nav className="flex-1 p-2.5 space-y-0.5 overflow-y-auto">
        {NAV.map((item) => (
          <Link key={item.href} href={item.href}
            className={cn("flex items-center gap-3 px-3 py-2 rounded-btn text-sm transition-colors",
              pathname === item.href || (pathname.startsWith(item.href) && item.href.length > 2)
                ? "bg-paprica text-white font-semibold" : "text-white/60 hover:bg-white/5 hover:text-white/90")}>
            <item.icon className="w-4 h-4" />{item.label}
          </Link>
        ))}
      </nav>

      <div className="p-2.5 border-t border-white/10">
        <button onClick={handleLogout} className="flex items-center gap-3 px-3 py-2 rounded-btn text-sm text-white/40 hover:bg-white/5 hover:text-white/60 w-full">
          <LogOut className="w-4 h-4" />Sair
        </button>
      </div>
    </aside>
  );
}
