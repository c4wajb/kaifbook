import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BadgeRussianRuble, Clock3, MapPin, Phone, PhoneCall, Star, Utensils, WalletCards } from "lucide-react";
import { AgeGate } from "@/components/restaurant/AgeGate";
import { MenuSection } from "@/components/restaurant/MenuSection";
import { ReservationForm } from "@/components/reservations/ReservationForm";
import { RestaurantDistance } from "@/components/restaurant/RestaurantDistance";
import { RestaurantGallery } from "@/components/restaurant/RestaurantGallery";
import { YandexMap } from "@/components/restaurant/YandexMap";
import { isAdultOnlyRestaurant } from "@/lib/adult-content";
import { getCurrentUser } from "@/lib/auth";
import { DAY_LABELS } from "@/lib/constants";
import { formatList, formatMoney } from "@/lib/format";
import { parseStringList } from "@/lib/json-fields";
import { getRestaurantBySlug } from "@/lib/public-data";

type Props = { params: Promise<{ slug: string }> };

const dishFallback = "/images/stock/menu/dish-fallback.jpg";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const restaurant = await getRestaurantBySlug(slug);
  if (!restaurant) return { title: "Ресторан не найден" };

  const title = `${restaurant.title} — забронировать стол | Kaifbook`;
  const description = restaurant.shortDescription || `${restaurant.title} в ${restaurant.city}. Меню, отзывы, бронирование столика онлайн.`;
  const image = restaurant.mainPhotoUrl || undefined;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: "website",
      ...(image ? { images: [{ url: image, alt: restaurant.title }] } : {}),
    },
  };
}

export default async function RestaurantPage({ params }: Props) {
  const { slug } = await params;
  const restaurant = await getRestaurantBySlug(slug);
  if (!restaurant) notFound();
  const requiresAgeGate = isAdultOnlyRestaurant(restaurant);
  const currentUser = await getCurrentUser();
  const guestSession = currentUser?.role === "customer" && currentUser.phone ? currentUser : null;
  const initialCustomerName = guestSession?.fullName && guestSession.fullName !== "Гость Kaifbook" ? guestSession.fullName : "";

  const gallery = parseStringList(restaurant.galleryPhotos);
  const features = parseStringList(restaurant.features);
  const tags = parseStringList(restaurant.tags);
  const badges = parseStringList(restaurant.badges);
  const heroImage = restaurant.mainPhotoUrl || gallery[0] || "/images/stock/restaurants/dining-01.jpg";
  const publicDescription = restaurant.description.replace(/\s*Источник карточки:\s*https?:\/\/\S+/gi, "").trim();
  const today = restaurant.workingHours.find((hour) => hour.dayOfWeek === new Date().getDay());
  const ratingText = restaurant.rating > 0 ? restaurant.rating.toFixed(1).replace(".", ",") : null;
  // Surface the booking/deposit policy texts the owner configured. Deposit
  // policies show only when deposits are on AND "Показывать депозит гостям" is on.
  const showDepositTerms = Boolean(restaurant.showDepositInfo && restaurant.depositSettings?.depositEnabled);
  const bookingTerms = [
    { label: "Политика отмены", text: restaurant.settings?.cancellationPolicyText },
    { label: "Как учитывается депозит", text: showDepositTerms ? restaurant.depositSettings?.depositAccountingText : null },
    { label: "Условия возврата депозита", text: showDepositTerms ? restaurant.depositSettings?.depositRefundPolicyText : null },
    { label: "Важно", text: showDepositTerms ? restaurant.depositSettings?.legalNoticeText : null },
  ].filter((item): item is { label: string; text: string } => Boolean(item.text && item.text.trim()));
  return (
    <div className="restaurant-profile">
      {requiresAgeGate ? <AgeGate /> : null}
      <section className="restaurant-profile-hero">
        <Image src={heroImage} alt={restaurant.title} fill priority loading="eager" sizes="100vw" />
        <div className="profile-hero-overlay" />
        <div className="profile-hero-content">
          <p className="eyebrow">{formatList(restaurant.cuisineTypes)}</p>
          <h1>{restaurant.title}</h1>
          <p>{restaurant.shortDescription}</p>
          <div className="profile-hero-meta">
            {ratingText ? (
              <span>
                <Star size={16} aria-hidden />
                {ratingText} · {restaurant.reviewsCount || restaurant.reviews.length} оценок
              </span>
            ) : null}
            <span>
              <MapPin size={16} aria-hidden />
              <RestaurantDistance latitude={restaurant.latitude} longitude={restaurant.longitude} fallback={restaurant.distanceText} />
              {restaurant.address}
            </span>
            <span>
              <Clock3 size={16} aria-hidden />
              {today && !today.isClosed ? `Сегодня до ${today.closeTime}` : "Сегодня закрыто"}
            </span>
            <span>
              <WalletCards size={16} aria-hidden />
              Средний чек {formatMoney(restaurant.averageCheck)}
            </span>
          </div>
          {badges.length ? (
            <div className="profile-badge-row">
              {badges.slice(0, 4).map((badge) => (
                <span key={badge}>{badge}</span>
              ))}
            </div>
          ) : null}
          <Link className="button client-cta" href={`/restaurants/${restaurant.slug}/book`}>
            Забронировать стол
          </Link>
        </div>
      </section>

      <nav className="restaurant-anchor-nav" aria-label="Разделы ресторана">
        <a href="#about">О ресторане</a>
        <a href="#gallery">Галерея</a>
        <a href="#menu">Меню</a>
        <a href="#reviews">Отзывы</a>
        <a href="#route">Как добраться</a>
        <a href="#reserve">Забронировать</a>
      </nav>

      <main className="page restaurant-profile-content single-column">
        <div className="profile-main">
          <section className="profile-section" id="about">
            <h2>О ресторане</h2>
            {[...features, ...tags].length ? (
              <div className="tag-row">
                {[...features, ...tags].slice(0, 10).map((feature) => (
                  <span key={feature}>{feature}</span>
                ))}
              </div>
            ) : null}
            <p>{publicDescription || restaurant.shortDescription}</p>
          </section>

          {gallery.length ? (
            <section className="profile-section" id="gallery">
              <h2>Галерея</h2>
              <RestaurantGallery title={restaurant.title} photos={[heroImage, ...gallery]} />
            </section>
          ) : null}

          <section className="profile-section" id="menu">
            <MenuSection
              categories={restaurant.menuCategories}
              restaurantSlug={restaurant.slug}
              restaurantTitle={restaurant.title}
              menuPageHref={`/restaurants/${restaurant.slug}/menu`}
            />
          </section>

          <section className="profile-section" id="reviews">
            <div className="section-heading">
              <h2>Отзывы</h2>
              {ratingText ? (
                <span className="profile-rating-pill">
                  <Star size={16} aria-hidden />
                  {ratingText} · {restaurant.reviewsCount || restaurant.reviews.length} оценок
                </span>
              ) : null}
            </div>
            {restaurant.reviews.length ? (
              <div className="review-grid">
                {restaurant.reviews.map((review) => (
                  <article className="review-card" key={review.id}>
                    <div className="review-card-head">
                      <strong>{review.authorName}</strong>
                      <span>
                        <Star size={14} aria-hidden />
                        {review.rating}
                      </span>
                    </div>
                    <p>{review.text}</p>
                    <small>{review.source === "demo" ? "Отзыв гостя" : review.source}</small>
                  </article>
                ))}
              </div>
            ) : (
              <div className="empty-state">Отзывов пока нет. После запуска здесь появятся оценки гостей.</div>
            )}
          </section>

          <section className="profile-section" id="route">
            <h2>Как добраться</h2>
            <YandexMap title={restaurant.title} city={restaurant.city} address={restaurant.address} latitude={restaurant.latitude} longitude={restaurant.longitude} yandexOrgId={restaurant.yandexOrgId} />
          </section>

          <section className="profile-facts premium-facts">
            <div className="premium-fact-panel">
              <div className="premium-fact-heading">
                <span className="premium-fact-icon">
                  <Clock3 size={22} aria-hidden />
                </span>
                <h3>Режим работы</h3>
              </div>
              <div className="hours-table premium-hours-table">
                {restaurant.workingHours.map((h) => (
                  <div className="hours-line" key={h.dayOfWeek}>
                    <span>{DAY_LABELS[h.dayOfWeek]}</span>
                    <strong>{h.isClosed ? "Закрыто" : `${h.openTime}-${h.closeTime}`}</strong>
                  </div>
                ))}
              </div>
            </div>
            <div className="premium-fact-panel">
              <div className="premium-fact-heading">
                <span className="premium-fact-icon">
                  <Utensils size={22} aria-hidden />
                </span>
                <h3>Дополнительно</h3>
              </div>
              <div className="profile-fact-grid premium-fact-grid">
                <div className="premium-fact-row">
                  <span className="premium-fact-icon small">
                    <Utensils size={17} aria-hidden />
                  </span>
                  <div>
                    <span>Кухня</span>
                    <strong>{formatList(restaurant.cuisineTypes)}</strong>
                  </div>
                </div>
                <div className="premium-fact-row">
                  <span className="premium-fact-icon small">
                    <BadgeRussianRuble size={17} aria-hidden />
                  </span>
                  <div>
                    <span>Средний чек</span>
                    <strong>{formatMoney(restaurant.averageCheck)}</strong>
                  </div>
                </div>
                <div className="premium-fact-row">
                  <span className="premium-fact-icon small">
                    <PhoneCall size={17} aria-hidden />
                  </span>
                  <div>
                    <span>Телефон</span>
                    <strong>{restaurant.phone}</strong>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <section className="profile-section booking-workspace" id="reserve">
            <ReservationForm
              authenticatedGuest={Boolean(guestSession)}
              bookingIntervalMinutes={restaurant.settings?.bookingIntervalMinutes ?? 15}
              halls={restaurant.halls}
              initialCustomerName={initialCustomerName}
              initialCustomerPhone={guestSession?.phone ?? ""}
              maxAdvanceBookingDays={restaurant.settings?.maxAdvanceBookingDays ?? 30}
              minAdvanceBookingMinutes={restaurant.settings?.minAdvanceBookingMinutes ?? 30}
              myReservationsHref={guestSession ? "/guest/reservations" : undefined}
              reservationDurationMinutes={restaurant.settings?.reservationDurationMinutes ?? 120}
              requirePhoneConfirmation={restaurant.settings?.requirePhoneConfirmation ?? false}
              restaurantId={restaurant.id}
              restaurantSlug={restaurant.slug}
              restaurantTitle={restaurant.title}
              workingHours={restaurant.workingHours}
            />
            <div className="phone-note">
              <Phone size={16} aria-hidden />
              Заявка привязывается к номеру телефона. Регистрация не нужна.
            </div>
            {bookingTerms.length ? (
              <div className="booking-terms">
                <h3>Условия бронирования</h3>
                <div className="stack-list">
                  {bookingTerms.map((item) => (
                    <div className="insight-row" key={item.label}>
                      <strong>{item.label}</strong>
                      <span>{item.text}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
          </section>
        </div>
      </main>
    </div>
  );
}
