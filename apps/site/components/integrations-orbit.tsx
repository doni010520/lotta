import { BowlIcon } from "./logo";
import { PartnerLogo } from "./partner-logo";

type Item = { name: string; color: string; abbr: string; logo?: string };

// Classes literais (o JIT do Tailwind só gera o que encontra escrito no código).
// Giro LENTO p/ leitura: anel gira; cada logo gira ao contrário (mesma duração) p/ ficar em pé.
const SPIN_IN = "animate-[orbit_60s_linear_infinite]";
const SPIN_IN_COUNTER = "animate-[orbit_60s_linear_infinite_reverse]";
const SPIN_OUT = "animate-[orbit_90s_linear_infinite_reverse]";
const SPIN_OUT_COUNTER = "animate-[orbit_90s_linear_infinite]";

const BADGE = 60; // diâmetro dos círculos de logo

function Ring({ items, radius, spin, counter }: { items: Item[]; radius: number; spin: string; counter: string }) {
  const half = BADGE / 2;
  return (
    <div className={`absolute inset-0 ${spin}`}>
      {items.map((it, i) => {
        const angle = (360 / items.length) * i;
        return (
          <div
            key={it.name}
            className="absolute left-1/2 top-1/2"
            style={{ transform: `rotate(${angle}deg) translate(${radius}px) rotate(${-angle}deg)` }}
          >
            <div className={counter} style={{ marginLeft: -half, marginTop: -half }} title={it.name}>
              <PartnerLogo
                name={it.name}
                logo={it.logo}
                color={it.color}
                abbr={it.abbr}
                size={BADGE}
                className="shadow-card-hover ring-1 ring-black/5"
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function IntegrationsOrbit({ items }: { items: Item[] }) {
  const inner = items.slice(0, 5);
  const outer = items.slice(5);

  return (
    <div className="flex justify-center">
      <div className="flex h-[330px] items-center sm:h-[560px]">
        <div className="scale-[0.58] sm:scale-100">
          <div className="relative h-[540px] w-[540px]">
            {/* trilhas decorativas */}
            <div className="absolute left-1/2 top-1/2 h-[268px] w-[268px] -translate-x-1/2 -translate-y-1/2 rounded-full border border-dashed border-cafe/10" />
            <div className="absolute left-1/2 top-1/2 h-[452px] w-[452px] -translate-x-1/2 -translate-y-1/2 rounded-full border border-dashed border-cafe/10" />

            {/* anéis de logos */}
            <Ring items={inner} radius={134} spin={SPIN_IN} counter={SPIN_IN_COUNTER} />
            <Ring items={outer} radius={226} spin={SPIN_OUT} counter={SPIN_OUT_COUNTER} />

            {/* centro: Lotta */}
            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
              <div className="grid h-24 w-24 place-items-center rounded-[26%] bg-paprica shadow-cta">
                <BowlIcon size={48} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
