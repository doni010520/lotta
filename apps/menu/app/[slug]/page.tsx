export const revalidate = 60; // ISR: revalidate every 60 seconds

import { createServiceClient } from "@/lib/supabase";
import { notFound } from "next/navigation";
import { MenuClient } from "@/components/menu-client";

interface Props {
  params: Promise<{ slug: string }>;
}

async function getData(slug: string) {
  const supabase = createServiceClient();

  const { data: restaurant } = await supabase
    .from("restaurants")
    .select("id, name, slug, logo_url, is_open, min_order, avg_prep_time")
    .eq("slug", slug)
    .single();

  if (!restaurant) return null;

  const { data: categories } = await supabase
    .from("categories")
    .select("*")
    .eq("restaurant_id", restaurant.id)
    .eq("is_active", true)
    .order("sort_order");

  const { data: products } = await supabase
    .from("products")
    .select("*, option_groups(*, options(*))")
    .eq("restaurant_id", restaurant.id)
    .eq("is_active", true)
    .order("sort_order");

  const { data: zones } = await supabase
    .from("delivery_zones")
    .select("*")
    .eq("restaurant_id", restaurant.id)
    .eq("is_active", true)
    .order("sort_order");

  // Top sellers (last 90 days)
  const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString();
  const { data: topSellers } = await supabase
    .from("order_items")
    .select("product_id, product_name")
    .eq("restaurant_id", restaurant.id)
    .gte("created_at", ninetyDaysAgo)
    .limit(100);

  // Count by product_id
  const counts: Record<string, { name: string; count: number }> = {};
  (topSellers ?? []).forEach((item) => {
    if (!item.product_id) return;
    if (!counts[item.product_id]) counts[item.product_id] = { name: item.product_name, count: 0 };
    counts[item.product_id].count++;
  });

  const topProductIds = Object.entries(counts)
    .sort((a, b) => b[1].count - a[1].count)
    .slice(0, 6)
    .map(([id]) => id);

  return { restaurant, categories: categories ?? [], products: products ?? [], zones: zones ?? [], topProductIds };
}

export default async function MenuPage({ params }: Props) {
  const { slug } = await params;
  const data = await getData(slug);
  if (!data) notFound();

  return <MenuClient {...data} />;
}
