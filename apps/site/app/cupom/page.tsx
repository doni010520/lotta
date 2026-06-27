import { Ticket, Layers, SlidersHorizontal, BarChart3, Sparkles } from "lucide-react";
import { SiteShell } from "@/components/site-shell";
import { FeatureHero } from "@/components/feature-hero";
import { CtaSection } from "@/components/cta-section";
import { SectionHeading, DiffCard } from "@/components/ui";

export const dynamic = "force-static";
export const metadata = { title: "Cupons estratégicos — Lotta" };

const COUPONS = [
  { code: "VOLTA15", rule: "15% off · win-back", color: "border-paprica text-paprica" },
  { code: "BEMVINDO", rule: "1ª compra · R$ 10", color: "border-gema text-[#B07A12]" },
  { code: "FRETE0", rule: "Frete grátis · acima de R$ 50", color: "border-cafe text-cafe" },
];

export default function Page() {
  return (
    <SiteShell>
      <FeatureHero
        badge="Cupons inteligentes"
        title={<>Desconto que converte <span className="text-paprica">sem queimar margem.</span></>}
        subtitle="Crie cupons por porcentagem, valor fixo ou frete grátis — com regras, validade e limite de uso. E deixe a IA sugerir o cupom certo pelo seu ticket médio."
        highlights={[
          { icon: Sparkles, title: "Sugestão por IA", desc: "O cupom certo na medida" },
          { icon: SlidersHorizontal, title: "Regras flexíveis", desc: "Mínimo, validade, limite" },
          { icon: BarChart3, title: "Rastreamento", desc: "Veja o que cada um rendeu" },
        ]}
      />

      {/* Mockup cupons */}
      <section className="mx-auto max-w-3xl px-6 pb-20">
        <div className="grid gap-4 sm:grid-cols-3">
          {COUPONS.map((c) => (
            <div key={c.code} className={`rounded-card border-2 border-dashed bg-white p-5 ${c.color}`}>
              <div className="font-mono text-lg font-bold tracking-wider">{c.code}</div>
              <div className="mt-1 text-xs text-muted">{c.rule}</div>
              <div className="mt-4 inline-block rounded-pill bg-green-50 px-2 py-0.5 text-xs font-medium text-green-700">Ativo</div>
            </div>
          ))}
        </div>
      </section>

      <section className="bg-creme px-6 py-20">
        <div className="mx-auto max-w-content">
          <SectionHeading label="Diferenciais" title={<>Promoção com <span className="text-paprica">cabeça.</span></>} />
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <DiffCard icon={Sparkles} title="Geração por IA">A IA sugere código, tipo e valor com base no seu ticket médio.</DiffCard>
            <DiffCard icon={Layers} title="Criação em lote">Gere centenas de códigos únicos com um prefixo, de uma vez.</DiffCard>
            <DiffCard icon={SlidersHorizontal} title="Regras de uso">Pedido mínimo, validade, limite de usos e 1 por cliente.</DiffCard>
            <DiffCard icon={BarChart3} title="Rastreamento de uso">Acompanhe quantas vezes cada cupom foi usado e o que converteu.</DiffCard>
          </div>
        </div>
      </section>

      <CtaSection variant="paprica" title="Ofereça desconto sem perder dinheiro." subtitle="Cupons estratégicos, gerados e medidos pela Lotta." />
    </SiteShell>
  );
}
