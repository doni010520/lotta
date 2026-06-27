import { Star, Coins, Award, Wallet, Clock, BellRing } from "lucide-react";
import { SiteShell } from "@/components/site-shell";
import { FeatureHero } from "@/components/feature-hero";
import { CtaSection } from "@/components/cta-section";
import { SectionHeading, DiffCard } from "@/components/ui";

export const dynamic = "force-static";
export const metadata = { title: "Programa de fidelidade e cashback — Lotta" };

const TX = [
  { t: "Pedido #1847", v: "+34 pts", up: true },
  { t: "Resgate — desconto", v: "-200 pts", up: false },
  { t: "Pedido #1802", v: "+28 pts", up: true },
];

export default function Page() {
  return (
    <SiteShell>
      <FeatureHero
        badge="Programa de fidelidade"
        title={<>Cliente que ganha <span className="text-paprica">sempre volta.</span></>}
        subtitle="Pontos ou cashback, com crédito automático a cada pedido, níveis de benefício e resgate direto no checkout. Tudo nativo, sem app à parte."
        highlights={[
          { icon: Coins, title: "Pontos ou cashback", desc: "Você escolhe o modelo" },
          { icon: Award, title: "Níveis", desc: "Benefícios pra quem acumula" },
          { icon: Wallet, title: "Resgate no checkout", desc: "Usa o saldo na hora" },
        ]}
      />

      {/* Mockup cartão fidelidade */}
      <section className="mx-auto max-w-sm px-6 pb-20">
        <div className="overflow-hidden rounded-2xl border border-black/5 bg-white shadow-dashboard">
          <div className="bg-gradient-to-br from-gema to-gema-light p-5 text-cafe">
            <div className="font-mono text-xs uppercase tracking-wider opacity-70">Seu saldo</div>
            <div className="font-display text-4xl font-bold">340 pts</div>
            <div className="mt-3">
              <div className="mb-1 flex justify-between text-xs font-medium"><span>Nível Prata</span><span>340 / 500 → Ouro</span></div>
              <div className="h-2 overflow-hidden rounded-full bg-cafe/15">
                <div className="h-full rounded-full bg-cafe" style={{ width: "68%" }} />
              </div>
            </div>
          </div>
          <div className="p-4">
            <div className="mb-2 text-xs font-mono uppercase tracking-wider text-muted">Histórico</div>
            <div className="space-y-2">
              {TX.map((x) => (
                <div key={x.t} className="flex items-center justify-between text-sm">
                  <span className="text-cafe">{x.t}</span>
                  <span className={x.up ? "font-semibold text-green-600" : "font-semibold text-paprica"}>{x.v}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="bg-creme px-6 py-20">
        <div className="mx-auto max-w-content">
          <SectionHeading label="Diferenciais" title={<>Fidelidade que <span className="text-paprica">funciona sozinha.</span></>} />
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <DiffCard icon={Star} title="Crédito automático">A cada pedido entregue, o cliente ganha pontos ou cashback na hora.</DiffCard>
            <DiffCard icon={Clock} title="Expiração configurável">Defina a validade do saldo pra incentivar o cliente a voltar.</DiffCard>
            <DiffCard icon={Award} title="Níveis de benefício">Bronze, prata, ouro — recompense quem mais acumula ao longo do tempo.</DiffCard>
            <DiffCard icon={BellRing} title="Aviso no WhatsApp">Cliente é notificado do saldo e dos benefícios automaticamente.</DiffCard>
          </div>
        </div>
      </section>

      <CtaSection variant="cafe" title="Transforme cliente em cliente fiel." subtitle="Ative pontos ou cashback e veja a recompra subir." />
    </SiteShell>
  );
}
