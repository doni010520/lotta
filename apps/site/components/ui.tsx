import type { LucideIcon } from "lucide-react";
import { Reveal } from "./reveal";

/** Rótulo mono + título display + subtítulo, centralizado */
export function SectionHeading({
  label,
  title,
  subtitle,
  light = false,
}: {
  label?: string;
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  light?: boolean;
}) {
  return (
    <Reveal className="mx-auto mb-12 max-w-2xl text-center">
      {label && (
        <div className={`mb-3 font-mono text-xs uppercase tracking-[2px] ${light ? "text-white/40" : "text-paprica"}`}>
          {label}
        </div>
      )}
      <h2 className={`font-display text-3xl font-bold tracking-tight md:text-[40px] ${light ? "text-white" : "text-cafe"}`}>
        {title}
      </h2>
      {subtitle && <p className={`mt-4 text-base md:text-lg ${light ? "text-white/70" : "text-muted"}`}>{subtitle}</p>}
    </Reveal>
  );
}

/** Card de diferencial: ícone + título + descrição */
export function DiffCard({ icon: Icon, title, children }: { icon: LucideIcon; title: string; children: React.ReactNode }) {
  return (
    <Reveal className="rounded-card border border-black/5 bg-white p-7 hover:-translate-y-0.5 hover:border-paprica/30 hover:shadow-card-hover">
      <div className="mb-4 grid h-11 w-11 place-items-center rounded-card bg-paprica/10 text-paprica">
        <Icon className="h-5 w-5" />
      </div>
      <h3 className="font-display text-base font-bold text-cafe">{title}</h3>
      <p className="mt-1.5 text-sm leading-relaxed text-muted">{children}</p>
    </Reveal>
  );
}

/** Item de destaque (linha de highlights do hero) */
export function Highlight({ icon: Icon, title, children }: { icon: LucideIcon; title: string; children?: React.ReactNode }) {
  return (
    <Reveal className="flex items-start gap-3 rounded-card border border-black/5 bg-white p-4">
      <div className="grid h-9 w-9 shrink-0 place-items-center rounded-card bg-paprica/10 text-paprica">
        <Icon className="h-4 w-4" />
      </div>
      <div>
        <p className="text-sm font-bold text-cafe">{title}</p>
        {children && <p className="mt-0.5 text-xs text-muted">{children}</p>}
      </div>
    </Reveal>
  );
}

/** Badge mono em pílula (cabeçalho de hero) */
export function Badge({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-2 rounded-pill border border-paprica/15 bg-paprica/[0.08] px-4 py-1.5 font-mono text-xs font-medium uppercase tracking-wide text-paprica">
      {children}
    </span>
  );
}
