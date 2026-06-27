export function CtaSection({
  variant = "cafe",
  title,
  subtitle,
}: {
  variant?: "cafe" | "paprica";
  title: React.ReactNode;
  subtitle?: string;
}) {
  const dark = variant === "cafe";
  return (
    <section className={dark ? "bg-cafe" : "bg-paprica"}>
      <div className="mx-auto max-w-content px-6 py-20 text-center">
        <h2 className="mx-auto max-w-2xl font-display text-3xl font-bold tracking-tight text-white md:text-4xl">{title}</h2>
        {subtitle && <p className="mx-auto mt-4 max-w-xl text-white/80">{subtitle}</p>}
        <a
          href="#"
          className={`mt-8 inline-block rounded-btn px-8 py-3.5 font-bold transition hover:-translate-y-0.5 ${
            dark ? "bg-paprica text-white shadow-cta hover:bg-paprica-dark" : "bg-white text-paprica hover:bg-white/90"
          }`}
        >
          Testar grátis por 15 dias →
        </a>
      </div>
    </section>
  );
}
