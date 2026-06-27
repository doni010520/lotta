"use client";

import { useState } from "react";

/**
 * Mostra a logo real do parceiro se o arquivo existir em /partners/.
 * Se não existir (ou falhar), cai no badge com a sigla — nada quebra.
 */
export function PartnerLogo({
  name,
  logo,
  color,
  abbr,
}: {
  name: string;
  logo?: string;
  color: string;
  abbr: string;
}) {
  const [failed, setFailed] = useState(false);

  if (logo && !failed) {
    // eslint-disable-next-line @next/next/no-img-element
    return (
      <span className="grid h-8 w-8 place-items-center overflow-hidden rounded-full bg-white">
        <img src={logo} alt={name} className="h-7 w-7 object-contain" onError={() => setFailed(true)} />
      </span>
    );
  }

  return (
    <span
      className="grid h-8 w-8 place-items-center rounded-full font-mono text-[10px] font-bold text-white"
      style={{ backgroundColor: color }}
    >
      {abbr}
    </span>
  );
}
