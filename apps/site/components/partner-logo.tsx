"use client";

import { useState } from "react";

/**
 * Logo do parceiro num círculo branco. Usa a imagem real de /partners/ se existir;
 * senão cai no badge com a sigla. `size` controla o diâmetro (px).
 */
export function PartnerLogo({
  name,
  logo,
  color,
  abbr,
  size = 32,
  className = "",
}: {
  name: string;
  logo?: string;
  color: string;
  abbr: string;
  size?: number;
  className?: string;
}) {
  const [failed, setFailed] = useState(false);
  const imgSize = Math.round(size * 0.64);

  if (logo && !failed) {
    return (
      <span
        className={`grid place-items-center overflow-hidden rounded-full bg-white ${className}`}
        style={{ width: size, height: size }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={logo}
          alt={name}
          onError={() => setFailed(true)}
          className="object-contain"
          style={{ width: imgSize, height: imgSize }}
        />
      </span>
    );
  }

  return (
    <span
      className={`grid place-items-center rounded-full font-mono font-bold text-white ${className}`}
      style={{ width: size, height: size, backgroundColor: color, fontSize: Math.max(10, Math.round(size * 0.26)) }}
    >
      {abbr}
    </span>
  );
}
