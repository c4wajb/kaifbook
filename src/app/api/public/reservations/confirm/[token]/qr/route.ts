import QRCode from "qrcode";
import { buildReservationQrText, publicAppUrl } from "@/lib/reservation-qr";
import { getReservationByConfirmationToken } from "@/lib/public-reservation-confirmation";

type C = { params: Promise<{ token: string }> };

export const dynamic = "force-dynamic";

export async function GET(request: Request, context: C) {
  const { token } = await context.params;
  const { searchParams } = new URL(request.url);

  try {
    const reservation = await getReservationByConfirmationToken(token);
    const qrText = buildReservationQrText(reservation, publicAppUrl());
    const svg = await QRCode.toString(qrText, {
      type: "svg",
      errorCorrectionLevel: "M",
      margin: 1,
      width: 360,
      color: {
        dark: "#2c2118",
        light: "#fffdf9",
      },
    });

    const disposition = searchParams.get("download")
      ? `attachment; filename="kaifbook-${reservation.id}.svg"`
      : "inline";

    return new Response(svg, {
      headers: {
        "Cache-Control": "private, no-store",
        "Content-Disposition": disposition,
        "Content-Type": "image/svg+xml; charset=utf-8",
      },
    });
  } catch {
    return new Response("QR-код для этой брони не найден.", { status: 404 });
  }
}
