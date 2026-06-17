import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { notFound } from "next/navigation";
import { AgeGate } from "@/components/restaurant/AgeGate";
import { ReservationForm } from "@/components/reservations/ReservationForm";
import { getCurrentUser } from "@/lib/auth";
import { isAdultOnlyRestaurant } from "@/lib/adult-content";
import { getRestaurantBySlug } from "@/lib/public-data";

type Props = { params: Promise<{ slug: string }> };

export const dynamic = "force-dynamic";

export default async function ShortBookingPage({ params }: Props) {
  const { slug } = await params;
  const restaurant = await getRestaurantBySlug(slug);
  if (!restaurant) notFound();

  const currentUser = await getCurrentUser();
  const guestSession = currentUser?.role === "customer" && currentUser.phone ? currentUser : null;
  const initialCustomerName = guestSession?.fullName && guestSession.fullName !== "Гость Kaifbook" ? guestSession.fullName : "";
  const requiresAgeGate = isAdultOnlyRestaurant(restaurant);

  return (
    <div className="page public-reserve-page">
      {requiresAgeGate ? <AgeGate /> : null}
      <div className="reserve-topbar">
        <Link className="booking-top-return" href={`/restaurants/${restaurant.slug}`} aria-label="Вернуться к ресторану">
          <span aria-hidden><ArrowLeft size={15} /></span>
          <span>К ресторану</span>
        </Link>
        <div className="reserve-topbar-title">
          <span className="reserve-eyebrow">Быстрое бронирование</span>
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
