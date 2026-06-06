import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

function escapeHtml(text: string) {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function formatMoney(amount: number) {
  return new Intl.NumberFormat("ru-RU").format(amount) + " ₽";
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ restaurantId: string }> }) {
  const { restaurantId } = await params;

  const restaurant = await prisma.restaurant.findFirst({
    where: { slug: restaurantId, isActive: true },
    select: {
      title: true,
      address: true,
      phone: true,
      menuCategories: {
        where: { isActive: true },
        orderBy: { sortOrder: "asc" },
        include: {
          items: {
            where: { isAvailable: true },
            orderBy: { sortOrder: "asc" },
          },
        },
      },
    },
  });

  if (!restaurant) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const categories = restaurant.menuCategories.filter((c) => c.items.length > 0);

  // Generate an HTML-based "printable" menu
  const html = `<!DOCTYPE html>
<html lang="ru">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Меню — ${escapeHtml(restaurant.title)}</title>
<style>
@page { size: A4; margin: 20mm 18mm; }
* { box-sizing: border-box; margin: 0; padding: 0; }
body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
  color: #1a1a1a;
  background: #f5f0eb;
  line-height: 1.5;
  padding: 24px 16px;
  min-height: 100vh;
}
.page {
  max-width: 720px;
  margin: 0 auto;
  background: #fff;
  border-radius: 16px;
  box-shadow: 0 2px 20px rgba(0,0,0,0.06);
  padding: 40px 36px;
}
.header {
  text-align: center;
  margin-bottom: 32px;
  padding-bottom: 24px;
  border-bottom: 1.5px solid #e8dcc8;
}
.header h1 {
  font-family: Georgia, 'Times New Roman', serif;
  font-size: 28px;
  color: #2c2118;
  margin-bottom: 8px;
  font-weight: 700;
  letter-spacing: -0.01em;
}
.header .subtitle {
  color: #8c7b6b;
  font-size: 14px;
  letter-spacing: 0.02em;
}
.category {
  margin-bottom: 28px;
  break-inside: avoid;
}
.category h2 {
  font-family: Georgia, 'Times New Roman', serif;
  font-size: 20px;
  color: #6b3d2e;
  margin-bottom: 16px;
  padding-bottom: 8px;
  border-bottom: 1px solid #ede5da;
  font-weight: 600;
  letter-spacing: 0.01em;
}
.item {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  padding: 10px 0;
  gap: 16px;
}
.item + .item {
  border-top: 1px solid #f2ece4;
}
.item-info {
  flex: 1;
  min-width: 0;
}
.item-title {
  font-weight: 600;
  font-size: 15px;
  color: #2c2118;
  line-height: 1.35;
}
.item-desc {
  display: block;
  color: #8c7b6b;
  font-size: 13px;
  margin-top: 2px;
  line-height: 1.4;
}
.item-weight {
  display: inline-block;
  color: #b0a090;
  font-size: 12px;
  margin-top: 3px;
}
.item-price {
  font-weight: 700;
  font-size: 15px;
  color: #6b3d2e;
  white-space: nowrap;
  padding-top: 1px;
}
.footer {
  margin-top: 32px;
  padding-top: 18px;
  border-top: 1.5px solid #e8dcc8;
  text-align: center;
  color: #b0a090;
  font-size: 12px;
}
@media print {
  body { background: #fff; padding: 0; }
  .page { box-shadow: none; padding: 0; border-radius: 0; }
}
@media (max-width: 520px) {
  body { padding: 8px; }
  .page { padding: 24px 18px; border-radius: 12px; }
  .header h1 { font-size: 22px; }
  .category h2 { font-size: 17px; }
}
</style>
</head>
<body>
<div class="page">
<div class="header">
  <h1>${escapeHtml(restaurant.title)}</h1>
  <p class="subtitle">${escapeHtml(restaurant.address)}${restaurant.phone ? ` · ${escapeHtml(restaurant.phone)}` : ""}</p>
</div>
${categories
  .map(
    (cat) => `<div class="category">
  <h2>${escapeHtml(cat.title)}</h2>
  ${cat.items
    .map(
      (item) => `<div class="item">
    <div class="item-info">
      <span class="item-title">${escapeHtml(item.title)}</span>
      ${item.description ? `<span class="item-desc">${escapeHtml(item.description)}</span>` : ""}
      ${item.weight ? `<span class="item-weight">${escapeHtml(item.weight)}</span>` : ""}
    </div>
    <span class="item-price">${formatMoney(item.price)}</span>
  </div>`,
    )
    .join("\n")}
</div>`,
  )
  .join("\n")}
<div class="footer">
  <p>${escapeHtml(restaurant.title)} · Меню может отличаться от актуального</p>
</div>
</div>
</body>
</html>`;

  return new NextResponse(html, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
    },
  });
}
