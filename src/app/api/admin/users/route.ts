import { handleApiError, ok, requireAdmin } from "@/lib/api";
import { prisma } from "@/lib/db";
export async function GET() { try { await requireAdmin(); const users = await prisma.user.findMany({ select: { id: true, fullName: true, email: true, phone: true, role: true, isActive: true, createdAt: true, _count: { select: { restaurants: true, reservations: true } } }, orderBy: { createdAt: "desc" } }); return ok({ users }); } catch (error) { return handleApiError(error); } }
