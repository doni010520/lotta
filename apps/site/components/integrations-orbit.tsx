import { BowlIcon } from "./logo";
import { PartnerLogo } from "./partner-logo";

type Item = { name: string; color: string; abbr: string; logo?: string };

// Classes literais (o JIT do Tailwind só gera o que encontra escrito no código):
// inner gira normal / itens giram reverso; outer gira reverso / itens giram normal.
const SPIN_IN = "animate-[orbit_30s_linear_infinite]";
const SPIN_IN_COUNTER = "animate-[orbit_30s_linear_infinite_reverse]";
const SPIN_OUT = "animate-[orbit_46s_linear_infinite_reverse]";
const SPIN_OUT_COUNTER = "animate-[orbit_46s_linear_infinite]";

/** Um anel de logos girando; cada logo gira ao contrário pra ficar sempre "em pé". */
function Ring({ items, radius, spin, counter }: { items: Item[]; radius: number; spin: string; counter: string }) {
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
            <div className={`-ml-6 -mt-6 ${counter}`} title={it.name}>
              <div className="grid h-12 w-12 place-items-center rounded-full bg-white shadow-card-hover ring-1 ring-black/5">
                <PartnerLogo name={it.name} logo={it.logo} color={it.color} abbr={it.abbr} />
              </div>
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
      <div className="flex h-[340px] items-center sm:h-[500px]">
        <div className="scale-[0.66] sm:scale-100">
          <div className="relative h-[460px] w-[460px]">
            {/* trilhas decorativas */}
            <div className="absolute left-1/2 top-1/2 h-[220px] w-[220px] -translate-x-1/2 -translate-y-1/2 rounded-full border border-dashed border-cafe/10" />
            <div className="absolute left-1/2 top-1/2 h-[392px] w-[392px] -translate-x-1/2 -translate-y-1/2 rounded-full border border-dashed border-cafe/10" />

            {/* anéis de logos */}
            <Ring items={inner} radius={110} spin={SPIN_IN} counter={SPIN_IN_COUNTER} />
            <Ring items={outer} radius={196} spin={SPIN_OUT} counter={SPIN_OUT_COUNTER} />

            {/* centro: Lotta */}
            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
              <div className="grid h-20 w-20 place-items-center rounded-[26%] bg-paprica shadow-cta">
                <BowlIcon size={40} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
