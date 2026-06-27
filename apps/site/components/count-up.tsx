"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Anima a contagem de 0 até `value` quando entra na viewport.
 * Mantém prefixo/sufixo (ex.: "+", "k", "%"). Respeita prefers-reduced-motion.
 */
export function CountUp({
  value,
  prefix = "",
  suffix = "",
  duration = 2200,
  className = "",
}: {
  value: number;
  prefix?: string;
  suffix?: string;
  duration?: number;
  className?: string;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const [display, setDisplay] = useState(0);
  const started = useRef(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (reduce || !("IntersectionObserver" in window)) {
      setDisplay(value);
      return;
    }
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !started.current) {
          started.current = true;
          const start = performance.now();
          const tick = (now: number) => {
            const p = Math.min(1, (now - start) / duration);
            const eased = 1 - Math.pow(1 - p, 3); // easeOutCubic
            setDisplay(value * eased);
            if (p < 1) requestAnimationFrame(tick);
            else setDisplay(value);
          };
          requestAnimationFrame(tick);
          io.disconnect();
        }
      },
      // dispara só quando a seção entrou bem na tela (não na borda)
      { threshold: 0, rootMargin: "0px 0px -25% 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [value, duration]);

  return (
    <span ref={ref} className={className}>
      {prefix}
      {Math.round(display).toLocaleString("pt-BR")}
      {suffix}
    </span>
  );
}
