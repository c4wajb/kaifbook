import { handleApiError, ok, requireAdmin } from "@/lib/api";
import { prisma } from "@/lib/db";
export async function GET() { try { await requireAdmin(); const restaurants = await prisma.restaurant.findMany({ include: { owner: { select: { id: true, fullName: true, email: true } }, _count: { select: { reservations: true } } }, orderBy: { createdAt: "desc" } }); return ok({ restaurants }); } catch (error) { return handleApiError(error); } }
