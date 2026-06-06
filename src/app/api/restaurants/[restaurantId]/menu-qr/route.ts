import QRCode from "qrcode";
import { prisma } from "@/lib/db";
import { ok } from "@/lib/api";
import { publicAppUrl } from "@/lib/reservation-qr";

type C = { params: Promise<{ restaurantId: string }> };

export async function GET(_req: Request, context: C) {
  const slug = (await context.params).restaurantId;

  const restaurant = await prisma.restaurant.findFirst({
    where: { slug, isActive: true },
    select: { slug: true },
  });

  if (!restaurant) {
    return Response.json({ error: "Not found" }, { status: 404 });
  }

  const menuUrl = `${publicAppUrl()}/restaurants/${restaurant.slug}/menu`;

  const svg = await QRCode.toString(menuUrl, {
    type: "svg",
    errorCorrectionLevel: "M",
    margin: 2,
    width: 360,
    color: {
      dark: "#2c2118",
      light: "#fffdf9",
    },
  });

  return ok({ svg, url: menuUrl });
}
