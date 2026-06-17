import Link from "next/link";
import { notFound } from "next/navigation";
import { AgeGate } from "@/components/restaurant/AgeGate";
import { ReservationForm } from "@/components/reservations/ReservationForm";
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
      <div className="reserve-topbar">
        <Link className="booking-top-return" href={`/restaurants/${restaurant.slug}`} aria-label="Вернуться к ресторану">
          <span aria-hidden>←</span>
          <span>К ресторану</span>
        </Link>
        <div className="reserve-topbar-title">
          <span className="reserve-eyebrow">Бронирование столика</span>
          <h1>{restaurant.title}</h1>
        </div>
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
        requirePhoneConfirmation={restaurant.settings?.requirePhoneConfirmation ?? false}
        restaurantId={restaurant.id}
        restaurantSlug={restaurant.slug}
        restaurantTitle={restaurant.title}
        workingHours={restaurant.workingHours}
      />
    </div>
  );
}
