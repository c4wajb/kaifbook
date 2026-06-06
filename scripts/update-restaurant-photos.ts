import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const PHOTO_MAP: Record<string, { main: string; gallery: string[] }> = {
  "sei-kursk": {
    main: "/images/restaurants/sei.jpg",
    gallery: ["/images/restaurants/sei.jpg"],
  },
  "butylochnaya-kursk": {
    main: "/images/restaurants/butylochnaya.jpg",
    gallery: ["/images/restaurants/butylochnaya.jpg"],
  },
  "alt-kursk": {
    main: "/images/restaurants/alt.jpg",
    gallery: ["/images/restaurants/alt.jpg"],
  },
  "kotleta-kursk": {
    main: "/images/restaurants/kotleta.jpg",
    gallery: ["/images/restaurants/kotleta.jpg"],
  },
  "gogiya-kursk": {
    main: "/images/restaurants/gogiya.jpg",
    gallery: ["/images/restaurants/gogiya.jpg"],
  },
  "tbiladzhio-kursk": {
    main: "/images/restaurants/tbiladzhio.jpg",
    gallery: ["/images/restaurants/tbiladzhio.jpg"],
  },
  "seasons-kursk": {
    main: "/images/restaurants/seasons.png",
    gallery: ["/images/restaurants/seasons.png"],
  },
  "mezonin-kursk": {
    main: "/images/restaurants/mezonin.jpg",
    gallery: ["/images/restaurants/mezonin.jpg"],
  },
  "ispansky-kursk": {
    main: "/images/restaurants/ispansky.jpg",
    gallery: ["/images/restaurants/ispansky.jpg"],
  },
  "culture-kursk": {
    main: "/images/restaurants/culture.jpg",
    gallery: ["/images/restaurants/culture.jpg"],
  },
  "introvert-kursk": {
    main: "/images/restaurants/introvert.jpg",
    gallery: ["/images/restaurants/introvert.jpg"],
  },
  "sava-kursk": {
    main: "/images/restaurants/sava.jpg",
    gallery: ["/images/restaurants/sava.jpg"],
  },
  "akvamarin-kursk": {
    main: "/images/restaurants/akvamarin.jpg",
    gallery: ["/images/restaurants/akvamarin.jpg"],
  },
  "morskoy-konek-kursk": {
    main: "/images/restaurants/morskoy-konek.jpg",
    gallery: ["/images/restaurants/morskoy-konek.jpg"],
  },
  "belaya-akaciya-kursk": {
    main: "/images/restaurants/belaya-akaciya.jpg",
    gallery: ["/images/restaurants/belaya-akaciya.jpg"],
  },
  "pivzavod-kursk": {
    main: "/images/restaurants/pivzavod.jpg",
    gallery: ["/images/restaurants/pivzavod.jpg"],
  },
  "utka-kursk": {
    main: "/images/restaurants/utka.jpg",
    gallery: ["/images/restaurants/utka.jpg"],
  },
  "caramel-kursk": {
    main: "/images/restaurants/caramel.jpg",
    gallery: ["/images/restaurants/caramel.jpg"],
  },
  "ferma-kursk": {
    main: "/images/restaurants/ferma.jpg",
    gallery: ["/images/restaurants/ferma.jpg"],
  },
  "bykovsky-kursk": {
    main: "/images/restaurants/bykovsky.jpg",
    gallery: ["/images/restaurants/bykovsky.jpg"],
  },
  "rivera-kursk": {
    main: "/images/restaurants/rivera.jpg",
    gallery: ["/images/restaurants/rivera.jpg"],
  },
  "redstone-kursk": {
    main: "/images/restaurants/redstone.jpg",
    gallery: ["/images/restaurants/redstone.jpg"],
  },
  "kometa-kursk": {
    main: "/images/restaurants/kometa.jpg",
    gallery: ["/images/restaurants/kometa.jpg"],
  },
  "bloom-coffee-kursk": {
    main: "/images/restaurants/bloom-coffee.png",
    gallery: ["/images/restaurants/bloom-coffee.png"],
  },
  "kanelo-kursk": {
    main: "/images/restaurants/kanelo.jpg",
    gallery: ["/images/restaurants/kanelo.jpg"],
  },
  "donut-bar-kursk": {
    main: "/images/restaurants/donut-bar.jpg",
    gallery: ["/images/restaurants/donut-bar.jpg"],
  },
  "papa-lepit-kursk": {
    main: "/images/restaurants/papa-lepit.jpg",
    gallery: ["/images/restaurants/papa-lepit.jpg"],
  },
};

async function main() {
  let updated = 0;
  let skipped = 0;

  for (const [slug, photos] of Object.entries(PHOTO_MAP)) {
    const restaurant = await prisma.restaurant.findFirst({ where: { slug } });
    if (!restaurant) {
      console.log(`  NOT FOUND: ${slug}`);
      continue;
    }

    await prisma.restaurant.update({
      where: { id: restaurant.id },
      data: {
        mainPhotoUrl: photos.main,
        galleryPhotos: JSON.stringify(photos.gallery),
      },
    });
    updated++;
    console.log(`  OK ${restaurant.title} → ${photos.main}`);
  }

  console.log(`\nDone! Updated: ${updated}, Skipped: ${skipped}`);
}

main().finally(() => prisma.$disconnect());
