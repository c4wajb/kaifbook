"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Clock3, MapPin, Star, WalletCards } from "lucide-react";
import { useMemo, useState } from "react";
import { formatMoney } from "@/lib/format";
import { parseStringList } from "@/lib/json-fields";
import { RestaurantCardGallery } from "@/components/RestaurantCardGallery";

type WorkingHour = { dayOfWeek: number; openTime: string; closeTime: string; isClosed: boolean };
type RestaurantCardProps = {
  restaurant: {
    title: string;
    slug: string;
    shortDescription: string;
    address: string;
    city: string;
    averageCheck: number;
    rating?: number | null;
    reviewsCount?: number | null;
    distanceText?: string | null;
    cuisineTypes: string;
    features?: string | null;
    tags?: string | null;
    badges?: string | null;
    mainPhotoUrl: string | null;
    galleryPhotos?: string | null;
    workingHours?: WorkingHour[];
  };
  compact?: boolean;
  restaurantBasePath?: string;
  bookingPath?: "reserve" | "book" | "booking";
  variant?: "default" | "mini";
};

function todayHours(hours?: WorkingHour[]) {
  const today = new Date().getDay();
  const current = hours?.find((item) => item.dayOfWeek === today);
  if (!current || current.isClosed) return "Сегодня закрыто";
  return `Сегодня до ${current.closeTime}`;
}

export function RestaurantCard({ restaurant, compact = false, restaurantBasePath = "/restaurants", bookingPath = "reserve", variant = "default" }: RestaurantCardProps) {
  const router = useRouter();
  const cuisines = parseStringList(restaurant.cuisineTypes).filter(Boolean);
  const features = parseStringList(restaurant.features || "[]").filter(Boolean);
  const tags = parseStringList(restaurant.tags || "[]").filter(Boolean);
  const badges = parseStringList(restaurant.badges || "[]").filter(Boolean);
  const cardHref = `${restaurantBasePath}/${restaurant.slug}`;
  const bookHref = `${restaurantBasePath}/${restaurant.slug}/${bookingPath}`;
  const photos = useMemo(() => {
    const list = [restaurant.mainPhotoUrl, ...parseStringList(restaurant.galleryPhotos || "[]")]
      .filter((photo): photo is string => Boolean(photo))
      .filter((photo, index, list) => list.indexOf(photo) === index);
    return list.slice(0, 5);
  }, [restaurant.galleryPhotos, restaurant.mainPhotoUrl]);
  const [hovered, setHovered] = useState(false);
  const cuisineBadge = cuisines.slice(0, 2).join(", ") || "ресторан";
  const rating = restaurant.rating && restaurant.rating > 0 ? restaurant.rating.toFixed(1).replace(".", ",") : null;

  return (
    <article
      className={`restaurant-card luxury-restaurant-card ${compact ? "restaurant-card-compact" : ""} ${variant === "mini" ? "restaurant-card-mini" : ""}`}
      role="link"
      tabIndex={0}
      aria-label={`Открыть ресторан ${restaurant.title}`}
      onClick={() => router.push(cardHref)}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          router.push(cardHref);
        }
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onFocus={() => setHovered(true)}
      onBlur={() => setHovered(false)}
    >
      <Link className="card-image-link luxury-card-media" href={cardHref} aria-label={`Открыть ${restaurant.title}`}>
        <span className="image-loading-surface" aria-hidden />
        <RestaurantCardGallery images={photos} restaurantName={restaurant.title} autoplayActive={hovered} priority={!compact} />
        <span className="restaurant-card-cuisine-badge">{cuisineBadge}</span>
        {rating ? (
          <span className="restaurant-card-rating-badge">
            <Star size={14} aria-hidden />
            {rating}
            {restaurant.reviewsCount ? <small>{restaurant.reviewsCount} оценок</small> : null}
          </span>
        ) : null}
      </Link>

      <div className="restaurant-card-body luxury-card-body">
        <div className="restaurant-card-title-block">
          <h3>{restaurant.title}</h3>
          {!compact && restaurant.shortDescription ? <p>{restaurant.shortDescription}</p> : null}
        </div>

        {badges.length ? (
          <div className="restaurant-card-badges" aria-label="Бейджи">
            {badges.slice(0, compact ? 2 : 3).map((badge) => (
              <span key={badge}>{badge}</span>
            ))}
          </div>
        ) : null}

        {features.length || tags.length ? (
          <div className="restaurant-card-chips" aria-label="Особенности">
            {[...features, ...tags].slice(0, compact ? 2 : 3).map((feature) => (
              <span key={feature}>{feature}</span>
            ))}
          </div>
        ) : null}

        <div className="restaurant-card-info" aria-label="Информация о ресторане">
          <span title={`${restaurant.city}, ${restaurant.address}`}>
            <MapPin size={17} aria-hidden />
            {restaurant.distanceText ? `${restaurant.distanceText} · ` : ""}
            {restaurant.address}
          </span>
          <span className="open-status">
            <Clock3 size={17} aria-hidden />
            {todayHours(restaurant.workingHours)}
          </span>
          <span>
            <WalletCards size={17} aria-hidden />
            Средний чек {formatMoney(restaurant.averageCheck)}
          </span>
        </div>

        <Link className="restaurant-card-book-button" href={bookHref} onClick={(event) => event.stopPropagation()}>
          Забронировать стол
        </Link>
      </div>
    </article>
  );
}
