import { Heart, TrendingUp, Sparkles, Layers, Bot, ShoppingBag, Check, X } from "lucide-react";
import { SiteShell } from "@/components/site-shell";
import { FeatureHero } from "@/components/feature-hero";
import { CtaSection } from "@/components/cta-section";
import { SectionHeading, DiffCard } from "@/components/ui";

export const dynamic = "force-static";
export const metadata = { title: "Atendimento com IA no WhatsApp — Lotta" };

const CHAT = [
  { from: "in", text: "Oi! Queria um hambúrguer 🍔" },
  { from: "out", text: "Olá! Temos o Smash Clássico (R$ 28,90) e o Smash Bacon (R$ 32,90). Qual te agrada?" },
  { from: "in", text: "O bacon!" },
  { from: "out", text: "Ótima escolha! 🥓 Quer adicionar batata frita por +R$ 12,90? Combina demais 😉" },
  { from: "in", text: "Pode ser 🙌" },
  { from: "out", text: "Fechado! Total R$ 45,80. Me confirma o endereço que já mando pro preparo." },
];

export default function Page() {
  return (
    <SiteShell>
      <FeatureHero
        badge="Atendimento WhatsApp com IA"
        title={<>Atendimento com <span className="text-paprica">inteligência artificial</span> no WhatsApp</>}
        subtitle="Sua assistente atende 24/7, entende áudio e imagem, tira dúvidas, recebe pedidos e ainda aumenta o ticket médio — sem fila e sem custo por conversa."
        highlights={[
          { icon: Heart, title: "Encanta", desc: "Tom da sua marca, resposta na hora" },
          { icon: TrendingUp, title: "Converte", desc: "Sugere itens e fecha o pedido" },
          { icon: Sparkles, title: "Personaliza", desc: "Aprende o seu cardápio e estilo" },
        ]}
      />

      {/* Mockup de conversa */}
      <section className="mx-auto max-w-md px-6 pb-20">
        <div className="overflow-hidden rounded-2xl border border-black/5 shadow-dashboard">
          <div className="flex items-center gap-3 bg-[#075E54] px-4 py-3 text-white">
            <div className="grid h-9 w-9 place-items-center rounded-full bg-white/20 font-display font-bold">L</div>
            <div>
              <div className="text-sm font-semibold">Lotta · Burger Demo</div>
              <div className="flex items-center gap-1.5 text-xs text-white/70"><span className="h-1.5 w-1.5 animate-pulse rounded-full bg-green-400" />online agora</div>
            </div>
          </div>
          <div className="space-y-2 bg-[#ECE5DD] p-4">
            {CHAT.map((m, i) => (
              <div key={i} className={m.from === "in" ? "flex justify-end" : "flex justify-start"}>
                <div className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm shadow-sm ${m.from === "in" ? "rounded-br-sm bg-[#DCF8C6] text-cafe" : "rounded-bl-sm bg-white text-cafe"}`}>
                  {m.text}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Diferenciais */}
      <section className="bg-creme px-6 py-20">
        <div className="mx-auto max-w-content">
          <SectionHeading label="Como ela trabalha" title={<>Uma atendente que <span className="text-paprica">nunca dorme.</span></>} />
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <DiffCard icon={Layers} title="Escalável">Atende centenas de clientes ao mesmo tempo, sem fila e sem hora extra.</DiffCard>
            <DiffCard icon={Sparkles} title="Personalizada">Fala no tom da sua marca e conhece cada item do seu cardápio.</DiffCard>
            <DiffCard icon={Bot} title="Humanizada (GPT-4.1)">Entende contexto, áudio (Whisper) e imagem — conversa de verdade, não robô de palavra-chave.</DiffCard>
            <DiffCard icon={ShoppingBag} title="Pedido direto">Recebe o pedido no chat e manda pro preparo, sem app nem cadastro.</DiffCard>
          </div>
        </div>
      </section>

      {/* Comparação */}
      <section className="bg-cafe px-6 py-20">
        <div className="mx-auto grid max-w-4xl gap-4 md:grid-cols-2">
          <div className="rounded-card border border-paprica/30 bg-white/[0.03] p-6">
            <div className="mb-4 font-display text-lg font-bold text-white">Lotta IA</div>
            <ul className="space-y-2.5 text-sm text-white/80">
              {["Entende contexto e linguagem natural", "Áudio, imagem e figurinha", "Sugere itens e aumenta o ticket", "Recebe o pedido no chat", "Aprende o seu negócio"].map((t) => (
                <li key={t} className="flex items-center gap-2.5"><Check className="h-4 w-4 shrink-0 text-green-400" /> {t}</li>
              ))}
            </ul>
          </div>
          <div className="rounded-card border border-white/10 bg-white/[0.03] p-6">
            <div className="mb-4 font-display text-lg font-bold text-white/60">Chatbot tradicional</div>
            <ul className="space-y-2.5 text-sm text-white/50">
              {["Só responde palavra-chave", "Trava com áudio e imagem", "Não sugere nada", "Manda link e abandona", "Genérico, igual pra todos"].map((t) => (
                <li key={t} className="flex items-center gap-2.5"><X className="h-4 w-4 shrink-0 text-paprica-light" /> {t}</li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <CtaSection variant="paprica" title="Pare de perder venda por falta de resposta." subtitle="Ative a IA no seu WhatsApp e atenda todo mundo, na hora." />
    </SiteShell>
  );
}
