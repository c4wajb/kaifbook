import { z } from "zod";
import { ApiError, handleApiError, ok, readJson, requireOwnerAccess } from "@/lib/api";
import { prisma } from "@/lib/db";

type C = { params: Promise<{ restaurantId: string; guestId: string }> };

const schema = z.object({
  tags: z.array(z.string().trim().min(1).max(40)).max(24),
});

function normalizeTags(tags: string[]) {
  const seen = new Set<string>();
  return tags
    .map((tag) => tag.trim())
    .filter(Boolean)
    .filter((tag) => {
      const key = tag.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
}

export async function PATCH(request: Request, context: C) {
  try {
    const { restaurantId, guestId } = await context.params;
    await requireOwnerAccess(restaurantId);

    const guest = await prisma.guest.findFirst({ where: { id: guestId, restaurantId }, select: { id: true } });
    if (!guest) throw new ApiError(404, "Guest not found");

    const payload = schema.parse(await readJson(request));
    const tags = normalizeTags(payload.tags);
    const updated = await prisma.guest.update({
      where: { id: guest.id },
      data: { tags: JSON.stringify(tags) },
    });

    return ok({ guest: updated });
  } catch (error) {
    return handleApiError(error);
  }
}
