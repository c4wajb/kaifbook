import { ApiError } from "@/lib/api";
import { prisma } from "@/lib/db";
import { canAccessRestaurant } from "@/lib/permissions";
export async function requireReservationAccess(user: { id: string; role: string }, reservationId: string) {
  const reservation = await prisma.reservation.findUnique({ where: { id: reservationId }, include: { restaurant: true, hall: true, table: true } });
  if (!reservation) throw new ApiError(404, "Заявка не найдена");
  if (reservation.userId !== user.id && !(await canAccessRestaurant(user, reservation.restaurant))) throw new ApiError(403, "Нет доступа к заявке");
  return reservation;
}
export async function requireReservationManagementAccess(user: { id: string; role: string }, reservationId: string) {
  const reservation = await prisma.reservation.findUnique({ where: { id: reservationId }, include: { restaurant: true } });
  if (!reservation) throw new ApiError(404, "Заявка не найдена");
  if (!(await canAccessRestaurant(user, reservation.restaurant))) throw new ApiError(403, "Нет доступа к заявке");
  return reservation;
}
