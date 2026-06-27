import { Facebook, Search, MapPin, Sparkles, ShieldCheck, KeyRound, Bot } from "lucide-react";
import { SiteShell } from "@/components/site-shell";
import { FeatureHero } from "@/components/feature-hero";
import { CtaSection } from "@/components/cta-section";
import { SectionHeading, DiffCard } from "@/components/ui";

export const dynamic = "force-static";
export const metadata = { title: "Tráfego pago com IA (Meta + Google) — Lotta" };

const PANELS = [
  { icon: Facebook, name: "Meta Ads", color: "#1877F2", rows: [["ROAS", "4.2x"], ["Investido", "R$ 420"], ["Conversões", "37"]] },
  { icon: Search, name: "Google Ads", color: "#4285F4", rows: [["CPC médio", "R$ 0,84"], ["Cliques", "512"], ["Keywords", "15 locais"]] },
  { icon: MapPin, name: "Meu Negócio", color: "#34A853", rows: [["Avaliações", "4,8 ★"], ["Respostas IA", "100%"], ["Posts/sem", "1"]] },
];

export default function Page() {
  return (
    <SiteShell>
      <FeatureHero
        badge="Tráfego pago com IA"
        title={<>Meta Ads + Google Ads + <span className="text-paprica">Google Meu Negócio.</span></>}
        subtitle="Você não precisa saber nada de tráfego. A IA cria os anúncios, escolhe os melhores produtos e otimiza toda semana — começando com pouco por dia."
        highlights={[
          { icon: Sparkles, title: "Criativos por IA", desc: "3 anúncios novos por semana" },
          { icon: Bot, title: "Otimização automática", desc: "Mantém só o que vende" },
          { icon: MapPin, title: "Google completo", desc: "Busca, mapa e avaliações" },
        ]}
      />

      <section className="mx-auto max-w-4xl px-6 pb-20">
        <div className="rounded-2xl border border-black/5 bg-white p-3 shadow-dashboard">
          <div className="mb-3 flex gap-1.5 px-2 pt-1">
            <span className="h-3 w-3 rounded-full bg-paprica/30" />
            <span className="h-3 w-3 rounded-full bg-gema/40" />
            <span className="h-3 w-3 rounded-full bg-green-400/40" />
          </div>
          <div className="grid gap-3 md:grid-cols-3">
            {PANELS.map((p) => (
              <div key={p.name} className="rounded-card border border-border bg-offwhite p-4">
                <div className="mb-3 flex items-center gap-2">
                  <span className="grid h-8 w-8 place-items-center rounded-lg text-white" style={{ backgroundColor: p.color }}><p.icon className="h-4 w-4" /></span>
                  <span className="text-sm font-bold text-cafe">{p.name}</span>
                </div>
                <div className="space-y-1.5">
                  {p.rows.map(([k, v]) => (
                    <div key={k} className="flex items-center justify-between text-sm">
                      <span className="text-muted">{k}</span>
                      <span className="font-semibold text-cafe">{v}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-creme px-6 py-20">
        <div className="mx-auto max-w-content">
          <SectionHeading label="Diferenciais" title={<>Anúncio que <span className="text-paprica">dá resultado.</span></>} />
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <DiffCard icon={Sparkles} title="Criativos com IA (GPT-4o)">Copy e variações geradas automaticamente a partir dos seus produtos.</DiffCard>
            <DiffCard icon={ShieldCheck} title="CAPI server-side">Conversões enviadas pelo servidor pra Meta otimizar de verdade.</DiffCard>
            <DiffCard icon={KeyRound} title="Keywords por IA">Palavras-chave locais do seu bairro e cidade, escolhidas pela IA.</DiffCard>
            <DiffCard icon={MapPin} title="GMB automático">Posts e respostas de avaliações no Google, no piloto automático.</DiffCard>
          </div>
        </div>
      </section>

      <CtaSection variant="paprica" title="Comece a anunciar sem complicação." subtitle="A IA cuida das campanhas. Você cuida da cozinha." />
    </SiteShell>
  );
}
