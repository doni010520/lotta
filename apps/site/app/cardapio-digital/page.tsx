import { ShoppingCart, Link2, Zap, Sparkles, SlidersHorizontal, CreditCard, MapPin, Tag, Search } from "lucide-react";
import { SiteShell } from "@/components/site-shell";
import { FeatureHero } from "@/components/feature-hero";
import { CtaSection } from "@/components/cta-section";
import { SectionHeading, DiffCard } from "@/components/ui";

export const dynamic = "force-static";
export const metadata = { title: "Cardápio digital que vende sozinho — Lotta" };

export default function Page() {
  return (
    <SiteShell>
      <FeatureHero
        badge="Cardápio digital"
        title={<>Seu cardápio digital que <span className="text-paprica">vende sozinho.</span></>}
        subtitle="Link próprio, checkout em 3 toques e sugestões inteligentes que aumentam o ticket — sem comissão por pedido."
        highlights={[
          { icon: CreditCard, title: "Checkout 3 etapas", desc: "Do carrinho ao Pix sem fricção" },
          { icon: Link2, title: "Link próprio", desc: "Compartilhe onde quiser" },
          { icon: Zap, title: "Rápido", desc: "Carrega na hora, no celular" },
        ]}
      />

      {/* Mockup mobile */}
      <section className="mx-auto max-w-sm px-6 pb-20">
        <div className="overflow-hidden rounded-2xl border border-black/5 bg-white shadow-dashboard">
          <div className="bg-paprica px-4 py-4 text-white">
            <div className="font-display text-lg font-bold">Burger Demo</div>
            <div className="flex items-center gap-1.5 text-xs text-white/80"><span className="h-1.5 w-1.5 animate-pulse rounded-full bg-green-300" />Aberto · ~30 min</div>
          </div>
          <div className="p-4">
            <div className="mb-3 flex items-center gap-2 rounded-btn bg-creme px-3 py-2 text-sm text-muted">
              <Search className="h-4 w-4" /> Buscar no cardápio...
            </div>
            <div className="mb-4 flex gap-2 overflow-hidden">
              {["Todos", "Burgers", "Bebidas"].map((c, i) => (
                <span key={c} className={`rounded-pill px-3 py-1 text-xs font-medium ${i === 0 ? "bg-paprica text-white" : "border border-border bg-white text-cafe"}`}>{c}</span>
              ))}
            </div>
            {[{ n: "Smash Bacon", d: "2x smash, cheddar, bacon", p: "R$ 32,90" }, { n: "Smash Clássico", d: "2x smash, cheddar, molho da casa", p: "R$ 28,90" }].map((prod) => (
              <div key={prod.n} className="mb-2 flex gap-3 rounded-card border border-border p-3">
                <div className="flex-1">
                  <div className="text-sm font-medium text-cafe">{prod.n}</div>
                  <div className="text-xs text-muted">{prod.d}</div>
                  <div className="mt-1 text-sm font-semibold text-paprica">{prod.p}</div>
                </div>
                <div className="h-16 w-16 shrink-0 rounded-lg bg-creme" />
              </div>
            ))}
            <div className="mt-3 flex items-center justify-between rounded-btn bg-paprica px-4 py-3 text-sm font-medium text-white">
              <span className="inline-flex items-center gap-2"><ShoppingCart className="h-4 w-4" /> 2 itens</span>
              <span>Ver carrinho · R$ 61,80</span>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-creme px-6 py-20">
        <div className="mx-auto max-w-content">
          <SectionHeading label="Recursos" title={<>Feito pra <span className="text-paprica">converter.</span></>} />
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <DiffCard icon={Sparkles} title="Sugestões inteligentes">Upsell automático no carrinho: "leve também" que aumenta o ticket médio.</DiffCard>
            <DiffCard icon={SlidersHorizontal} title="Opcionais e adicionais">Grupos de opções com mínimo/máximo, ponto da carne, extras e mais.</DiffCard>
            <DiffCard icon={CreditCard} title="Checkout em 3 etapas">Carrinho → endereço → pagamento. Pix online, dinheiro ou maquininha.</DiffCard>
            <DiffCard icon={MapPin} title="Acompanhamento real-time">O cliente vê o pedido andar: confirmado, preparando, saiu pra entrega.</DiffCard>
            <DiffCard icon={Link2} title="Link personalizado">cardapio.lotta/seurestaurante — seu canal próprio, sem marketplace.</DiffCard>
            <DiffCard icon={Tag} title="Tags de marketing">Meta Pixel, GA4 e GTM já integrados pra medir cada conversão.</DiffCard>
          </div>
        </div>
      </section>

      <CtaSection variant="cafe" title="Tenha um cardápio que trabalha por você." subtitle="Monte em minutos e comece a vender no seu próprio canal." />
    </SiteShell>
  );
}
