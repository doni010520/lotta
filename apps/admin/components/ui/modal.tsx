"use client";

import { useEffect, useRef } from "react";

interface Props {
  /** Rótulo acessível do diálogo (lido por leitores de tela) */
  title?: string;
  onClose: () => void;
  children: React.ReactNode;
  className?: string;
}

/**
 * Diálogo modal acessível: fecha no Esc e no clique do backdrop,
 * trava o scroll do fundo e expõe role=dialog/aria-modal.
 */
export function Modal({ title, onClose, children, className = "" }: Props) {
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    panelRef.current?.focus();
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={title}
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center bg-cafe/50 p-4"
    >
      <div
        ref={panelRef}
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
        className={`max-h-[90dvh] w-full max-w-md overflow-y-auto rounded-card bg-white p-6 shadow-xl outline-none ${className}`}
      >
        {children}
      </div>
    </div>
  );
}
