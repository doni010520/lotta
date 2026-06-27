"use client";

import { useState } from "react";
import { X, Minus, Plus } from "lucide-react";
import { useCart } from "@/lib/cart";
import { formatCurrency } from "@/lib/utils";
import { toast } from "sonner";
import { Sheet } from "./sheet";
import { ProductImage } from "./product-image";

interface Props {
  product: any;
  onClose: () => void;
}

export function ProductModal({ product, onClose }: Props) {
  const [quantity, setQuantity] = useState(1);
  const [selectedOptions, setSelectedOptions] = useState<Record<string, string[]>>({});
  const [notes, setNotes] = useState("");
  const { addItem } = useCart();

  const groups = product.option_groups ?? [];

  function toggleOption(groupId: string, optionId: string, maxSelect: number) {
    setSelectedOptions((prev) => {
      const current = prev[groupId] ?? [];
      if (current.includes(optionId)) {
        return { ...prev, [groupId]: current.filter((id) => id !== optionId) };
      }
      if (maxSelect === 1) return { ...prev, [groupId]: [optionId] };
      if (current.length >= maxSelect) return prev;
      return { ...prev, [groupId]: [...current, optionId] };
    });
  }

  function getOptionsTotal() {
    let total = 0;
    for (const group of groups) {
      const sel = selectedOptions[group.id] ?? [];
      for (const opt of group.options ?? []) {
        if (sel.includes(opt.id)) total += opt.price;
      }
    }
    return total;
  }

  function canAdd() {
    for (const group of groups) {
      if (group.is_required) {
        const sel = selectedOptions[group.id] ?? [];
        if (sel.length < group.min_select) return false;
      }
    }
    return true;
  }

  function handleAdd() {
    if (!canAdd()) {
      toast.error("Selecione as opções obrigatórias");
      return;
    }

    const opts: { groupName: string; optionName: string; price: number }[] = [];
    for (const group of groups) {
      const sel = selectedOptions[group.id] ?? [];
      for (const opt of group.options ?? []) {
        if (sel.includes(opt.id)) {
          opts.push({ groupName: group.name, optionName: opt.name, price: opt.price });
        }
      }
    }

    const unitPrice = product.promo_price ?? product.price;
    const optionsTotal = opts.reduce((s, o) => s + o.price, 0);

    addItem({
      productId: product.id,
      productName: product.name,
      unitPrice,
      quantity,
      imageUrl: product.image_url,
      options: opts,
      notes,
      totalPrice: (unitPrice + optionsTotal) * quantity,
    });

    toast.success("Adicionado ao carrinho");
    onClose();
  }

  const unitPrice = product.promo_price ?? product.price;
  const total = (unitPrice + getOptionsTotal()) * quantity;

  return (
    <Sheet title={product.name} onClose={onClose}>
      {/* Banner (com placeholder da marca quando não houver foto) */}
      <div className="relative">
        <ProductImage src={product.image_url} alt={product.name} sizes="(max-width: 640px) 100vw, 512px" className="w-full h-48" />
        <button
          onClick={onClose}
          aria-label="Fechar"
          className="absolute top-3 right-3 grid place-items-center h-10 w-10 rounded-full bg-white/90 text-cafe shadow-sm hover:bg-white transition-colors"
        >
          <X className="w-5 h-5" aria-hidden="true" />
        </button>
      </div>

      <div className="p-5">
        <h2 className="font-display text-xl font-bold text-cafe">{product.name}</h2>
        {product.description && <p className="text-sm text-muted mt-1">{product.description}</p>}

        <div className="mt-2">
          {product.promo_price ? (
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted/70 line-through">{formatCurrency(product.price)}</span>
              <span className="text-lg font-bold text-paprica">{formatCurrency(product.promo_price)}</span>
            </div>
          ) : (
            <span className="text-lg font-bold text-cafe">{formatCurrency(product.price)}</span>
          )}
        </div>

        {/* Option groups */}
        {groups.map((group: any) => (
          <div key={group.id} className="mt-5">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-medium text-sm text-cafe">{group.name}</h3>
              <span className="text-xs text-muted">
                {group.is_required ? "Obrigatório" : "Opcional"}
                {group.max_select > 1 && ` · até ${group.max_select}`}
              </span>
            </div>
            <div className="space-y-1">
              {(group.options ?? []).map((opt: any) => {
                const isSelected = (selectedOptions[group.id] ?? []).includes(opt.id);
                return (
                  <button
                    key={opt.id}
                    aria-pressed={isSelected}
                    onClick={() => toggleOption(group.id, opt.id, group.max_select)}
                    className={`w-full flex items-center justify-between px-3 py-3 rounded-lg border text-sm transition-colors ${
                      isSelected ? "border-paprica bg-paprica/10 text-cafe" : "border-cafe/10 hover:bg-creme"
                    }`}
                  >
                    <span>{opt.name}</span>
                    {opt.price > 0 && (
                      <span className="text-muted">+ {formatCurrency(opt.price)}</span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        ))}

        {/* Notes */}
        <div className="mt-5">
          <label htmlFor="product-notes" className="block text-sm font-medium text-cafe mb-1">Observações</label>
          <textarea
            id="product-notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Ex: sem cebola, bem passado..."
            rows={2}
            className="w-full border border-cafe/10 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-paprica/25"
          />
        </div>

        {/* Quantity + Add */}
        <div className="mt-5 flex items-center gap-4">
          <div className="flex items-center border border-cafe/10 rounded-lg">
            <button onClick={() => setQuantity(Math.max(1, quantity - 1))} aria-label="Diminuir quantidade" className="grid place-items-center h-11 w-11 text-cafe disabled:text-muted/40" disabled={quantity <= 1}>
              <Minus className="w-4 h-4" aria-hidden="true" />
            </button>
            <span className="px-2 min-w-8 text-center font-medium text-cafe" aria-live="polite">{quantity}</span>
            <button onClick={() => setQuantity(quantity + 1)} aria-label="Aumentar quantidade" className="grid place-items-center h-11 w-11 text-cafe">
              <Plus className="w-4 h-4" aria-hidden="true" />
            </button>
          </div>
          <button
            onClick={handleAdd}
            disabled={!canAdd()}
            className="flex-1 bg-paprica text-white rounded-lg py-3 font-medium hover:bg-paprica-dark disabled:opacity-50 transition-colors"
          >
            Adicionar · {formatCurrency(total)}
          </button>
        </div>
      </div>
    </Sheet>
  );
}
