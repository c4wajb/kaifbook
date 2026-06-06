import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { ADMIN_ROLES, OWNER_ROLES } from "@/lib/constants";
export async function requirePageUser(next = "/") { const user = await getCurrentUser(); if (!user) redirect(`/login?next=${encodeURIComponent(next)}`); return user; }
export async function requireOwnerPageUser(next = "/owner/dashboard") { const user = await requirePageUser(next); if (!(OWNER_ROLES as readonly string[]).includes(user.role)) redirect("/owner/login"); return user; }
export async function requireAdminPageUser(next = "/admin") { const user = await requirePageUser(next); if (!(ADMIN_ROLES as readonly string[]).includes(user.role)) redirect("/owner/login"); return user; }
