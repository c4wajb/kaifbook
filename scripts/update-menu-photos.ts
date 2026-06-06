import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// ── Local stock images ──────────────────────────────────────────────
const S = "/images/stock/menu";

// All images are local stock — downloaded to public/images/stock/menu/
const PHOTOS: Record<string, string> = {
  salad: `${S}/salad.jpg`,
  soup: `${S}/soup.jpg`,
  breakfast: `${S}/breakfast.jpg`,
  coffee: `${S}/coffee.jpg`,
  pizza: `${S}/pizza.jpg`,
  sushi: `${S}/sushi.jpg`,
  pasta: `${S}/pasta.jpg`,
  seafood: `${S}/seafood.jpg`,
  steak: `${S}/steak.jpg`,
  bbq: `${S}/bbq.jpg`,
  dessert: `${S}/dessert.jpg`,
  dumplings: `${S}/dumplings.jpg`,
  khinkali: `${S}/khinkali.jpg`,
  bruschetta: `${S}/bruschetta.jpg`,
  lemonade: `${S}/lemonade.jpg`,
  wine: `${S}/wine.jpg`,
  cocktail: `${S}/cocktail.jpg`,
  kids: `${S}/kids.jpg`,
  burger: `${S}/burger.jpg`,
  beer: `${S}/beer.jpg`,
  tea: `${S}/tea.jpg`,
  chicken: `${S}/chicken.jpg`,
  duck: `${S}/duck.jpg`,
  risotto: `${S}/risotto.jpg`,
  cheese: `${S}/cheese.jpg`,
  fish: `${S}/fish.jpg`,
  kebab: `${S}/kebab.jpg`,
  oysters: `${S}/oysters.jpg`,
  mussels: `${S}/mussels.jpg`,
  shrimp: `${S}/shrimp.jpg`,
  crab: `${S}/crab.jpg`,
  tomyum: `${S}/tomyum.jpg`,
  poke: `${S}/poke.jpg`,
  caesar: `${S}/caesar.jpg`,
  benedict: `${S}/benedict.jpg`,
  cheesecake: `${S}/cheesecake.jpg`,
  tiramisu: `${S}/tiramisu.jpg`,
  croissant: `${S}/croissant.jpg`,
  pancakes: `${S}/pancakes.jpg`,
  tartare: `${S}/steak.jpg`,
  carpaccio: `${S}/steak.jpg`,
  lobster: `${S}/seafood.jpg`,
  sashimi: `${S}/sushi.jpg`,
  ravioli: `${S}/pasta.jpg`,
  lamb: `${S}/kebab.jpg`,
  paella: `${S}/seafood.jpg`,
  octopus: `${S}/seafood.jpg`,
  noodles: `${S}/pasta.jpg`,
  hummus: `${S}/bruschetta.jpg`,
  churros: `${S}/dessert.jpg`,
  icecream: `${S}/dessert.jpg`,
  eclair: `${S}/dessert.jpg`,
  gazpacho: `${S}/soup.jpg`,
  khachapuri: `${S}/khinkali.jpg`,
  waffles: `${S}/breakfast.jpg`,
  cake: `${S}/dessert.jpg`,
  granola: `${S}/breakfast.jpg`,
  cider: `${S}/beer.jpg`,
};

// ── Keyword → photo key mapping (priority: first match wins) ────────
// Each entry is [keywords[], photoKey]
const RULES: [string[], string][] = [
  // Specific dishes first
  [["хинкали"], "khinkali"],
  [["хачапури"], "khachapuri"],
  [["пхали", "бадриджани", "аджапсандали", "лобио"], "salad"],
  [["чахохбили", "оджахури", "чкмерули", "тапака"], "chicken"],
  [["кубдари"], "bbq"],
  [["чурчхела", "козинаки", "пахлава", "пеламуши"], "dessert"],

  // Soups
  [["том ям", "том-ям"], "tomyum"],
  [["гаспачо"], "gazpacho"],
  [["суп", "крем-суп", "харчо", "солянка", "борщ", "бульон", "минестроне"], "soup"],

  // Sushi & Japanese
  [["сашими"], "sashimi"],
  [["филадельфия", "ролл", "нигири", "сет суши", "маки"], "sushi"],
  [["моти", "мочи"], "icecream"],
  [["поке", "боул"], "poke"],

  // Seafood specific
  [["устрицы", "устриц"], "oysters"],
  [["мидии"], "mussels"],
  [["лобстер"], "lobster"],
  [["краб", "фаланги"], "crab"],
  [["креветк"], "shrimp"],
  [["осьминог"], "octopus"],
  [["кальмар"], "seafood"],

  // Fish
  [["дорадо", "сибас", "форель", "лосось на гриле", "стейк из лосося", "рыба"], "fish"],

  // Meat specific
  [["тар-тар", "тартар"], "tartare"],
  [["карпаччо"], "carpaccio"],
  [["каре ягнёнка", "ягнёнок", "баранин"], "lamb"],
  [["томагавк", "рибай", "стриплойн", "филе миньон", "нью-йорк стейк", "стейк"], "steak"],
  [["шашлык", "люля", "кебаб", "на мангале", "мангал"], "kebab"],
  [["утк", "утин", "муларда"], "duck"],
  [["бургер"], "burger"],
  [["цыплён", "курин", "куриц", "курица", "крыл"], "chicken"],
  [["медальон", "телятин", "свинин", "оджахури"], "steak"],

  // Pasta & Italian
  [["равиоли"], "ravioli"],
  [["паэлья"], "paella"],
  [["ризотто"], "risotto"],
  [["карбонара", "тальятелле", "паппарделле", "спагетти", "пенне", "паста", "болоньезе", "аррабиата", "лазанья"], "pasta"],
  [["пицца", "маргарита", "пепперони"], "pizza"],

  // Asian
  [["удон", "лапша", "вок", "рамен"], "noodles"],

  // Salads
  [["цезарь"], "caesar"],
  [["нисуаз", "капрезе", "буррата", "моцарелла"], "salad"],
  [["салат", "микс салат", "руккола"], "salad"],

  // Breakfast
  [["бенедикт"], "benedict"],
  [["шакшука"], "breakfast"],
  [["гранола"], "granola"],
  [["сырники", "блин", "оладь"], "pancakes"],
  [["круассан"], "croissant"],
  [["вафл"], "waffles"],

  // Cheese
  [["сырная тарелка", "ассорти сыров", "сырное ассорти"], "cheese"],
  [["буррата", "рикотта", "халуми", "сулугуни"], "cheese"],
  [["хамон", "мясная тарелка", "мясное ассорти"], "bbq"],

  // Appetizers
  [["брускетт"], "bruschetta"],
  [["хумус"], "hummus"],
  [["паштет"], "bruschetta"],
  [["гриссини", "фокачча", "хлеб"], "bruschetta"],

  // Desserts specific
  [["тирамису"], "tiramisu"],
  [["чизкейк"], "cheesecake"],
  [["эклер"], "eclair"],
  [["чуррос"], "churros"],
  [["мороженое", "сорбет", "джелато"], "icecream"],
  [["штрудель"], "dessert"],
  [["медовик", "наполеон", "торт"], "cake"],
  [["фондан", "шоколад"], "dessert"],
  [["крем-брюле", "каталонский крем"], "dessert"],
  [["панна котта", "панакота", "панна-котта"], "dessert"],

  // Drinks
  [["сидр"], "cider"],
  [["пиво", "разливн"], "beer"],
  [["вино", "просекко", "шампанск"], "wine"],
  [["коктейль", "мохито", "маргарита", "апероль", "негрони", "дайкири"], "cocktail"],
  [["виски", "бурбон", "коньяк", "джин"], "cocktail"],
  [["лимонад", "морс"], "lemonade"],
  [["сок", "фреш", "свежевыжат", "смузи"], "lemonade"],
  [["кофе", "эспрессо", "капучино", "латте", "флэт уайт", "американо", "раф-кофе"], "coffee"],
  [["чай", "матча"], "tea"],
  [["какао", "горячий шоколад"], "coffee"],

  // Catch-all fallbacks by category context
  [["комплекс", "бизнес-ланч", "обед"], "breakfast"],
];

function matchPhoto(title: string, description: string, categoryTitle: string): string | null {
  // First pass: match against title + description only (not category, to avoid false positives)
  const titleDesc = `${title} ${description}`.toLowerCase();

  for (const [keywords, photoKey] of RULES) {
    for (const kw of keywords) {
      if (titleDesc.includes(kw.toLowerCase())) {
        return PHOTOS[photoKey] ?? null;
      }
    }
  }

  // Second pass: match against category title only
  const catLower = categoryTitle.toLowerCase();
  for (const [keywords, photoKey] of RULES) {
    for (const kw of keywords) {
      if (catLower.includes(kw.toLowerCase())) {
        return PHOTOS[photoKey] ?? null;
      }
    }
  }

  // Category-level fallbacks
  const cat = categoryTitle.toLowerCase();
  if (cat.includes("закуск") || cat.includes("тапас")) return PHOTOS.bruschetta;
  if (cat.includes("салат")) return PHOTOS.salad;
  if (cat.includes("суп")) return PHOTOS.soup;
  if (cat.includes("стейк") || cat.includes("мяс") || cat.includes("гриль")) return PHOTOS.steak;
  if (cat.includes("горяч") || cat.includes("основн")) return PHOTOS.steak;
  if (cat.includes("паста") || cat.includes("ризотто")) return PHOTOS.pasta;
  if (cat.includes("десерт") || cat.includes("сладк")) return PHOTOS.dessert;
  if (cat.includes("напит") || cat.includes("бар")) return PHOTOS.cocktail;
  if (cat.includes("кофе")) return PHOTOS.coffee;
  if (cat.includes("завтрак")) return PHOTOS.breakfast;
  if (cat.includes("хачапури") || cat.includes("хинкали") || cat.includes("выпечк")) return PHOTOS.khinkali;
  if (cat.includes("суши") || cat.includes("ролл")) return PHOTOS.sushi;
  if (cat.includes("морепродукт") || cat.includes("рыб")) return PHOTOS.seafood;
  if (cat.includes("пицц")) return PHOTOS.pizza;
  if (cat.includes("сыр")) return PHOTOS.cheese;
  if (cat.includes("мангал")) return PHOTOS.kebab;
  if (cat.includes("пив") || cat.includes("сидр") || cat.includes("разливн")) return PHOTOS.beer;
  if (cat.includes("пончик") || cat.includes("выпечк")) return PHOTOS.dessert;
  if (cat.includes("пельмен") || cat.includes("варenik") || cat.includes("варениk") || cat.includes("вареник")) return PHOTOS.dumplings;

  return null;
}

async function main() {
  const items = await prisma.menuItem.findMany({
    include: { category: true },
  });

  let updated = 0;
  let skipped = 0;
  let noMatch = 0;

  for (const item of items) {
    const categoryTitle = item.category?.title ?? "";
    const photo = matchPhoto(item.title, item.description, categoryTitle);

    if (!photo) {
      console.log(`  NO MATCH: "${item.title}" (cat: ${categoryTitle})`);
      noMatch++;
      continue;
    }

    if (item.photoUrl === photo) {
      skipped++;
      continue;
    }

    await prisma.menuItem.update({
      where: { id: item.id },
      data: { photoUrl: photo },
    });
    updated++;
    console.log(`  ✓ ${item.title} → ${photo.includes("unsplash") ? "unsplash" : photo.split("/").pop()}`);
  }

  console.log(`\nDone! Updated: ${updated}, Skipped: ${skipped}, No match: ${noMatch}`);
}

main().finally(() => prisma.$disconnect());
