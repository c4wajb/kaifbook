import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const orgIds: Record<string, string> = {
  "kryzhovnik-kursk": "215753176186",
  "sei-kursk": "160832537458",
  "alt-kursk": "116797660187",
  "kotleta-kursk": "155552536673",
  "gogiya-kursk": "53457877829",
  "tbiladzhio-kursk": "184379975123",
  "seasons-kursk": "127233951964",
  "mezonin-kursk": "1721939723",
  "ispansky-kursk": "53375924556",
  "introvert-kursk": "195603146001",
  "akvamarin-kursk": "1683986916",
  "morskoy-konek-kursk": "186451634544",
  "belaya-akaciya-kursk": "228902487406",
  "pivzavod-kursk": "162714095388",
  "utka-kursk": "106217173081",
  "bykovsky-kursk": "146368141469",
  "rivera-kursk": "1296981347",
  "kometa-kursk": "198075708799",
  "bloom-coffee-kursk": "158463486581",
  "kanelo-kursk": "177994711354",
  "donut-bar-kursk": "1705855463",
  "papa-lepit-kursk": "80455666978",
};

async function main() {
  for (const [slug, yandexOrgId] of Object.entries(orgIds)) {
    const result = await prisma.restaurant.updateMany({
      where: { slug },
      data: { yandexOrgId },
    });
    console.log(`${slug}: ${result.count > 0 ? "updated" : "not found"}`);
  }
  console.log("\nDone!");
}

main().finally(() => prisma.$disconnect());
