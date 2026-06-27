import Link from "next/link";
import { BowlIcon } from "./logo";

const FEATURES = [
  { href: "/atendimento-virtual", label: "Atendimento IA" },
  { href: "/cardapio-digital", label: "Cardápio digital" },
  { href: "/trafego-pago", label: "Tráfego pago" },
  { href: "/disparos", label: "Disparos" },
  { href: "/recuperador-de-clientes", label: "Recuperação" },
  { href: "/programa-de-fidelidade", label: "Fidelidade" },
  { href: "/cupom", label: "Cupons" },
  { href: "/relatorios", label: "Relatórios" },
];

export function Footer() {
  return (
    <footer className="bg-cafe-deep text-white/70">
      <div className="mx-auto max-w-content px-6 py-16">
        <div className="grid grid-cols-2 gap-10 md:grid-cols-4">
          {/* Marca */}
          <div className="col-span-2 md:col-span-1">
            <span className="flex items-center gap-2.5">
              <span className="grid h-9 w-9 place-items-center rounded-[24%] bg-paprica">
                <BowlIcon />
              </span>
              <span className="font-display text-xl font-bold text-white">
                Lotta<span className="text-gema-dot">.</span>
              </span>
            </span>
            <p className="mt-4 max-w-xs text-sm leading-relaxed text-white/50">
              A solução que lota o seu delivery. Do pedido à fidelização, sem taxa por pedido.
            </p>
          </div>

          {/* Funcionalidades */}
          <div>
            <h3 className="font-mono text-xs uppercase tracking-widest text-white/40">Funcionalidades</h3>
            <ul className="mt-4 space-y-2 text-sm">
              {FEATURES.map((f) => (
                <li key={f.href}>
                  <Link href={f.href} className="transition-colors hover:text-white">{f.label}</Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Contato */}
          <div>
            <h3 className="font-mono text-xs uppercase tracking-widest text-white/40">Contato</h3>
            <ul className="mt-4 space-y-2 text-sm">
              <li><a href="#" className="transition-colors hover:text-white">Falar com vendas</a></li>
              <li><a href="#" className="transition-colors hover:text-white">Suporte</a></li>
              <li><a href="#" className="transition-colors hover:text-white">WhatsApp</a></li>
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h3 className="font-mono text-xs uppercase tracking-widest text-white/40">Legal</h3>
            <ul className="mt-4 space-y-2 text-sm">
              <li><a href="#" className="transition-colors hover:text-white">Termos de uso</a></li>
              <li><a href="#" className="transition-colors hover:text-white">Privacidade</a></li>
              <li><a href="#" className="transition-colors hover:text-white">LGPD</a></li>
            </ul>
          </div>
        </div>

        <div className="mt-12 border-t border-white/10 pt-6 text-xs text-white/40">
          © {new Date().getFullYear()} Lotta — todos os direitos reservados.
        </div>
      </div>
    </footer>
  );
}
