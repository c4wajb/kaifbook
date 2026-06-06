import Link from "next/link";
import { notFound } from "next/navigation";
import { ReservationForm } from "@/components/ReservationForm";
import { VkMiniAppShell } from "@/components/VkMiniAppShell";
import { getCurrentUser } from "@/lib/auth";
import { getRestaurantBySlug } from "@/lib/public-data";

type Props = { params: Promise<{ slug: string }> };

export const dynamic = "force-dynamic";

export default async function VkMiniBookingPage({ params }: Props) {
  const { slug } = await params;
  const restaurant = await getRestaurantBySlug(slug);
  if (!restaurant) notFound();

  const currentUser = await getCurrentUser();
  const guestSession = currentUser?.role === "customer" && currentUser.phone ? currentUser : null;
  const initialCustomerName = guestSession?.fullName && guestSession.fullName !== "Гость Kaifbook" ? guestSession.fullName : "";

  return (
    <VkMiniAppShell active="home">
      <Link className="booking-top-return vk-mini-back" href={`/vk-mini/restaurants/${restaurant.slug}`} aria-label="Вернуться к ресторану">
        <span aria-hidden>←</span>
        <span>К ресторану</span>
      </Link>
      <section className="vk-mini-section vk-mini-booking-intro">
        <p className="eyebrow">Бронирование</p>
        <h1>{restaurant.title}</h1>
        <p>Выберите дату, время и стол. Заявка появится в разделе <Link href="/vk-mini/bookings">Мои брони</Link>.</p>
      </section>

      <ReservationForm
        authenticatedGuest={Boolean(guestSession)}
        bookingIntervalMinutes={restaurant.settings?.bookingIntervalMinutes ?? 15}
        halls={restaurant.halls}
        initialCustomerName={initialCustomerName}
        initialCustomerPhone={guestSession?.phone ?? ""}
        maxAdvanceBookingDays={restaurant.settings?.maxAdvanceBookingDays ?? 30}
        minAdvanceBookingMinutes={restaurant.settings?.minAdvanceBookingMinutes ?? 30}
        myReservationsHref="/vk-mini/bookings"
        reservationDurationMinutes={restaurant.settings?.reservationDurationMinutes ?? 120}
        restaurantId={restaurant.id}
        restaurantSlug={restaurant.slug}
        restaurantTitle={restaurant.title}
        source="vk-mini-app"
        workingHours={restaurant.workingHours}
      />
    </VkMiniAppShell>
  );
}
