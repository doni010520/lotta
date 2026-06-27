import { Sparkles, Users, Gauge, Send, CalendarClock, ShieldOff } from "lucide-react";
import { SiteShell } from "@/components/site-shell";
import { FeatureHero } from "@/components/feature-hero";
import { CtaSection } from "@/components/cta-section";
import { SectionHeading, DiffCard } from "@/components/ui";

export const dynamic = "force-static";
export const metadata = { title: "Disparos em massa no WhatsApp — Lotta" };

export default function Page() {
  return (
    <SiteShell>
      <FeatureHero
        badge="Disparos inteligentes"
        title={<>Mensagens personalizadas que <span className="text-paprica">vendem.</span></>}
        subtitle="Escolha o segmento, escreva uma vez e deixe a IA variar a mensagem pra cada cliente — sem cara de spam e sem tomar bloqueio."
        highlights={[
          { icon: Sparkles, title: "IA varia o texto", desc: "Cada cliente recebe diferente" },
          { icon: Users, title: "Segmentação RFM", desc: "Manda pro público certo" },
          { icon: Gauge, title: "Ritmo seguro", desc: "1 msg/s pra proteger o número" },
        ]}
      />

      {/* Mockup campanha */}
      <section className="mx-auto max-w-2xl px-6 pb-20">
        <div className="rounded-2xl border border-black/5 bg-white p-6 shadow-dashboard">
          <div className="mb-2 text-xs font-mono uppercase tracking-wider text-muted">Segmento</div>
          <div className="mb-4 flex flex-wrap gap-2">
            {["Todos", "Fidelizados", "Inativos", "Novatos"].map((s, i) => (
              <span key={s} className={`rounded-pill px-3 py-1 text-xs font-medium ${i === 2 ? "bg-paprica text-white" : "border border-border text-cafe"}`}>{s}</span>
            ))}
          </div>
          <div className="mb-2 text-xs font-mono uppercase tracking-wider text-muted">Mensagem base</div>
          <div className="mb-5 rounded-card border border-border bg-offwhite p-3 text-sm text-cafe">
            Oi {"{nome}"}! Sentimos sua falta 🍔 Que tal um combo hoje com 15% off?
          </div>
          <div className="mb-2 text-xs font-mono uppercase tracking-wider text-paprica">Preview gerado pela IA</div>
          <div className="space-y-2">
            <div className="rounded-card bg-creme p-3 text-sm text-cafe"><b>João (VIP):</b> E aí, João! Bateu a vontade de um burger? 😎 Hoje tem 15% no seu combo favorito.</div>
            <div className="rounded-card bg-creme p-3 text-sm text-cafe"><b>Maria (novata):</b> Oi, Maria! Que tal experimentar nosso combo com 15% de desconto? 🍟</div>
          </div>
        </div>
      </section>

      <section className="bg-creme px-6 py-20">
        <div className="mx-auto max-w-content">
          <SectionHeading label="Como funciona" title={<>Disparo que <span className="text-paprica">respeita o cliente.</span></>} />
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <DiffCard icon={Sparkles} title="Variação por IA">Cada pessoa recebe uma versão única — o WhatsApp não marca como spam.</DiffCard>
            <DiffCard icon={Users} title="Segmentação RFM">Novato, fidelizado, inativo... fale com o grupo certo na hora certa.</DiffCard>
            <DiffCard icon={CalendarClock} title="Agendamento">Programe o envio pra data e hora ideais e deixe rodar sozinho.</DiffCard>
            <DiffCard icon={ShieldOff} title="Opt-out automático">Quem responde "SAIR" é removido na hora — conformidade e reputação.</DiffCard>
            <DiffCard icon={Gauge} title="Throttle 1 msg/s">Ritmo controlado de envio pra preservar a saúde do seu número.</DiffCard>
            <DiffCard icon={Send} title="Fila confiável">Sem envio duplicado, com status de cada mensagem.</DiffCard>
          </div>
        </div>
      </section>

      <CtaSection variant="cafe" title="Traga seus clientes de volta com uma mensagem." subtitle="Segmenta, personaliza e dispara — tudo dentro do Lotta." />
    </SiteShell>
  );
}
