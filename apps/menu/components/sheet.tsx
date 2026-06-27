"use client";

import { useEffect, useRef } from "react";

interface Props {
  /** Acessível: rótulo do diálogo para leitores de tela */
  title?: string;
  onClose: () => void;
  children: React.ReactNode;
  className?: string;
}

/**
 * Bottom-sheet acessível: fecha no Esc e no clique do backdrop,
 * trava o scroll do fundo, e expõe role=dialog/aria-modal.
 */
export function Sheet({ title, onClose, children, className = "" }: Props) {
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    panelRef.current?.focus();
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [onClose]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={title}
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-end justify-center bg-cafe/50 sm:items-center"
    >
      <div
        ref={panelRef}
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
        className={`max-h-[90dvh] w-full max-w-lg overflow-y-auto rounded-t-2xl bg-white outline-none sm:rounded-2xl ${className}`}
      >
        {children}
      </div>
    </div>
  );
}
