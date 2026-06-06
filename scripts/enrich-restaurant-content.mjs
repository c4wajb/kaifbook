import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const restaurantImages = {
  dining: "/images/stock/restaurants/dining-01.jpg",
  cafe: "/images/stock/restaurants/cafe-01.jpg",
  bar: "/images/stock/restaurants/bar-01.jpg",
  terrace: "/images/stock/restaurants/terrace-01.jpg",
};

const menuImages = {
  bbq: "/images/stock/menu/bbq.jpg",
  breakfast: "/images/stock/menu/breakfast.jpg",
  bruschetta: "/images/stock/menu/bruschetta.jpg",
  cocktail: "/images/stock/menu/cocktail.jpg",
  coffee: "/images/stock/menu/coffee.jpg",
  dessert: "/images/stock/menu/dessert.jpg",
  dumplings: "/images/stock/menu/dumplings.jpg",
  khinkali: "/images/stock/menu/khinkali.jpg",
  kids: "/images/stock/menu/kids.jpg",
  lemonade: "/images/stock/menu/lemonade.jpg",
  pasta: "/images/stock/menu/pasta.jpg",
  pizza: "/images/stock/menu/pizza.jpg",
  salad: "/images/stock/menu/salad.jpg",
  seafood: "/images/stock/menu/seafood.jpg",
  soup: "/images/stock/menu/soup.jpg",
  steak: "/images/stock/menu/steak.jpg",
  sushi: "/images/stock/menu/sushi.jpg",
  wine: "/images/stock/menu/wine.jpg",
};

const image = (name) => menuImages[name] || "/images/stock/menu/dish-fallback.jpg";

function parseJsonList(value) {
  try {
    const parsed = JSON.parse(value || "[]");
    return Array.isArray(parsed) ? parsed.filter((item) => typeof item === "string" && item.trim()).map((item) => item.trim()) : [];
  } catch {
    return [];
  }
}

function jsonList(items) {
  return JSON.stringify([...new Set(items.filter(Boolean).map((item) => String(item).trim()).filter(Boolean))]);
}

function textProfile(restaurant) {
  return [
    restaurant.title,
    restaurant.slug,
    ...parseJsonList(restaurant.cuisineTypes),
    ...parseJsonList(restaurant.features),
    ...parseJsonList(restaurant.tags),
  ]
    .join(" ")
    .toLowerCase();
}

function menuItem(title, description, price, weight, photo) {
  return { title, description, price, weight, photoUrl: image(photo), isAvailable: true };
}

const presets = {
  european: [
    {
      title: "Закуски",
      items: [
        menuItem("Брускетта с томатами", "Хрустящий хлеб, томаты, зелень и оливковое масло.", 390, "1 порция", "bruschetta"),
        menuItem("Зеленый салат", "Свежие листья, овощи и легкая заправка.", 460, "220 г", "salad"),
      ],
    },
    {
      title: "Салаты и супы",
      items: [
        menuItem("Салат с печеной тыквой", "Тыква, сыр, зелень и ореховая заправка.", 520, "260 г", "salad"),
        menuItem("Крем-суп дня", "Нежный суп с сезонными овощами.", 430, "300 мл", "soup"),
      ],
    },
    {
      title: "Горячее",
      items: [
        menuItem("Паста с соусом", "Паста, сливочный соус и зелень.", 690, "320 г", "pasta"),
        menuItem("Филе с овощами", "Горячее блюдо с овощным гарниром.", 780, "330 г", "steak"),
      ],
    },
    {
      title: "Десерты",
      items: [
        menuItem("Чизкейк", "Классический десерт с мягким сливочным вкусом.", 390, "150 г", "dessert"),
        menuItem("Теплый тарт", "Фруктовая выпечка с нежной начинкой.", 420, "160 г", "dessert"),
      ],
    },
    {
      title: "Напитки",
      items: [
        menuItem("Домашний лимонад", "Освежающий лимонад с цитрусом.", 260, "350 мл", "lemonade"),
        menuItem("Бокал вина", "Вино из базовой карты ресторана.", 420, "150 мл", "wine"),
      ],
    },
  ],
  cafe: [
    {
      title: "Завтраки",
      items: [
        menuItem("Сырники со сметаной", "Нежные сырники с ягодным соусом.", 420, "220 г", "breakfast"),
        menuItem("Омлет с зеленью", "Легкий завтрак с овощами и зеленью.", 390, "240 г", "breakfast"),
      ],
    },
    {
      title: "Закуски и салаты",
      items: [
        menuItem("Салат с авокадо", "Авокадо, свежие овощи и мягкая заправка.", 520, "240 г", "salad"),
        menuItem("Тост с томатами", "Теплый тост с томатами и зеленью.", 360, "1 порция", "bruschetta"),
      ],
    },
    {
      title: "Горячее",
      items: [
        menuItem("Паста с сыром", "Сливочная паста для обеда или раннего ужина.", 610, "300 г", "pasta"),
        menuItem("Боул с овощами", "Легкое горячее блюдо с овощами и соусом.", 560, "310 г", "salad"),
      ],
    },
    {
      title: "Кофе и напитки",
      items: [
        menuItem("Капучино", "Кофе с молочной пеной.", 210, "250 мл", "coffee"),
        menuItem("Лимонад", "Домашний лимонад с сезонным вкусом.", 250, "350 мл", "lemonade"),
      ],
    },
    {
      title: "Десерты",
      items: [
        menuItem("Донат с глазурью", "Мягкий десерт к кофе.", 230, "1 шт.", "dessert"),
        menuItem("Чизкейк", "Сливочный десерт с песочной основой.", 390, "150 г", "dessert"),
      ],
    },
  ],
  russian: [
    {
      title: "Закуски",
      items: [
        menuItem("Домашний салат", "Овощи, зелень и мягкая заправка.", 390, "230 г", "salad"),
        menuItem("Гренки к столу", "Хрустящая закуска для начала ужина.", 260, "1 порция", "bruschetta"),
      ],
    },
    {
      title: "Супы",
      items: [
        menuItem("Борщ со сметаной", "Классический суп с насыщенным вкусом.", 430, "300 мл", "soup"),
        menuItem("Куриный суп", "Легкий домашний суп с зеленью.", 390, "300 мл", "soup"),
      ],
    },
    {
      title: "Пельмени и горячее",
      items: [
        menuItem("Пельмени с мясом", "Домашние пельмени со сметаной.", 520, "280 г", "dumplings"),
        menuItem("Куриное филе", "Горячее блюдо с овощным гарниром.", 640, "320 г", "steak"),
      ],
    },
    {
      title: "Десерты",
      items: [
        menuItem("Сырники", "Нежные сырники с соусом.", 380, "220 г", "breakfast"),
        menuItem("Пирог дня", "Домашняя выпечка к чаю.", 290, "150 г", "dessert"),
      ],
    },
    {
      title: "Напитки",
      items: [
        menuItem("Чай с травами", "Горячий чай с травяным вкусом.", 180, "350 мл", "coffee"),
        menuItem("Морс", "Домашний ягодный напиток.", 210, "350 мл", "lemonade"),
      ],
    },
  ],
  georgian: [
    {
      title: "Закуски",
      items: [
        menuItem("Пхали с зеленью", "Легкая грузинская закуска с ореховой нотой.", 460, "180 г", "salad"),
        menuItem("Брускетта с сыром", "Теплая закуска к столу.", 420, "1 порция", "bruschetta"),
      ],
    },
    {
      title: "Хинкали и хачапури",
      items: [
        menuItem("Хинкали", "Сочные хинкали с мясной начинкой.", 560, "4 шт.", "khinkali"),
        menuItem("Хачапури", "Горячая выпечка с сыром.", 620, "1 порция", "pizza"),
      ],
    },
    {
      title: "Мясо и горячее",
      items: [
        menuItem("Шашлык с овощами", "Горячее мясное блюдо с гарниром.", 790, "330 г", "bbq"),
        menuItem("Филе с соусом", "Мягкое горячее блюдо с овощами.", 740, "320 г", "steak"),
      ],
    },
    {
      title: "Десерты",
      items: [
        menuItem("Медовый десерт", "Нежный десерт к чаю.", 390, "150 г", "dessert"),
        menuItem("Фруктовый тарт", "Легкий десерт после ужина.", 420, "160 г", "dessert"),
      ],
    },
    {
      title: "Напитки",
      items: [
        menuItem("Домашний лимонад", "Освежающий напиток с цитрусом.", 260, "350 мл", "lemonade"),
        menuItem("Вино", "Бокал вина из карты ресторана.", 430, "150 мл", "wine"),
      ],
    },
  ],
  italian: [
    {
      title: "Антипасти",
      items: [
        menuItem("Брускетта", "Томаты, зелень и хрустящий хлеб.", 390, "1 порция", "bruschetta"),
        menuItem("Салат с сыром", "Свежий салат с мягким сыром.", 520, "240 г", "salad"),
      ],
    },
    {
      title: "Паста и пицца",
      items: [
        menuItem("Паста с томатами", "Паста с соусом и зеленью.", 690, "320 г", "pasta"),
        menuItem("Пицца с сыром", "Тонкое тесто, сыр и соус.", 760, "1 шт.", "pizza"),
      ],
    },
    {
      title: "Горячее",
      items: [
        menuItem("Филе с овощами", "Горячее блюдо с овощным гарниром.", 790, "330 г", "steak"),
        menuItem("Рыба с лимоном", "Легкое горячее блюдо с цитрусом.", 890, "300 г", "seafood"),
      ],
    },
    {
      title: "Десерты",
      items: [
        menuItem("Тирамису", "Классический кофейный десерт.", 430, "150 г", "dessert"),
        menuItem("Чизкейк", "Сливочный десерт к кофе.", 410, "150 г", "dessert"),
      ],
    },
    {
      title: "Напитки",
      items: [
        menuItem("Кофе", "Классический кофе к десерту.", 210, "200 мл", "coffee"),
        menuItem("Вино", "Бокал вина из карты ресторана.", 440, "150 мл", "wine"),
      ],
    },
  ],
  seafood: [
    {
      title: "Закуски",
      items: [
        menuItem("Брускетта с рыбой", "Легкая закуска с зеленью.", 520, "1 порция", "bruschetta"),
        menuItem("Салат с авокадо", "Свежий салат к основному блюду.", 590, "240 г", "salad"),
      ],
    },
    {
      title: "Морепродукты",
      items: [
        menuItem("Рыба с лимоном", "Горячее блюдо из рыбы с легким соусом.", 980, "300 г", "seafood"),
        menuItem("Морской сет", "Позиция для ужина с морепродуктами.", 1260, "360 г", "seafood"),
      ],
    },
    {
      title: "Паста",
      items: [
        menuItem("Паста с морепродуктами", "Паста с соусом и морской нотой.", 890, "320 г", "pasta"),
        menuItem("Паста с сыром", "Более спокойный вариант горячего.", 690, "300 г", "pasta"),
      ],
    },
    {
      title: "Десерты",
      items: [
        menuItem("Фруктовый тарт", "Легкий десерт после ужина.", 420, "160 г", "dessert"),
        menuItem("Чизкейк", "Сливочный десерт к кофе.", 410, "150 г", "dessert"),
      ],
    },
    {
      title: "Напитки",
      items: [
        menuItem("Вино", "Бокал вина из карты ресторана.", 460, "150 мл", "wine"),
        menuItem("Лимонад", "Домашний освежающий напиток.", 280, "350 мл", "lemonade"),
      ],
    },
  ],
  asian: [
    {
      title: "Закуски",
      items: [
        menuItem("Салат с овощами", "Свежая закуска с легкой заправкой.", 490, "230 г", "salad"),
        menuItem("Ролл-закуска", "Небольшая позиция к столу.", 520, "1 порция", "sushi"),
      ],
    },
    {
      title: "Роллы и суши",
      items: [
        menuItem("Суши-сет", "Набор роллов для ужина.", 890, "1 сет", "sushi"),
        menuItem("Ролл с рыбой", "Ролл с мягким вкусом и соусом.", 560, "8 шт.", "sushi"),
      ],
    },
    {
      title: "Горячее",
      items: [
        menuItem("Лапша с овощами", "Горячее блюдо с соусом.", 650, "320 г", "pasta"),
        menuItem("Рыба с гарниром", "Горячая позиция с морской нотой.", 880, "300 г", "seafood"),
      ],
    },
    {
      title: "Десерты",
      items: [
        menuItem("Десерт с ягодами", "Легкий десерт после ужина.", 430, "150 г", "dessert"),
        menuItem("Чизкейк", "Сливочный десерт к кофе.", 410, "150 г", "dessert"),
      ],
    },
    {
      title: "Напитки",
      items: [
        menuItem("Лимонад", "Освежающий напиток с цитрусом.", 280, "350 мл", "lemonade"),
        menuItem("Чай", "Горячий напиток к ужину.", 180, "350 мл", "coffee"),
      ],
    },
  ],
  bar: [
    {
      title: "Закуски к напиткам",
      items: [
        menuItem("Брускетта", "Хрустящая закуска к столу.", 390, "1 порция", "bruschetta"),
        menuItem("Салат с сыром", "Легкая позиция перед горячим.", 520, "240 г", "salad"),
      ],
    },
    {
      title: "BBQ и горячее",
      items: [
        menuItem("BBQ-сет", "Мясная позиция с соусом.", 890, "360 г", "bbq"),
        menuItem("Стейк с овощами", "Горячее блюдо для плотного ужина.", 980, "340 г", "steak"),
      ],
    },
    {
      title: "Основное",
      items: [
        menuItem("Паста с соусом", "Горячая позиция с мягким соусом.", 690, "320 г", "pasta"),
        menuItem("Филе с гарниром", "Горячее блюдо с овощами.", 760, "320 г", "steak"),
      ],
    },
    {
      title: "Барная карта",
      items: [
        menuItem("Авторский коктейль", "Коктейль из базовой карты бара.", 460, "250 мл", "cocktail"),
        menuItem("Бокал вина", "Вино из карты заведения.", 420, "150 мл", "wine"),
      ],
    },
    {
      title: "Десерты",
      items: [
        menuItem("Десерт дня", "Небольшой десерт после ужина.", 390, "150 г", "dessert"),
        menuItem("Кофе", "Кофе к десерту или позднему вечеру.", 210, "200 мл", "coffee"),
      ],
    },
  ],
};

function choosePreset(restaurant) {
  const profile = textProfile(restaurant);

  if (profile.includes("кофейн") || profile.includes("кофе") || profile.includes("donut") || profile.includes("завтраки")) {
    return "cafe";
  }
  if (profile.includes("пельмен") || profile.includes("домашняя кухня")) {
    return "russian";
  }
  if (profile.includes("грузин") || profile.includes("кавказ") || profile.includes("гогия") || profile.includes("тбиладжио")) {
    return "georgian";
  }
  if (profile.includes("испан") || profile.includes("морепроду") || profile.includes("морской")) {
    return "seafood";
  }
  if (profile.includes("япон") || profile.includes("азиат")) {
    return "asian";
  }
  if (profile.includes("бар") || profile.includes("пив") || profile.includes("redstone") || profile.includes("caramel") || profile.includes("бутыл")) {
    return "bar";
  }
  if (profile.includes("итальян")) {
    return "italian";
  }

  return "european";
}

function restaurantFallbackSet(restaurant) {
  const profile = textProfile(restaurant);
  if (profile.includes("бар") || profile.includes("пив") || profile.includes("caramel") || profile.includes("бутыл")) {
    return [restaurantImages.bar, restaurantImages.dining, restaurantImages.terrace];
  }
  if (profile.includes("коф") || profile.includes("завтрак") || profile.includes("donut")) {
    return [restaurantImages.cafe, restaurantImages.terrace, restaurantImages.dining];
  }
  if (profile.includes("веранд") || profile.includes("видовой")) {
    return [restaurantImages.terrace, restaurantImages.dining, restaurantImages.bar];
  }
  return [restaurantImages.dining, restaurantImages.terrace, restaurantImages.bar];
}

function isBadPhoto(url) {
  if (!url) return true;
  const lower = url.trim().toLowerCase();
  if (!lower) return true;
  if (lower.startsWith("blob:") || lower.startsWith("data:")) return true;
  if (lower.includes("discord") || lower.includes("screen") || lower.includes("screenshot") || lower.includes("скрин")) return true;
  if (lower.includes("/uploads/")) return true;
  if (lower.includes("restaurant-fallback.svg") || lower.includes("dish-fallback.svg")) return true;
  if (lower.includes("/images/menu/") && lower.endsWith(".svg")) return true;
  if (lower.includes("/images/restaurants/") && lower.endsWith(".svg")) return true;
  if (lower.includes("welcomekursk.ru/uploads") || lower.includes("static.tildacdn.com") || lower.includes("butylochnaya.ru")) return true;
  return false;
}

function cleanRestaurantPhotos(restaurant) {
  const fallback = restaurantFallbackSet(restaurant);
  const gallery = parseJsonList(restaurant.galleryPhotos).filter((url) => !isBadPhoto(url));
  const mainPhotoUrl = !isBadPhoto(restaurant.mainPhotoUrl) ? restaurant.mainPhotoUrl : gallery[0] || fallback[0];
  const mergedGallery = jsonList([mainPhotoUrl, ...gallery, ...fallback].filter((url) => url !== mainPhotoUrl).slice(0, 5));
  const bannerImage = !isBadPhoto(restaurant.bannerImage) ? restaurant.bannerImage : null;

  return { mainPhotoUrl, galleryPhotos: mergedGallery, bannerImage };
}

async function rebuildMenu(tx, restaurant, categories) {
  await tx.menuItem.deleteMany({ where: { restaurantId: restaurant.id } });
  await tx.menuCategory.deleteMany({ where: { restaurantId: restaurant.id } });

  for (const [categoryIndex, category] of categories.entries()) {
    const createdCategory = await tx.menuCategory.create({
      data: {
        restaurantId: restaurant.id,
        title: category.title,
        sortOrder: categoryIndex,
        isActive: true,
      },
    });

    await tx.menuItem.createMany({
      data: category.items.map((item, itemIndex) => ({
        restaurantId: restaurant.id,
        categoryId: createdCategory.id,
        title: item.title,
        description: item.description,
        price: item.price,
        weight: item.weight,
        photoUrl: item.photoUrl,
        isAvailable: true,
        sortOrder: itemIndex,
      })),
    });
  }
}

async function main() {
  const restaurants = await prisma.restaurant.findMany({
    orderBy: { title: "asc" },
  });

  for (const restaurant of restaurants) {
    const presetName = choosePreset(restaurant);
    const categories = presets[presetName];
    const photoPatch = cleanRestaurantPhotos(restaurant);

    await prisma.$transaction(async (tx) => {
      await tx.restaurant.update({
        where: { id: restaurant.id },
        data: {
          ...photoPatch,
          badges: jsonList(["Онлайн-бронирование", ...(restaurant.isFeatured ? ["Рекомендуем"] : [])]),
        },
      });

      await rebuildMenu(tx, restaurant, categories);
    });

    console.log(`Updated ${restaurant.title}: ${presetName}, ${categories.length} categories.`);
  }

  console.log(`Content updated for ${restaurants.length} restaurants.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
