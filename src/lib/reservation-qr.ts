import { reservationDateLabel } from "@/lib/format";

type ReservationQrInput = {
  id: string;
  confirmationToken?: string | null;
  customerName: string;
  customerPhone: string;
  guestsCount: number;
  reservationDate: Date;
  startTime: string;
  endTime: string;
  selectedSeatNumbers?: string | null;
  restaurant: {
    title: string;
    address?: string | null;
  };
  table?: {
    number: string;
  } | null;
};

export function parseReservationSeatNumbers(value?: string | null) {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed)
      ? parsed.map((item) => String(item).split(":seat-")[1] || String(item)).filter(Boolean)
      : [];
  } catch {
    return [];
  }
}

export function publicAppUrl() {
  return (process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL || "http://localhost:3000").replace(/\/+$/, "");
}

export function reservationQrUrl(token?: string | null) {
  return token ? `/api/public/reservations/confirm/${encodeURIComponent(token)}/qr` : null;
}

export function buildReservationQrText(reservation: ReservationQrInput, appUrl = publicAppUrl()) {
  const selectedSeats = parseReservationSeatNumbers(reservation.selectedSeatNumbers);
  const seatsCount = selectedSeats.length || reservation.guestsCount;
  const tableText = reservation.table?.number ? `Стол ${reservation.table.number}` : "Стол подберет ресторан";
  const confirmationUrl = reservation.confirmationToken ? `${appUrl}/reservation/confirm/${reservation.confirmationToken}` : null;

  return [
    "Kaifbook",
    `Бронь: ${reservation.id}`,
    `Ресторан: ${reservation.restaurant.title}`,
    reservation.restaurant.address ? `Адрес: ${reservation.restaurant.address}` : null,
    `Дата: ${reservationDateLabel(reservation.reservationDate)}`,
    `Время: ${reservation.startTime}-${reservation.endTime}`,
    `Стол: ${tableText}`,
    `Мест: ${seatsCount}`,
    selectedSeats.length ? `Номера мест: ${selectedSeats.join(", ")}` : null,
    `Количество гостей: ${reservation.guestsCount}`,
    `Гость: ${reservation.customerName}`,
    `Телефон: ${reservation.customerPhone}`,
    confirmationUrl ? `Управление бронью: ${confirmationUrl}` : null,
  ]
    .filter(Boolean)
    .join("\n");
}
