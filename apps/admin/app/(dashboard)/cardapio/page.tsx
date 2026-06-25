"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase-browser";
import { Plus, Pencil, Trash2, GripVertical, Image as ImageIcon } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { toast } from "sonner";
import type { Category, Product } from "@lotta/shared";

export default function CardapioPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedCat, setSelectedCat] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [showCatForm, setShowCatForm] = useState(false);
  const [showProdForm, setShowProdForm] = useState(false);
  const [editingCat, setEditingCat] = useState<Category | null>(null);
  const [editingProd, setEditingProd] = useState<Product | null>(null);

  const supabase = createClient();

  const loadData = useCallback(async () => {
    const { data: cats } = await supabase
      .from("categories")
      .select("*")
      .order("sort_order");
    setCategories(cats ?? []);

    let q = supabase
      .from("products")
      .select("*, category:categories(id,name), option_groups(*, options(*))")
      .order("sort_order");

    if (selectedCat) q = q.eq("category_id", selectedCat);

    const { data: prods } = await q;
    setProducts(prods ?? []);
    setLoading(false);
  }, [selectedCat]);

  useEffect(() => { loadData(); }, [loadData]);

  async function saveCategory(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const payload = {
      name: form.get("name") as string,
      description: form.get("description") as string || null,
      is_active: true,
    };

    if (editingCat) {
      await supabase.from("categories").update(payload).eq("id", editingCat.id);
      toast.success("Categoria atualizada");
    } else {
      await supabase.from("categories").insert(payload);
      toast.success("Categoria criada");
    }

    setShowCatForm(false);
    setEditingCat(null);
    loadData();
  }

  async function deleteCategory(id: string) {
    if (!confirm("Remover esta categoria? Os produtos serão desvinculados.")) return;
    await supabase.from("categories").delete().eq("id", id);
    toast.success("Categoria removida");
    loadData();
  }

  async function saveProduct(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const payload = {
      name: form.get("name") as string,
      description: form.get("description") as string || null,
      price: parseFloat(form.get("price") as string),
      promo_price: form.get("promo_price") ? parseFloat(form.get("promo_price") as string) : null,
      category_id: form.get("category_id") as string || null,
      is_active: true,
    };

    if (editingProd) {
      await supabase.from("products").update(payload).eq("id", editingProd.id);
      toast.success("Produto atualizado");
    } else {
      await supabase.from("products").insert(payload);
      toast.success("Produto criado");
    }

    setShowProdForm(false);
    setEditingProd(null);
    loadData();
  }

  async function deleteProduct(id: string) {
    if (!confirm("Remover este produto?")) return;
    await supabase.from("products").delete().eq("id", id);
    toast.success("Produto removido");
    loadData();
  }

  async function toggleProduct(id: string, is_active: boolean) {
    await supabase.from("products").update({ is_active: !is_active }).eq("id", id);
    loadData();
  }

  if (loading) return <div className="py-12 text-center text-gray-400">Carregando...</div>;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold">Cardápio</h1>
        <div className="flex gap-2">
          <button
            onClick={() => { setEditingCat(null); setShowCatForm(true); }}
            className="flex items-center gap-2 px-4 py-2 text-sm border rounded-lg hover:bg-gray-50"
          >
            <Plus className="w-4 h-4" /> Categoria
          </button>
          <button
            onClick={() => { setEditingProd(null); setShowProdForm(true); }}
            className="flex items-center gap-2 px-4 py-2 text-sm bg-paprica text-white rounded-lg hover:bg-paprica-dark"
          >
            <Plus className="w-4 h-4" /> Produto
          </button>
        </div>
      </div>

      {/* Category filters */}
      <div className="flex gap-2 mb-6 flex-wrap">
        <button
          onClick={() => setSelectedCat(null)}
          className={`px-3 py-1.5 text-sm rounded-full ${!selectedCat ? "bg-paprica text-white" : "bg-white border text-gray-600 hover:bg-gray-50"}`}
        >
          Todos
        </button>
        {categories.map((cat) => (
          <button
            key={cat.id}
            onClick={() => setSelectedCat(cat.id)}
            className={`px-3 py-1.5 text-sm rounded-full flex items-center gap-1 ${selectedCat === cat.id ? "bg-paprica text-white" : "bg-white border text-gray-600 hover:bg-gray-50"}`}
          >
            {cat.name}
            <button
              onClick={(e) => { e.stopPropagation(); setEditingCat(cat); setShowCatForm(true); }}
              className="ml-1 hover:text-paprica"
            >
              <Pencil className="w-3 h-3" />
            </button>
          </button>
        ))}
      </div>

      {/* Products grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {products.map((prod) => (
          <div key={prod.id} className={`bg-white rounded-xl border p-4 ${!prod.is_active ? "opacity-50" : ""}`}>
            <div className="flex items-start justify-between mb-3">
              <div className="flex-1">
                <h3 className="font-medium text-sm">{prod.name}</h3>
                <p className="text-xs text-gray-400 mt-0.5">{(prod as any).category?.name}</p>
              </div>
              {prod.image_url ? (
                <img src={prod.image_url} alt="" className="w-16 h-16 rounded-lg object-cover" />
              ) : (
                <div className="w-16 h-16 rounded-lg bg-gray-100 flex items-center justify-center">
                  <ImageIcon className="w-6 h-6 text-gray-300" />
                </div>
              )}
            </div>

            {prod.description && (
              <p className="text-xs text-gray-500 mb-3 line-clamp-2">{prod.description}</p>
            )}

            <div className="flex items-center justify-between">
              <div>
                {prod.promo_price ? (
                  <>
                    <span className="text-xs text-gray-400 line-through mr-1">{formatCurrency(prod.price)}</span>
                    <span className="text-sm font-semibold text-paprica">{formatCurrency(prod.promo_price)}</span>
                  </>
                ) : (
                  <span className="text-sm font-semibold">{formatCurrency(prod.price)}</span>
                )}
              </div>

              <div className="flex items-center gap-1">
                <button
                  onClick={() => toggleProduct(prod.id, prod.is_active)}
                  className={`px-2 py-1 text-xs rounded ${prod.is_active ? "bg-green-50 text-green-700" : "bg-gray-100 text-gray-500"}`}
                >
                  {prod.is_active ? "Ativo" : "Inativo"}
                </button>
                <button
                  onClick={() => { setEditingProd(prod); setShowProdForm(true); }}
                  className="p-1.5 hover:bg-gray-100 rounded"
                >
                  <Pencil className="w-3.5 h-3.5 text-gray-400" />
                </button>
                <button
                  onClick={() => deleteProduct(prod.id)}
                  className="p-1.5 hover:bg-paprica/10 rounded"
                >
                  <Trash2 className="w-3.5 h-3.5 text-paprica/60" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {products.length === 0 && (
        <div className="text-center py-12 text-gray-400">
          Nenhum produto cadastrado. Clique em "+ Produto" para começar.
        </div>
      )}

      {/* Category modal */}
      {showCatForm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <form onSubmit={saveCategory} className="bg-white rounded-xl p-6 w-full max-w-md space-y-4">
            <h2 className="text-lg font-semibold">{editingCat ? "Editar categoria" : "Nova categoria"}</h2>
            <input name="name" defaultValue={editingCat?.name} placeholder="Nome da categoria" required className="w-full border rounded-lg px-3 py-2 text-sm" />
            <input name="description" defaultValue={editingCat?.description ?? ""} placeholder="Descrição (opcional)" className="w-full border rounded-lg px-3 py-2 text-sm" />
            <div className="flex gap-2 justify-end">
              <button type="button" onClick={() => { setShowCatForm(false); setEditingCat(null); }} className="px-4 py-2 text-sm border rounded-lg">Cancelar</button>
              {editingCat && (
                <button type="button" onClick={() => { deleteCategory(editingCat.id); setShowCatForm(false); setEditingCat(null); }} className="px-4 py-2 text-sm text-paprica border border-paprica/30 rounded-lg">Excluir</button>
              )}
              <button type="submit" className="px-4 py-2 text-sm bg-paprica text-white rounded-lg">Salvar</button>
            </div>
          </form>
        </div>
      )}

      {/* Product modal */}
      {showProdForm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <form onSubmit={saveProduct} className="bg-white rounded-xl p-6 w-full max-w-lg space-y-4 max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg font-semibold">{editingProd ? "Editar produto" : "Novo produto"}</h2>
            <input name="name" defaultValue={editingProd?.name} placeholder="Nome do produto" required className="w-full border rounded-lg px-3 py-2 text-sm" />
            <textarea name="description" defaultValue={editingProd?.description ?? ""} placeholder="Descrição" rows={3} className="w-full border rounded-lg px-3 py-2 text-sm" />
            <select name="category_id" defaultValue={editingProd?.category_id ?? ""} className="w-full border rounded-lg px-3 py-2 text-sm">
              <option value="">Sem categoria</option>
              {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-gray-500 mb-1">Preço</label>
                <input name="price" type="number" step="0.01" min="0" defaultValue={editingProd?.price} required className="w-full border rounded-lg px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Preço promocional</label>
                <input name="promo_price" type="number" step="0.01" min="0" defaultValue={editingProd?.promo_price ?? ""} className="w-full border rounded-lg px-3 py-2 text-sm" />
              </div>
            </div>
            <div className="flex gap-2 justify-end">
              <button type="button" onClick={() => { setShowProdForm(false); setEditingProd(null); }} className="px-4 py-2 text-sm border rounded-lg">Cancelar</button>
              <button type="submit" className="px-4 py-2 text-sm bg-paprica text-white rounded-lg">Salvar</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
