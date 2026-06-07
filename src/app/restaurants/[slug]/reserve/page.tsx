import Link from "next/link";
import { notFound } from "next/navigation";
import { AgeGate } from "@/components/AgeGate";
import { ReservationForm } from "@/components/ReservationForm";
import { isAdultOnlyRestaurant } from "@/lib/adult-content";
import { getCurrentUser } from "@/lib/auth";
import { getRestaurantBySlug } from "@/lib/public-data";

type Props = { params: Promise<{ slug: string }> };

export const dynamic = "force-dynamic";

export default async function ReservePage({ params }: Props) {
  const { slug } = await params;
  const restaurant = await getRestaurantBySlug(slug);
  if (!restaurant) notFound();
  const requiresAgeGate = isAdultOnlyRestaurant(restaurant);

  const currentUser = await getCurrentUser();
  const guestSession = currentUser?.role === "customer" && currentUser.phone ? currentUser : null;
  const initialCustomerName = guestSession?.fullName && guestSession.fullName !== "Гость Kaifbook" ? guestSession.fullName : "";

  return (
    <div className="page public-reserve-page">
      {requiresAgeGate ? <AgeGate /> : null}
      <div className="page-title">
        <Link className="booking-top-return" href={`/restaurants/${restaurant.slug}`} aria-label="Вернуться к ресторану">
          <span aria-hidden>←</span>
          <span>К ресторану</span>
        </Link>
        <p className="eyebrow">Бронирование</p>
        <h1>{restaurant.title}</h1>
        <p>Выберите дату, время и стол. Если вы уже вошли в личный кабинет, заявка сохранится в ваших бронях.</p>
      </div>
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
        restaurantId={restaurant.id}
        restaurantSlug={restaurant.slug}
        restaurantTitle={restaurant.title}
        workingHours={restaurant.workingHours}
      />
    </div>
  );
}
