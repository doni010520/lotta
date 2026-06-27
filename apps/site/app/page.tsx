import Link from "next/link";
import {
  MessageSquare, UtensilsCrossed, TrendingUp, Send, RotateCcw, Star, Ticket, BarChart3,
  Wallet, Users, Sparkles, Megaphone, Check, ArrowRight,
} from "lucide-react";
import { SiteShell } from "@/components/site-shell";
import { CtaSection } from "@/components/cta-section";
import { SectionHeading, DiffCard, Badge } from "@/components/ui";
import { Reveal } from "@/components/reveal";

export const dynamic = "force-static";

const KPIS = [
  { label: "Pedidos hoje", value: "147", note: "+32% vs semana passada", accent: "text-white", good: true },
  { label: "Faturamento", value: "R$ 8.4k", note: "+18% este mês", accent: "text-white", good: true },
  { label: "Clientes novos", value: "23", note: "leads capturados hoje", accent: "text-gema" },
  { label: "IA conversas", value: "89", note: "resolvidas sem humano", accent: "text-white", good: true },
];

const NUMEROS = [
  { v: "+500", l: "Restaurantes ativos", c: "text-paprica" },
  { v: "+50k", l: "Pedidos finalizados", c: "text-paprica" },
  { v: "+120k", l: "Conversas com IA", c: "text-gema" },
  { v: "0%", l: "Taxa por pedido", c: "text-paprica" },
];

const CATEGORIES = [
  {
    label: "Venda no automático",
    cards: [
      { href: "/atendimento-virtual", icon: MessageSquare, title: "Atendimento com IA", desc: "Automatize respostas no WhatsApp e nunca perca uma venda" },
      { href: "/cardapio-digital", icon: UtensilsCrossed, title: "Cardápio digital", desc: "Aumente o ticket médio com sugestões inteligentes" },
      { href: "/trafego-pago", icon: TrendingUp, title: "Tráfego pago com IA", desc: "Meta Ads + Google Ads + GMB — campanhas que convertem" },
    ],
  },
  {
    label: "Fidelize e multiplique",
    cards: [
      { href: "/disparos", icon: Send, title: "Disparos em massa", desc: "Mensagens personalizadas pelos clientes certos" },
      { href: "/recuperador-de-clientes", icon: RotateCcw, title: "Recuperação", desc: "Reconquiste clientes inativos no automático" },
      { href: "/programa-de-fidelidade", icon: Star, title: "Fidelidade", desc: "Cashback e benefícios que trazem o cliente de volta" },
      { href: "/cupom", icon: Ticket, title: "Cupons", desc: "Conversão sem queimar margem" },
    ],
  },
  {
    label: "Analise cada detalhe",
    cards: [
      { href: "/relatorios", icon: BarChart3, title: "Relatórios", desc: "Decisão com número, não com achismo" },
    ],
  },
];

const INTEGRATIONS = [
  { name: "iFood", color: "#EA1D2C", abbr: "iF" },
  { name: "99 Food", color: "#FFB800", abbr: "99" },
  { name: "WhatsApp", color: "#25D366", abbr: "WA" },
  { name: "Meta Pixel", color: "#1877F2", abbr: "Meta" },
  { name: "Google Analytics", color: "#E37400", abbr: "GA" },
  { name: "Tag Manager", color: "#246FDB", abbr: "GTM" },
  { name: "Google Ads", color: "#4285F4", abbr: "G" },
  { name: "Meu Negócio", color: "#34A853", abbr: "GMB" },
  { name: "Foody", color: "#77BB22", abbr: "FD" },
  { name: "Pick N Go", color: "#5C3D91", abbr: "PnG" },
  { name: "Saipos", color: "#FF5722", abbr: "SP" },
];

const FAQ = [
  { q: "O que é o Lotta?", a: "O Lotta é uma plataforma SaaS completa para restaurantes. Canal próprio de delivery com cardápio digital, agente de pedidos por WhatsApp com IA, CRM com segmentação automática e programa de fidelidade. Tudo sem taxa por pedido." },
  { q: "Qual a diferença entre o Lotta e o iFood?", a: "O iFood é um marketplace que cobra comissão por pedido e mantém os dados dos clientes. O Lotta é um canal próprio: você acessa a base completa de clientes, não depende de algoritmos de terceiros e tem controle total da operação." },
  { q: "Como funciona o atendimento com IA?", a: "O Lotta usa GPT-4.1 para atender clientes no WhatsApp 24/7. A IA entende texto, áudio, imagem e figurinha, recebe pedidos, tira dúvidas e sugere itens pra aumentar o ticket médio — sem fila e sem custo por conversa." },
  { q: "O Lotta integra com o que eu já uso?", a: "Sim. O Lotta integra com iFood, 99Food, sistemas de PDV (Saipos, Colibri), ferramentas de marketing (Meta Pixel, GA4, GTM), Google Ads, Google Meu Negócio e plataformas de logística (Foody, Pick N Go)." },
  { q: "Quanto custa?", a: "O Lotta tem planos com custo fixo previsível, sem comissão por pedido. Teste grátis por 15 dias sem cadastrar cartão. Sem multa de cancelamento." },
  { q: "Como migrar do iFood pro canal próprio?", a: "Implementação em poucas horas: importamos o cardápio, configuramos o WhatsApp Business e treinamos a IA do seu restaurante. Você mantém o iFood funcionando em paralelo enquanto desenvolve o canal próprio." },
];

const GOOGLE_DIFFS = ["Google Ads gerido por IA", "Google Meu Negócio automático", "Respostas de avaliações com IA", "Meta CAPI (conversões server-side)"];

export default function HomePage() {
  return (
    <SiteShell>
      {/* HERO */}
      <section id="top" className="mx-auto max-w-content px-6 pb-20 pt-[120px] text-center">
        <Reveal>
        <Badge>Plataforma de delivery 100% integrada com IA</Badge>
        <h1 className="mx-auto mt-7 max-w-3xl font-display text-4xl font-bold leading-[1.08] tracking-tight text-cafe md:text-6xl">
          Seu delivery <span className="text-paprica">lota</span> quando o cliente é <span className="italic text-paprica">seu.</span>
        </h1>
        <p className="mx-auto mt-6 max-w-xl text-base text-muted md:text-xl">
          Do pedido à fidelização, o Lotta cuida de tudo. Seu cliente compra mais, volta sempre e é seu — não do app.
        </p>
        <div className="mt-9 flex flex-wrap justify-center gap-3.5">
          <a href="#" className="rounded-btn bg-paprica px-8 py-3.5 font-bold text-white shadow-cta transition hover:-translate-y-0.5 hover:bg-paprica-dark">
            Testar grátis por 15 dias →
          </a>
          <a href="#funcionalidades" className="rounded-btn border-[1.5px] border-black/15 px-8 py-3.5 font-semibold text-cafe transition hover:border-black/30">
            Ver funcionalidades
          </a>
        </div>
        <div className="mt-7 flex flex-wrap justify-center gap-5 text-sm text-muted">
          <span className="inline-flex items-center gap-1.5"><Check className="h-4 w-4 text-paprica" /> 15 dias grátis</span>
          <span className="inline-flex items-center gap-1.5"><Check className="h-4 w-4 text-paprica" /> Sem multa</span>
          <span className="inline-flex items-center gap-1.5"><Check className="h-4 w-4 text-paprica" /> Migração facilitada</span>
        </div>
        </Reveal>
      </section>

      {/* DASHBOARD MOCKUP */}
      <section className="mx-auto mb-20 max-w-5xl px-6">
        <div className="animate-float overflow-hidden rounded-2xl bg-gradient-to-br from-cafe to-cafe-soft p-6 shadow-dashboard md:p-8">
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            {KPIS.map((k) => (
              <div key={k.label} className="rounded-card bg-white/[0.08] p-4">
                <div className="font-mono text-[10px] uppercase tracking-wider text-white/50">{k.label}</div>
                <div className={`mt-2 font-display text-2xl font-bold ${k.accent}`}>{k.value}</div>
                <div className={`mt-1 text-xs ${k.good ? "text-green-400" : "text-white/40"}`}>{k.note}</div>
              </div>
            ))}
          </div>
          <div className="mt-4 grid h-44 place-items-center rounded-card bg-white/5">
            <span className="font-mono text-xs tracking-wider text-white/30">[ painel Lotta em tempo real ]</span>
          </div>
        </div>
      </section>

      {/* NÚMEROS */}
      <section className="bg-cafe px-6 py-16">
        <div className="mx-auto max-w-content">
          <div className="mb-3 text-center font-mono text-xs uppercase tracking-[2px] text-white/40">Nossos números</div>
          <h2 className="mb-12 text-center font-display text-3xl font-bold tracking-tight text-white md:text-4xl">
            Impacto que volta pro <span className="text-gema">caixa.</span>
          </h2>
          <div className="grid grid-cols-2 gap-6 md:grid-cols-4">
            {NUMEROS.map((n) => (
              <div key={n.l} className="text-center">
                <div className={`font-display text-4xl font-bold md:text-5xl ${n.c}`}>{n.v}</div>
                <div className="mt-1 text-sm text-white/60">{n.l}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FUNCIONALIDADES */}
      <section id="funcionalidades" className="mx-auto max-w-content px-6 py-20">
        <SectionHeading
          label="Funcionalidades"
          title={<>Tudo que seu <span className="text-paprica">delivery</span> precisa.</>}
          subtitle="Sem abrir 5 abas. Sem plugar 10 ferramentas. Um lugar só."
        />
        <div className="space-y-12">
          {CATEGORIES.map((cat) => (
            <div key={cat.label}>
              <div className="mb-5 flex items-center gap-2.5">
                <span className="h-2 w-2 rounded-full bg-paprica" />
                <h3 className="font-display text-xl font-bold text-cafe">{cat.label}</h3>
              </div>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {cat.cards.map((c) => (
                  <Link
                    key={c.href}
                    href={c.href}
                    className="group rounded-card border border-black/5 bg-white p-7 transition duration-200 hover:-translate-y-0.5 hover:border-paprica/30 hover:shadow-card-hover"
                  >
                    <div className="mb-4 grid h-10 w-10 place-items-center rounded-card bg-paprica/10 text-paprica">
                      <c.icon className="h-5 w-5" />
                    </div>
                    <div className="font-bold text-cafe">{c.title}</div>
                    <div className="mt-1.5 text-sm leading-relaxed text-muted">{c.desc}</div>
                    <div className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-paprica">
                      Saiba mais <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* DIFERENCIAL GOOGLE */}
      <section className="bg-paprica px-6 py-20">
        <div className="mx-auto grid max-w-content items-center gap-10 md:grid-cols-2">
          <div>
            <div className="mb-3 font-mono text-xs uppercase tracking-[2px] text-white/60">Diferencial Lotta</div>
            <h2 className="font-display text-3xl font-bold tracking-tight text-white md:text-4xl">
              Não é só Meta. É <span className="text-gema">Google também.</span>
            </h2>
            <p className="mt-4 max-w-md text-white/80">
              Enquanto os outros só anunciam no Instagram, o Lotta trabalha o Google inteiro — busca, mapa e avaliações — com IA cuidando de tudo.
            </p>
            <ul className="mt-6 space-y-3">
              {GOOGLE_DIFFS.map((d) => (
                <li key={d} className="flex items-center gap-3 text-white">
                  <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-white/20"><Check className="h-3.5 w-3.5" /></span>
                  {d}
                </li>
              ))}
            </ul>
          </div>
          <div className="grid h-64 place-items-center rounded-2xl bg-white/10 ring-1 ring-white/15">
            <span className="font-mono text-xs tracking-wider text-white/50">[ Google Ads + GMB + Reviews IA ]</span>
          </div>
        </div>
      </section>

      {/* INTEGRAÇÕES */}
      <section id="integracoes" className="mx-auto max-w-content px-6 py-20">
        <SectionHeading
          label="Integrações"
          title={<>Conecta com o que <span className="text-paprica">você já usa.</span></>}
          subtitle="iFood, 99Food, PDVs, marketing e logística — tudo num lugar só."
        />
        <div className="relative overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_8%,black_92%,transparent)]">
          <div className="flex w-max animate-marquee gap-3">
            {[...INTEGRATIONS, ...INTEGRATIONS].map((i, idx) => (
              <div key={`${i.name}-${idx}`} className="flex shrink-0 items-center gap-2.5 rounded-pill border border-black/5 bg-white py-2 pl-2 pr-4">
                <span className="grid h-8 w-8 place-items-center rounded-full font-mono text-[10px] font-bold text-white" style={{ backgroundColor: i.color }}>
                  {i.abbr}
                </span>
                <span className="text-sm font-medium text-cafe">{i.name}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* DIFERENCIAIS */}
      <section id="diferenciais" className="bg-creme px-6 py-20">
        <div className="mx-auto max-w-content">
          <SectionHeading
            label="Por que Lotta"
            title={<>O delivery do jeito <span className="text-paprica">certo.</span></>}
          />
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <DiffCard icon={Wallet} title="Zero taxa por pedido">Você paga um valor fixo previsível. Cada pedido é 100% seu, sem comissão.</DiffCard>
            <DiffCard icon={Users} title="O cliente é seu">Base completa de clientes na sua mão — não refém de algoritmo de marketplace.</DiffCard>
            <DiffCard icon={Sparkles} title="IA que vende">Atende, sugere e recupera no automático. Mais ticket médio, menos trabalho.</DiffCard>
            <DiffCard icon={Megaphone} title="Google + Meta">Tráfego pago nas duas frentes, com criativos e palavras-chave gerados por IA.</DiffCard>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="mx-auto max-w-3xl px-6 py-20">
        <SectionHeading label="FAQ" title="Perguntas frequentes" />
        <div className="space-y-3">
          {FAQ.map((f) => (
            <details key={f.q} className="group rounded-card border border-black/5 bg-white p-5">
              <summary className="flex cursor-pointer list-none items-center justify-between font-semibold text-cafe">
                {f.q}
                <span className="ml-4 text-paprica transition-transform group-open:rotate-45">+</span>
              </summary>
              <p className="mt-3 text-sm leading-relaxed text-muted">{f.a}</p>
            </details>
          ))}
        </div>
      </section>

      <CtaSection
        variant="cafe"
        title={<>Pronto pra lotar o seu delivery?</>}
        subtitle="Teste grátis por 15 dias. Sem cartão, sem multa, sem comissão por pedido."
      />
    </SiteShell>
  );
}
