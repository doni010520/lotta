import { ShoppingCart, UserX, Sparkles, Gift, Clock, RotateCcw } from "lucide-react";
import { SiteShell } from "@/components/site-shell";
import { FeatureHero } from "@/components/feature-hero";
import { CtaSection } from "@/components/cta-section";
import { SectionHeading, DiffCard } from "@/components/ui";

export const dynamic = "force-static";
export const metadata = { title: "Recuperador de clientes — Lotta" };

const STEPS = [
  { n: "01", title: "Cliente abandona", desc: "Some no meio do pedido ou para de comprar.", dot: "bg-paprica" },
  { n: "02", title: "A Lotta detecta", desc: "Carrinho abandonado (30 min) e inativos por RFM.", dot: "bg-gema" },
  { n: "03", title: "WhatsApp na medida", desc: "Mensagem de volta — com cupom, se você quiser.", dot: "bg-paprica" },
  { n: "04", title: "Cliente volta", desc: "Novo pedido, sem você levantar um dedo.", dot: "bg-green-500" },
];

export default function Page() {
  return (
    <SiteShell>
      <FeatureHero
        badge="Recuperação inteligente"
        title={<>Cliente sumiu? <span className="text-paprica">A gente traz de volta.</span></>}
        subtitle="O Lotta identifica carrinho abandonado e clientes inativos e dispara a mensagem certa no automático — com oferta de retorno opcional."
        highlights={[
          { icon: ShoppingCart, title: "Carrinho abandonado", desc: "Lembra quem quase comprou" },
          { icon: UserX, title: "Inativos", desc: "Reativa quem sumiu" },
          { icon: Gift, title: "Oferta de retorno", desc: "Cupom anexado na hora" },
        ]}
      />

      {/* Fluxo */}
      <section className="bg-cafe px-6 py-20">
        <div className="mx-auto max-w-2xl">
          <div className="space-y-4">
            {STEPS.map((s) => (
              <div key={s.n} className="flex items-start gap-4 rounded-card border border-white/10 bg-white/[0.03] p-5">
                <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-full font-display font-bold text-white ${s.dot}`}>{s.n}</span>
                <div>
                  <div className="font-display font-bold text-white">{s.title}</div>
                  <div className="mt-1 text-sm text-white/70">{s.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-creme px-6 py-20">
        <div className="mx-auto max-w-content">
          <SectionHeading label="Diferenciais" title={<>Recuperação no <span className="text-paprica">piloto automático.</span></>} />
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <DiffCard icon={RotateCcw} title="Régua configurável">Você define gatilhos, textos e o intervalo entre mensagens.</DiffCard>
            <DiffCard icon={Clock} title="Cooldown inteligente">Sem incomodar: respeita o tempo mínimo entre cada contato.</DiffCard>
            <DiffCard icon={Sparkles} title="Oferta na medida">Anexe um cupom de retorno automaticamente na mensagem de win-back.</DiffCard>
          </div>
        </div>
      </section>

      <CtaSection variant="paprica" title="Pare de perder cliente pra concorrência." subtitle="Deixe a Lotta trazer quem sumiu de volta pro seu delivery." />
    </SiteShell>
  );
}
