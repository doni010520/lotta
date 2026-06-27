import type { LucideIcon } from "lucide-react";
import { Badge, Highlight } from "./ui";

interface HighlightItem {
  icon: LucideIcon;
  title: string;
  desc?: string;
}

export function FeatureHero({
  badge,
  title,
  subtitle,
  highlights,
}: {
  badge: string;
  title: React.ReactNode;
  subtitle: string;
  highlights: HighlightItem[];
}) {
  return (
    <section className="mx-auto max-w-content px-6 pb-12 pt-[120px] text-center">
      <Badge>{badge}</Badge>
      <h1 className="mx-auto mt-7 max-w-3xl font-display text-4xl font-bold leading-[1.1] tracking-tight text-cafe md:text-5xl lg:text-[56px]">
        {title}
      </h1>
      <p className="mx-auto mt-6 max-w-xl text-base text-muted md:text-lg">{subtitle}</p>

      {highlights.length > 0 && (
        <div className="mx-auto mt-10 grid max-w-3xl gap-3 text-left sm:grid-cols-3">
          {highlights.map((h) => (
            <Highlight key={h.title} icon={h.icon} title={h.title}>
              {h.desc}
            </Highlight>
          ))}
        </div>
      )}
    </section>
  );
}
