"use client";

import { useState } from "react";
import { X, Minus, Plus } from "lucide-react";
import { useCart } from "@/lib/cart";
import { formatCurrency } from "@/lib/utils";
import { toast } from "sonner";

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
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center">
      <div className="bg-white w-full max-w-lg sm:rounded-2xl rounded-t-2xl max-h-[90vh] overflow-y-auto">
        {/* Image */}
        {product.image_url && (
          <div className="relative">
            <img src={product.image_url} alt="" className="w-full h-48 object-cover" />
            <button onClick={onClose} className="absolute top-3 right-3 bg-white/90 rounded-full p-2">
              <X className="w-5 h-5" />
            </button>
          </div>
        )}

        <div className="p-5">
          {!product.image_url && (
            <button onClick={onClose} className="absolute top-3 right-3 p-2">
              <X className="w-5 h-5" />
            </button>
          )}

          <h2 className="text-xl font-semibold">{product.name}</h2>
          {product.description && <p className="text-sm text-gray-500 mt-1">{product.description}</p>}

          <div className="mt-2">
            {product.promo_price ? (
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-400 line-through">{formatCurrency(product.price)}</span>
                <span className="text-lg font-bold text-paprica">{formatCurrency(product.promo_price)}</span>
              </div>
            ) : (
              <span className="text-lg font-bold">{formatCurrency(product.price)}</span>
            )}
          </div>

          {/* Option groups */}
          {groups.map((group: any) => (
            <div key={group.id} className="mt-5">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-medium text-sm">{group.name}</h3>
                <span className="text-xs text-gray-400">
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
                      onClick={() => toggleOption(group.id, opt.id, group.max_select)}
                      className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg border text-sm transition-colors ${
                        isSelected ? "border-paprica bg-paprica/10" : "border-gray-200 hover:bg-gray-50"
                      }`}
                    >
                      <span>{opt.name}</span>
                      {opt.price > 0 && (
                        <span className="text-gray-500">+ {formatCurrency(opt.price)}</span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}

          {/* Notes */}
          <div className="mt-5">
            <label className="block text-sm font-medium text-gray-700 mb-1">Observações</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Ex: sem cebola, bem passado..."
              rows={2}
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-paprica/20"
            />
          </div>

          {/* Quantity + Add */}
          <div className="mt-5 flex items-center gap-4">
            <div className="flex items-center border rounded-lg">
              <button onClick={() => setQuantity(Math.max(1, quantity - 1))} className="p-2.5">
                <Minus className="w-4 h-4" />
              </button>
              <span className="px-4 font-medium">{quantity}</span>
              <button onClick={() => setQuantity(quantity + 1)} className="p-2.5">
                <Plus className="w-4 h-4" />
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
      </div>
    </div>
  );
}
