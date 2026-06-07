import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CalendarCheck, Clock3, MapPin, Star, WalletCards } from "lucide-react";
import { AgeGate } from "@/components/AgeGate";
import { VkMiniAppShell } from "@/components/VkMiniAppShell";
import { isAdultOnlyRestaurant } from "@/lib/adult-content";
import { formatList, formatMoney } from "@/lib/format";
import { parseStringList } from "@/lib/json-fields";
import { getRestaurantBySlug } from "@/lib/public-data";

type Props = { params: Promise<{ slug: string }> };

const fallbackImage = "/images/stock/restaurants/dining-01.jpg";
const dishFallback = "/images/stock/menu/dish-fallback.jpg";

export default async function VkMiniRestaurantPage({ params }: Props) {
  const { slug } = await params;
  const restaurant = await getRestaurantBySlug(slug);
  if (!restaurant) notFound();
  const requiresAgeGate = isAdultOnlyRestaurant(restaurant);

  const gallery = parseStringList(restaurant.galleryPhotos);
  const heroImage = restaurant.mainPhotoUrl || gallery[0] || fallbackImage;
  const today = restaurant.workingHours.find((hour) => hour.dayOfWeek === new Date().getDay());
  const ratingText = restaurant.rating > 0 ? restaurant.rating.toFixed(1).replace(".", ",") : null;
  const hasMenu = restaurant.menuCategories.some((category) => category.items.length > 0);

  return (
    <VkMiniAppShell active="home">
      {requiresAgeGate ? <AgeGate /> : null}
      <section className="vk-mini-place-hero">
        <Image src={heroImage} alt={restaurant.title} fill priority sizes="100vw" />
        <div className="vk-mini-place-overlay" />
        <div className="vk-mini-place-content">
          <p className="eyebrow">{formatList(restaurant.cuisineTypes)}</p>
          <h1>{restaurant.title}</h1>
          <p>{restaurant.shortDescription}</p>
          <div className="vk-mini-place-meta">
            {ratingText ? (
              <span>
                <Star size={15} aria-hidden />
                {ratingText}
              </span>
            ) : null}
            <span>
              <MapPin size={15} aria-hidden />
              {restaurant.address}
            </span>
            <span>
              <WalletCards size={15} aria-hidden />
              Средний чек {formatMoney(restaurant.averageCheck)}
            </span>
          </div>
          <Link className="button full vk-mini-book-button" href={`/vk-mini/restaurants/${restaurant.slug}/booking`}>
            <CalendarCheck size={18} aria-hidden />
            Забронировать стол
          </Link>
        </div>
      </section>

      <section className="vk-mini-section">
        <p className="eyebrow">О ресторане</p>
        <h2>{restaurant.title}</h2>
        <p className="vk-mini-text">{restaurant.description || restaurant.shortDescription}</p>
        <div className="vk-mini-facts">
          <span>
            <Clock3 size={16} aria-hidden />
            {today && !today.isClosed ? `Сегодня до ${today.closeTime}` : "Сегодня закрыто"}
          </span>
          <span>
            <MapPin size={16} aria-hidden />
            {restaurant.city}, {restaurant.address}
          </span>
        </div>
      </section>

      {gallery.length ? (
        <section className="vk-mini-section">
          <div className="vk-mini-section-head">
            <h2>Галерея</h2>
            <span>{gallery.length}</span>
          </div>
          <div className="vk-mini-gallery-track">
            {[heroImage, ...gallery].slice(0, 8).map((photo, index) => (
              <div className="vk-mini-gallery-card" key={`${photo}-${index}`}>
                <Image src={photo} alt={`${restaurant.title}, фото ${index + 1}`} fill sizes="78vw" />
              </div>
            ))}
          </div>
        </section>
      ) : null}

      <section className="vk-mini-section">
        <div className="vk-mini-section-head">
          <h2>Меню</h2>
          <span>{hasMenu ? "позиции" : "скоро"}</span>
        </div>
        {hasMenu ? (
          <div className="vk-mini-menu">
            {restaurant.menuCategories.map((category) =>
              category.items.length ? (
                <div className="vk-mini-menu-category" key={category.id}>
                  <h3>{category.title}</h3>
                  <div className="vk-mini-menu-track">
                    {category.items.slice(0, 8).map((item) => (
                      <article className="vk-mini-dish-card" key={item.id}>
                        <div className="vk-mini-dish-image">
                          <Image src={item.photoUrl || dishFallback} alt={item.title} fill sizes="180px" />
                        </div>
                        <strong>{item.title}</strong>
                        <span>{item.weight || "в наличии"}</span>
                        <b>{formatMoney(item.price)}</b>
                      </article>
                    ))}
                  </div>
                </div>
              ) : null,
            )}
          </div>
        ) : (
          <div className="empty-state vk-mini-empty">Меню пока не добавлено.</div>
        )}
      </section>
    </VkMiniAppShell>
  );
}
