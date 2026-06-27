import Link from "next/link";
import { Logo } from "./logo";

const LINKS = [
  { href: "/#funcionalidades", label: "Funcionalidades" },
  { href: "/#integracoes", label: "Integrações" },
  { href: "/#diferenciais", label: "Diferenciais" },
  { href: "/#faq", label: "FAQ" },
];

export function Navbar() {
  return (
    <header className="fixed inset-x-0 top-0 z-50 border-b border-black/5 bg-offwhite/90 backdrop-blur-md">
      <nav className="mx-auto flex h-[68px] max-w-content items-center justify-between px-6">
        <Link href="/" aria-label="Lotta — início">
          <Logo />
        </Link>
        <div className="hidden items-center gap-8 text-sm font-medium md:flex">
          {LINKS.map((l) => (
            <a key={l.href} href={l.href} className="text-body/70 transition-colors hover:text-body">
              {l.label}
            </a>
          ))}
        </div>
        <a
          href="#"
          className="rounded-btn bg-paprica px-5 py-2.5 text-sm font-bold text-white shadow-cta transition hover:-translate-y-0.5 hover:bg-paprica-dark"
        >
          Testar grátis →
        </a>
      </nav>
    </header>
  );
}
