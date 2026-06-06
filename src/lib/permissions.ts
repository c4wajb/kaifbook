import { ApiError } from "@/lib/api";
import { isAdmin } from "@/lib/auth";
import { RESTAURANT_WRITE_ROLES, STAFF_ROLES } from "@/lib/constants";
import { prisma } from "@/lib/db";
export function canCreateRestaurant(user: { role: string }) { return (RESTAURANT_WRITE_ROLES as readonly string[]).includes(user.role) || isAdmin(user); }
export function canManageRestaurant(user: { id: string; role: string }, restaurant: { ownerId: string }) { return isAdmin(user) || restaurant.ownerId === user.id; }
export function canEditRestaurant(user: { id: string; role: string }, restaurant: { ownerId: string }) { return isAdmin(user) || ((RESTAURANT_WRITE_ROLES as readonly string[]).includes(user.role) && restaurant.ownerId === user.id); }
export async function hasRestaurantStaffAccess(user: { id: string; role: string }, restaurantId: string) {
  if (!(STAFF_ROLES as readonly string[]).includes(user.role)) return false;
  const access = await prisma.restaurantStaffAccess.findUnique({ where: { restaurantId_userId: { restaurantId, userId: user.id } }, select: { id: true } });
  return Boolean(access);
}
export async function canAccessRestaurant(user: { id: string; role: string }, restaurant: { id: string; ownerId: string }) {
  if (canManageRestaurant(user, restaurant)) return true;
  return hasRestaurantStaffAccess(user, restaurant.id);
}
export async function requireRestaurantAccess(user: { id: string; role: string }, restaurantId: string) {
  const restaurant = await prisma.restaurant.findUnique({ where: { id: restaurantId } });
  if (!restaurant) throw new ApiError(404, "Ресторан не найден");
  if (!canEditRestaurant(user, restaurant)) throw new ApiError(403, "Нет доступа к настройкам ресторана");
  return restaurant;
}
export async function requireRestaurantReadAccess(user: { id: string; role: string }, restaurantId: string) {
  const restaurant = await prisma.restaurant.findUnique({ where: { id: restaurantId } });
  if (!restaurant) throw new ApiError(404, "Ресторан не найден");
  if (!(await canAccessRestaurant(user, restaurant))) throw new ApiError(403, "Нет доступа к ресторану");
  return restaurant;
}
export async function requireHallAccess(user: { id: string; role: string }, hallId: string) {
  const hall = await prisma.hall.findUnique({ where: { id: hallId }, include: { restaurant: true } });
  if (!hall) throw new ApiError(404, "Зал не найден");
  if (!canEditRestaurant(user, hall.restaurant)) throw new ApiError(403, "Нет доступа к залу");
  return hall;
}
export async function requireTableAccess(user: { id: string; role: string }, tableId: string) {
  const table = await prisma.restaurantTable.findUnique({ where: { id: tableId }, include: { restaurant: true } });
  if (!table) throw new ApiError(404, "Стол не найден");
  if (!canEditRestaurant(user, table.restaurant)) throw new ApiError(403, "Нет доступа к столу");
  return table;
}
export async function requireMenuCategoryAccess(user: { id: string; role: string }, categoryId: string) {
  const category = await prisma.menuCategory.findUnique({ where: { id: categoryId }, include: { restaurant: true } });
  if (!category) throw new ApiError(404, "Категория меню не найдена");
  if (!canEditRestaurant(user, category.restaurant)) throw new ApiError(403, "Нет доступа к меню");
  return category;
}
export async function requireMenuItemAccess(user: { id: string; role: string }, itemId: string) {
  const item = await prisma.menuItem.findUnique({ where: { id: itemId }, include: { restaurant: true } });
  if (!item) throw new ApiError(404, "Позиция меню не найдена");
  if (canEditRestaurant(user, item.restaurant)) return item;
  if (await canAccessRestaurant(user, item.restaurant)) return item;
  throw new ApiError(403, "Нет доступа к меню");
}
/** Get the list of restaurant IDs a staff user has access to */
export async function getStaffRestaurantIds(userId: string) {
  const records = await prisma.restaurantStaffAccess.findMany({ where: { userId }, select: { restaurantId: true } });
  return records.map((r) => r.restaurantId);
}
