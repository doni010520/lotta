"use client";

import { useState, useEffect } from "react";
import { Search, ShoppingBag } from "lucide-react";
import { useCart } from "@/lib/cart";
import { formatCurrency } from "@/lib/utils";
import { trackEvent } from "@/lib/analytics";
import { ProductModal } from "./product-modal";
import { CartDrawer } from "./cart-drawer";
import { ProductImage } from "./product-image";

interface Props {
  restaurant: any;
  categories: any[];
  products: any[];
  zones: any[];
  topProductIds: string[];
}

export function MenuClient({ restaurant, categories, products, zones, topProductIds }: Props) {
  const [selectedCat, setSelectedCat] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [showCart, setShowCart] = useState(false);
  const { items, itemCount, subtotal } = useCart();

  // Funil de conversão
  useEffect(() => { trackEvent(restaurant.slug, "view_menu"); }, [restaurant.slug]);
  useEffect(() => { if (selectedProduct) trackEvent(restaurant.slug, "view_product", selectedProduct.id); }, [selectedProduct, restaurant.slug]);

  const topProducts = products.filter((p) => topProductIds.includes(p.id));

  // Upsell: mais pedidos (ou primeiros) que ainda não estão no carrinho
  const cartProductIds = new Set(items.map((i) => i.productId));
  const suggestions = (topProducts.length ? topProducts : products)
    .filter((p) => !cartProductIds.has(p.id))
    .slice(0, 6);

  const filtered = products.filter((p) => {
    if (selectedCat && p.category_id !== selectedCat) return false;
    if (search && !p.name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const grouped = categories
    .map((cat) => ({
      ...cat,
      items: filtered.filter((p) => p.category_id === cat.id),
    }))
    .filter((g) => g.items.length > 0);

  const uncategorized = filtered.filter((p) => !p.category_id);

  const pill = (active: boolean) =>
    `px-3.5 py-1.5 text-sm rounded-full whitespace-nowrap transition-colors ${
      active ? "bg-paprica text-white font-medium" : "bg-white text-cafe border border-cafe/10 hover:border-paprica/40"
    }`;

  return (
    <>
      {/* Search */}
      <div className="px-4 py-3 bg-white border-b border-cafe/10">
        <div className="relative">
          <label htmlFor="menu-search" className="sr-only">Buscar no cardápio</label>
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" aria-hidden="true" />
          <input
            id="menu-search"
            type="search"
            placeholder="Buscar no cardápio..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-creme rounded-xl text-sm text-cafe placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-paprica/25"
          />
        </div>
      </div>

      {/* Category tabs */}
      {categories.length > 0 && !search && (
        <div className="px-4 py-2 bg-white border-b border-cafe/10 overflow-x-auto">
          <div className="flex gap-2 min-w-max">
            <button onClick={() => setSelectedCat(null)} className={pill(!selectedCat)}>
              Todos
            </button>
            {categories.map((cat) => (
              <button key={cat.id} onClick={() => setSelectedCat(cat.id)} className={pill(selectedCat === cat.id)}>
                {cat.name}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="px-4 pb-32">
        {/* Top sellers */}
        {!search && !selectedCat && topProducts.length > 0 && (
          <section className="py-4">
            <h2 className="font-display font-semibold text-sm text-muted uppercase tracking-wider mb-3">Mais pedidos</h2>
            <div className="grid grid-cols-2 gap-3">
              {topProducts.slice(0, 4).map((prod) => (
                <button
                  key={prod.id}
                  onClick={() => setSelectedProduct(prod)}
                  className="bg-white rounded-xl border border-cafe/10 p-3 text-left hover:shadow-md hover:border-paprica/30 transition-all"
                >
                  <ProductImage src={prod.image_url} alt={prod.name} sizes="(max-width: 640px) 45vw, 220px" className="w-full h-24 rounded-lg mb-2" />
                  <p className="text-sm font-medium text-cafe line-clamp-1">{prod.name}</p>
                  <p className="text-sm font-semibold text-paprica mt-1">
                    {formatCurrency(prod.promo_price ?? prod.price)}
                  </p>
                </button>
              ))}
            </div>
          </section>
        )}

        {/* Products by category */}
        {grouped.map((group) => (
          <section key={group.id} className="py-4">
            <h2 className="font-display font-semibold text-base text-cafe mb-3">{group.name}</h2>
            <div className="space-y-2">
              {group.items.map((prod: any) => (
                <button
                  key={prod.id}
                  onClick={() => setSelectedProduct(prod)}
                  className="w-full bg-white rounded-xl border border-cafe/10 p-3 flex gap-3 text-left hover:shadow-md hover:border-paprica/30 transition-all"
                >
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm text-cafe">{prod.name}</p>
                    {prod.description && (
                      <p className="text-xs text-muted mt-0.5 line-clamp-2">{prod.description}</p>
                    )}
                    <div className="mt-2">
                      {prod.promo_price ? (
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-muted/70 line-through">{formatCurrency(prod.price)}</span>
                          <span className="text-sm font-semibold text-paprica">{formatCurrency(prod.promo_price)}</span>
                        </div>
                      ) : (
                        <span className="text-sm font-semibold text-cafe">{formatCurrency(prod.price)}</span>
                      )}
                    </div>
                  </div>
                  <ProductImage src={prod.image_url} alt={prod.name} sizes="80px" className="w-20 h-20 rounded-lg flex-shrink-0" />
                </button>
              ))}
            </div>
          </section>
        ))}

        {uncategorized.length > 0 && (
          <section className="py-4">
            <h2 className="font-display font-semibold text-base text-cafe mb-3">Outros</h2>
            <div className="space-y-2">
              {uncategorized.map((prod) => (
                <button
                  key={prod.id}
                  onClick={() => setSelectedProduct(prod)}
                  className="w-full bg-white rounded-xl border border-cafe/10 p-3 flex gap-3 text-left hover:shadow-md hover:border-paprica/30 transition-all"
                >
                  <div className="flex-1">
                    <p className="font-medium text-sm text-cafe">{prod.name}</p>
                    <p className="text-sm font-semibold text-cafe mt-1">{formatCurrency(prod.promo_price ?? prod.price)}</p>
                  </div>
                  <ProductImage src={prod.image_url} alt={prod.name} sizes="80px" className="w-20 h-20 rounded-lg flex-shrink-0" />
                </button>
              ))}
            </div>
          </section>
        )}

        {filtered.length === 0 && (
          <div className="text-center py-12 text-muted text-sm">Nenhum produto encontrado</div>
        )}
      </div>

      {/* Floating cart button */}
      {itemCount > 0 && (
        <div className="fixed bottom-0 left-0 right-0 px-4 pt-4 pb-[calc(1rem+env(safe-area-inset-bottom))] bg-gradient-to-t from-creme via-creme to-transparent z-30">
          <div className="max-w-2xl mx-auto">
            <button
              onClick={() => { trackEvent(restaurant.slug, "begin_checkout"); setShowCart(true); }}
              className="w-full bg-paprica text-white rounded-xl py-3.5 px-4 flex items-center justify-between font-medium shadow-lg hover:bg-paprica-dark transition-colors"
            >
              <div className="flex items-center gap-2">
                <ShoppingBag className="w-5 h-5" aria-hidden="true" />
                <span className="bg-white/20 rounded-full px-2.5 py-0.5 text-sm">{itemCount}</span>
              </div>
              <span>Ver carrinho</span>
              <span className="font-semibold">{formatCurrency(subtotal)}</span>
            </button>
          </div>
        </div>
      )}

      {/* Product modal */}
      {selectedProduct && (
        <ProductModal slug={restaurant.slug} product={selectedProduct} onClose={() => setSelectedProduct(null)} />
      )}

      {/* Cart drawer */}
      {showCart && (
        <CartDrawer
          slug={restaurant.slug}
          minOrder={restaurant.min_order}
          zones={zones}
          suggestions={suggestions}
          onPickSuggestion={(p) => setSelectedProduct(p)}
          onClose={() => setShowCart(false)}
        />
      )}
    </>
  );
}
