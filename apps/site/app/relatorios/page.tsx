import { BarChart3, TrendingUp, MessageSquare, Users, Clock, Download } from "lucide-react";
import { SiteShell } from "@/components/site-shell";
import { FeatureHero } from "@/components/feature-hero";
import { CtaSection } from "@/components/cta-section";
import { SectionHeading, DiffCard } from "@/components/ui";

export const dynamic = "force-static";
export const metadata = { title: "Relatórios e analytics — Lotta" };

const KPIS = [
  { l: "Faturamento", v: "R$ 47.2k" },
  { l: "Pedidos", v: "1.847" },
  { l: "Ticket médio", v: "R$ 25,50" },
  { l: "Recompra", v: "42%" },
];
const BARS = [40, 65, 50, 80, 60, 95, 72];
const TOP = [["Smash Bacon", 92], ["Smash Clássico", 74], ["Batata G", 51], ["Combo Família", 38]];

export default function Page() {
  return (
    <SiteShell>
      <FeatureHero
        badge="Relatórios inteligentes"
        title={<>Decisão com número, <span className="text-paprica">não com achismo.</span></>}
        subtitle="Faturamento, ticket médio, recompra, funil de conversão e ranking de produtos — em tempo real. E a IA resume seus feedbacks com ações recomendadas."
        highlights={[
          { icon: TrendingUp, title: "Tempo real", desc: "Tudo que importa numa tela" },
          { icon: BarChart3, title: "Funil de conversão", desc: "Onde o cliente desiste" },
          { icon: MessageSquare, title: "Feedback com IA", desc: "Resumo + ação recomendada" },
        ]}
      />

      {/* Mockup dashboard */}
      <section className="mx-auto max-w-4xl px-6 pb-20">
        <div className="rounded-2xl border border-black/5 bg-white p-5 shadow-dashboard">
          <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
            {KPIS.map((k) => (
              <div key={k.l} className="rounded-card border border-border bg-offwhite p-4">
                <div className="font-mono text-[10px] uppercase tracking-wider text-muted">{k.l}</div>
                <div className="mt-1 font-display text-xl font-bold text-cafe">{k.v}</div>
              </div>
            ))}
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            <div className="rounded-card border border-border p-4">
              <div className="mb-3 text-sm font-semibold text-cafe">Vendas por dia</div>
              <div className="flex h-32 items-end gap-2">
                {BARS.map((h, i) => (
                  <div key={i} className="flex-1 rounded-t bg-paprica/80" style={{ height: `${h}%` }} />
                ))}
              </div>
            </div>
            <div className="rounded-card border border-border p-4">
              <div className="mb-3 text-sm font-semibold text-cafe">Top produtos</div>
              <div className="space-y-2.5">
                {TOP.map(([name, pct]) => (
                  <div key={name as string}>
                    <div className="mb-1 flex justify-between text-xs text-muted"><span>{name}</span><span>{pct}%</span></div>
                    <div className="h-2 overflow-hidden rounded-full bg-creme">
                      <div className="h-full rounded-full bg-gema" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-creme px-6 py-20">
        <div className="mx-auto max-w-content">
          <SectionHeading label="O que você enxerga" title={<>Dados que viram <span className="text-paprica">decisão.</span></>} />
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <DiffCard icon={BarChart3} title="Dashboard em tempo real">Faturamento, pedidos, ticket médio e cancelamento, sempre atualizados.</DiffCard>
            <DiffCard icon={TrendingUp} title="Funil de conversão">Veja onde o cliente desiste: do cardápio ao pedido finalizado.</DiffCard>
            <DiffCard icon={MessageSquare} title="Feedbacks com IA">Resumo do que os clientes dizem + ação recomendada pra melhorar.</DiffCard>
            <DiffCard icon={Users} title="Segmentação RFM">Entenda seus clientes: novatos, fiéis, inativos e em risco.</DiffCard>
            <DiffCard icon={Clock} title="Comparativo de canais">Cardápio, WhatsApp, iFood — saiba de onde vem cada real.</DiffCard>
            <DiffCard icon={Download} title="Exportação CSV">Leve seus dados pra onde quiser, quando quiser.</DiffCard>
          </div>
        </div>
      </section>

      <CtaSection variant="cafe" title="Pare de decidir no escuro." subtitle="Tenha os números do seu delivery na palma da mão." />
    </SiteShell>
  );
}
