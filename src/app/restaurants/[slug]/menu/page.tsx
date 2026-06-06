import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { MenuOrderPage } from "@/components/MenuOrderPage";
import { getRestaurantBySlug } from "@/lib/public-data";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const restaurant = await getRestaurantBySlug(slug);
  if (!restaurant) return {};
  return {
    title: `Меню — ${restaurant.title}`,
    description: `Полное меню ресторана ${restaurant.title}. Закуски, горячее, десерты, напитки и цены.`,
  };
}

export const dynamic = "force-dynamic";

export default async function MenuPage({ params }: Props) {
  const { slug } = await params;
  const restaurant = await getRestaurantBySlug(slug);
  if (!restaurant) notFound();

  const filledCategories = restaurant.menuCategories
    .filter((c) => c.items.length > 0)
    .map((c) => ({
      id: c.id,
      title: c.title,
      items: c.items.map((i) => ({
        id: i.id,
        title: i.title,
        description: i.description,
        price: i.price,
        weight: i.weight,
        photoUrl: i.photoUrl,
      })),
    }));

  return (
    <MenuOrderPage
      restaurantSlug={restaurant.slug}
      restaurantTitle={restaurant.title}
      categories={filledCategories}
      showQr
    />
  );
}
