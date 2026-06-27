export function BowlIcon({ size = 22 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" aria-hidden="true">
      <defs>
        <linearGradient id="lotta-bowl" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#FFFFFF" />
          <stop offset="1" stopColor="#FFE3D8" />
        </linearGradient>
        <linearGradient id="lotta-soup" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#FFE08A" />
          <stop offset="1" stopColor="#FFB02E" />
        </linearGradient>
      </defs>
      <path d="M16 19c-2.7-2.3 2.7-4.6 0-6.9-2.7-2.3 2.7-4.6 0-6.9" stroke="#fff" strokeWidth="2.4" fill="none" strokeLinecap="round" opacity=".62" />
      <path d="M24 17c-2.7-2.3 2.7-4.6 0-6.9-2.7-2.3 2.7-4.6 0-6.9" stroke="#fff" strokeWidth="2.4" fill="none" strokeLinecap="round" opacity=".62" />
      <path d="M32 19c-2.7-2.3 2.7-4.6 0-6.9-2.7-2.3 2.7-4.6 0-6.9" stroke="#fff" strokeWidth="2.4" fill="none" strokeLinecap="round" opacity=".62" />
      <path d="M5 22C5.5 33 13 42 24 42 35 42 42.5 33 43 22Z" fill="url(#lotta-bowl)" />
      <ellipse cx="24" cy="22" rx="18.5" ry="4.6" fill="url(#lotta-soup)" />
    </svg>
  );
}

export function Logo({ dark = false }: { dark?: boolean }) {
  return (
    <span className="flex items-center gap-2.5">
      <span className="grid h-9 w-9 place-items-center rounded-[24%] bg-paprica shadow-[0_4px_12px_rgba(229,64,42,.3)]">
        <BowlIcon />
      </span>
      <span className={`font-display text-[22px] font-bold tracking-tight ${dark ? "text-white" : "text-cafe"}`}>
        Lotta<span className="text-gema-dot">.</span>
      </span>
    </span>
  );
}
