import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

type HookahBar = {
  title: string;
  slug: string;
  description: string;
  shortDescription: string;
  address: string;
  phone: string;
  email: string;
  website?: string;
  averageCheck: number;
  rating: number;
  reviewsCount: number;
  cuisineTypes: string[];
  features: string[];
  tags: string[];
  badges: string[];
  mainPhotoUrl: string;
  galleryPhotos: string[];
  hours: Array<{ dayOfWeek: number; openTime: string; closeTime: string; isClosed?: boolean }>;
  menu: Array<{ title: string; items: Array<{ title: string; description: string; price: number; weight?: string }> }>;
};

function weeklyHours(openTime: string, closeTime: string, overrides: Record<number, string> = {}) {
  return [1, 2, 3, 4, 5, 6, 0].map((dayOfWeek) => ({
    dayOfWeek,
    openTime: typeof overrides[dayOfWeek] === "string" && overrides[dayOfWeek].includes("|") ? overrides[dayOfWeek].split("|")[0] : openTime,
    closeTime: typeof overrides[dayOfWeek] === "string" && overrides[dayOfWeek].includes("|") ? overrides[dayOfWeek].split("|")[1] : overrides[dayOfWeek] ?? closeTime,
    isClosed: false,
  }));
}

function weekdayWeekendHours(weekdayOpen: string, weekdayClose: string, weekendOpen: string, weekendClose: string) {
  return [1, 2, 3, 4, 5, 6, 0].map((dayOfWeek) => ({
    dayOfWeek,
    openTime: dayOfWeek === 0 || dayOfWeek === 6 ? weekendOpen : weekdayOpen,
    closeTime: dayOfWeek === 0 || dayOfWeek === 6 ? weekendClose : weekdayClose,
    isClosed: false,
  }));
}

const hookahBars: HookahBar[] = [
  {
    title: "Hookah Pro",
    slug: "hookah-pro-kursk",
    shortDescription: "Кальян-бар для ценителей — премиум-кальяны, двухэтажное пространство и доставка кальянов.",
    description:
      "Hookah Pro — кальянная на улице Маяковского, где работают только владельцы без наёмного персонала, что гарантирует высочайшее качество каждого кальяна. Двухэтажное помещение с удобной парковкой, видеоиграми (FIFA, UFC) и регулярными акциями. Широкий ассортимент табаков от DarkSide, Smoke Angels, Tangiers, Nakhla и других топовых брендов. Партнёрство с GorchiZZa для заказа пиццы, роллов, бургеров и десертов прямо в заведении.",
    address: "ул. Маяковского, 106",
    phone: "+7 919 215-89-19",
    email: "hookahpro-kursk@example.com",
    website: "https://vk.com/hookahpro46",
    averageCheck: 1200,
    rating: 4.7,
    reviewsCount: 89,
    cuisineTypes: ["кальянная", "бар"],
    features: ["кальян", "доставка кальяна", "видеоигры", "парковка", "wi-fi"],
    tags: ["премиум кальян", "уютно", "вечер с друзьями"],
    badges: ["Без наёмного персонала", "Премиум табаки"],
    mainPhotoUrl: "/images/stock/restaurants/bar-01.jpg",
    galleryPhotos: [
      "/images/stock/restaurants/bar-01.jpg",
      "/images/stock/restaurants/dining-01.jpg",
    ],
    hours: weeklyHours("18:00", "02:00"),
    menu: [
      {
        title: "Кальяны",
        items: [
          { title: "Классический кальян", description: "На выбор: DarkSide, Tangiers, Nakhla и другие премиум-табаки.", price: 1200 },
          { title: "Кальян на фруктовой чаше", description: "Чаша из ананаса, грейпфрута или яблока с авторским миксом.", price: 1500 },
          { title: "Авторский микс", description: "Уникальный микс от мастера по вашим предпочтениям.", price: 1400 },
        ],
      },
      {
        title: "Еда (GorchiZZa)",
        items: [
          { title: "Пицца Маргарита", description: "Классическая пицца от партнёра GorchiZZa.", price: 490 },
          { title: "Ролл Филадельфия", description: "Роллы с лососем и сливочным сыром.", price: 420 },
          { title: "Бургер классический", description: "Сочный бургер с говяжьей котлетой.", price: 390 },
        ],
      },
      {
        title: "Напитки",
        items: [
          { title: "Чай", description: "Черный, зеленый или фруктовый чай.", price: 150 },
          { title: "Лимонад домашний", description: "Освежающий лимонад собственного приготовления.", price: 200 },
        ],
      },
    ],
  },
  {
    title: "Бородатый дым",
    slug: "borodatyy-dym-kursk",
    shortDescription: "Сеть кальянных с недорогими ценами, оригинальным табаком и ежедневными акциями.",
    description:
      "«Бородатый дым» — популярная сеть кальянных в Курске, расположенная в ТЦ Уральский на Карла Маркса. Заведение предлагает исключительно оригинальный и акцизный табак, паровые коктейли по привлекательным ценам с ежедневными акциями до 19:00. В меню есть морепродукты, салаты, мясные блюда, паста и закуски. Интересный интерьер и дружелюбная атмосфера для компаний.",
    address: "ул. Карла Маркса, 4, ТЦ Уральский, 3 этаж",
    phone: "+7 471 274-76-77",
    email: "borodatydym@example.com",
    website: "https://vk.com/bd_46",
    averageCheck: 900,
    rating: 4.5,
    reviewsCount: 124,
    cuisineTypes: ["кальянная", "бар", "европейская"],
    features: ["кальян", "коктейли", "wi-fi", "акции"],
    tags: ["недорого", "компания друзей", "акции"],
    badges: ["Только оригинальный табак", "Акции до 19:00"],
    mainPhotoUrl: "/images/stock/restaurants/dining-02.jpg",
    galleryPhotos: [
      "/images/stock/restaurants/dining-02.jpg",
      "/images/stock/restaurants/bar-01.jpg",
    ],
    hours: weeklyHours("12:00", "02:00"),
    menu: [
      {
        title: "Кальяны",
        items: [
          { title: "Кальян стандартный", description: "Nakhla, Daily Hookah или Darkside на выбор.", price: 700 },
          { title: "Кальян премиум", description: "Tangiers, DarkSide Rare или другой премиум-табак.", price: 1000 },
          { title: "Паровой коктейль", description: "Фирменный паровой коктейль с фруктовыми нотами.", price: 500 },
        ],
      },
      {
        title: "Кухня",
        items: [
          { title: "Салат Цезарь", description: "Классический салат с курицей.", price: 450 },
          { title: "Паста Карбонара", description: "Паста с беконом в сливочном соусе.", price: 520 },
          { title: "Куриные крылья BBQ", description: "Крылья в пряном соусе.", price: 390 },
          { title: "Морепродукты ассорти", description: "Креветки и кальмары с соусом.", price: 780 },
        ],
      },
      {
        title: "Напитки",
        items: [
          { title: "Чай травяной", description: "Ассортимент травяных чаев.", price: 150 },
          { title: "Молочный коктейль", description: "Ванильный, шоколадный или клубничный.", price: 250 },
        ],
      },
    ],
  },
  {
    title: "Red Room Lounge",
    slug: "red-room-lounge-kursk",
    shortDescription: "Уютная кальянная с PlayStation, кинопросмотрами и DJ по выходным.",
    description:
      "Red Room Lounge — кальянная с уютной расслабляющей атмосферой на улице Можаевской (вход через кафе Napoli). Кальяны от 500 ₽, кофейные напитки, коктейли, смузи и чаи. PlayStation 4, кинопросмотры и DJ по выходным, программа лояльности с картой привилегий. Бронирование столов по телефону.",
    address: "ул. Можаевская, 7А",
    phone: "+7 471 273-34-60",
    email: "redroomkursk@example.com",
    averageCheck: 800,
    rating: 4.6,
    reviewsCount: 76,
    cuisineTypes: ["кальянная", "бар", "кофейня"],
    features: ["кальян", "PlayStation", "DJ", "кинопросмотры", "wi-fi"],
    tags: ["уютно", "расслабление", "вечер с друзьями"],
    badges: ["PlayStation 4", "Кино по выходным"],
    mainPhotoUrl: "/images/stock/restaurants/dining-03.jpg",
    galleryPhotos: [
      "/images/stock/restaurants/dining-03.jpg",
      "/images/stock/restaurants/dining-01.jpg",
    ],
    hours: weekdayWeekendHours("15:00", "00:00", "15:00", "02:00"),
    menu: [
      {
        title: "Кальяны",
        items: [
          { title: "Кальян лайт", description: "Лёгкий кальян для начинающих.", price: 500 },
          { title: "Кальян классический", description: "Средний табак на классической чаше.", price: 700 },
          { title: "Кальян премиум", description: "Премиальный табак и авторский микс.", price: 900 },
        ],
      },
      {
        title: "Кофе и напитки",
        items: [
          { title: "Капучино", description: "Классический капучино.", price: 150 },
          { title: "Латте", description: "Молочный кофе.", price: 150 },
          { title: "Смузи фруктовый", description: "Банан, клубника и манго.", price: 250 },
          { title: "Чай", description: "Черный, зеленый или фруктовый.", price: 150 },
        ],
      },
    ],
  },
  {
    title: "RAY Hookah Club",
    slug: "ray-hookah-club-kursk",
    shortDescription: "Кальян-клуб на 6 этаже с панорамным видом, барным меню и профессиональными кальянщиками.",
    description:
      "RAY — кальян-клуб на 6-м этаже дома по улице Кати Зеленко, 24 с панорамным видом на город. Стильный интерьер, профессиональные кальянщики, разнообразное барное меню и атмосфера для полного расслабления. Здесь можно освободиться от повседневных забот на пару часов, доверив свой отдых профессионалам.",
    address: "ул. Кати Зеленко, 24, 6 этаж",
    phone: "+7 919 279-31-81",
    email: "raykursk@example.com",
    website: "https://vk.com/raykursk",
    averageCheck: 1100,
    rating: 4.8,
    reviewsCount: 112,
    cuisineTypes: ["кальянная", "бар"],
    features: ["кальян", "панорамный вид", "видовой", "коктейли", "wi-fi"],
    tags: ["панорама", "вид на город", "релакс", "стильно"],
    badges: ["Панорамный вид", "6-й этаж"],
    mainPhotoUrl: "/images/stock/restaurants/dining-01.jpg",
    galleryPhotos: [
      "/images/stock/restaurants/dining-01.jpg",
      "/images/stock/restaurants/dining-03.jpg",
    ],
    hours: weekdayWeekendHours("12:00", "02:00", "12:00", "04:00"),
    menu: [
      {
        title: "Кальяны",
        items: [
          { title: "Кальян классический", description: "Широкий выбор табаков на классической чаше.", price: 1000 },
          { title: "Кальян авторский", description: "Уникальный микс от кальян-мастера.", price: 1300 },
          { title: "Кальян на фрукте", description: "Чаша из свежего фрукта.", price: 1500 },
        ],
      },
      {
        title: "Бар",
        items: [
          { title: "Коктейль RAY", description: "Фирменный безалкогольный коктейль.", price: 350 },
          { title: "Лимонад", description: "Домашний лимонад с мятой.", price: 250 },
          { title: "Чай", description: "Премиальный чай в чайнике.", price: 200 },
        ],
      },
    ],
  },
  {
    title: "Shelby Lounge & Hookah",
    slug: "shelby-lounge-kursk",
    shortDescription: "Кальянное пространство нового формата с настольными играми и большим выбором чая.",
    description:
      "Shelby Lounge & Hookah — кальянное пространство нового формата на Мирной улице. Два зала: тихий уютный для спокойного отдыха и активный с музыкой и развлечениями. Wi-Fi, кнопка вызова персонала, разнообразные настольные игры, большой ассортимент ароматного чая и прохладительных напитков. Рейтинг 4.5 на основе более 300 оценок.",
    address: "ул. Мирная, 12",
    phone: "+7 961 193-07-77",
    email: "shelby-kursk@example.com",
    website: "https://vk.com/shelby_kursk",
    averageCheck: 900,
    rating: 4.5,
    reviewsCount: 316,
    cuisineTypes: ["кальянная", "бар"],
    features: ["кальян", "настольные игры", "wi-fi", "два зала"],
    tags: ["настольные игры", "компания друзей", "уютно"],
    badges: ["Два зала", "316 отзывов"],
    mainPhotoUrl: "/images/stock/restaurants/bar-01.jpg",
    galleryPhotos: [
      "/images/stock/restaurants/bar-01.jpg",
      "/images/stock/restaurants/dining-02.jpg",
    ],
    hours: weekdayWeekendHours("12:00", "02:00", "12:00", "03:00"),
    menu: [
      {
        title: "Кальяны",
        items: [
          { title: "Кальян стандартный", description: "Классический кальян на выбранном табаке.", price: 800 },
          { title: "Кальян премиум", description: "Премиум-табаки и авторские миксы.", price: 1100 },
        ],
      },
      {
        title: "Напитки",
        items: [
          { title: "Чай ароматный", description: "Широкий ассортимент травяных и фруктовых чаев.", price: 180 },
          { title: "Лимонад", description: "Прохладительный лимонад.", price: 200 },
          { title: "Кофе", description: "Эспрессо, капучино или латте.", price: 170 },
        ],
      },
    ],
  },
  {
    title: "S Lounge",
    slug: "s-lounge-kursk",
    shortDescription: "Кальян-бар с DJ, танцполом и двумя залами — для тихого отдыха и вечеринок.",
    description:
      "S Lounge — кальян-бар на улице Ленина, 72 с двумя зонами: уютный зал для спокойного вечера и зал с DJ и танцполом для тех, кто хочет зажечь. Бесплатная парковка, настольные игры, барная стойка. Работает допоздна — идеально для ночного отдыха.",
    address: "ул. Ленина, 72",
    phone: "+7 905 158-88-82",
    email: "slouunge-kursk@example.com",
    averageCheck: 1000,
    rating: 4.4,
    reviewsCount: 58,
    cuisineTypes: ["кальянная", "бар"],
    features: ["кальян", "DJ", "танцпол", "парковка", "настольные игры", "работает допоздна"],
    tags: ["вечеринки", "ночной отдых", "танцы"],
    badges: ["DJ по выходным", "Бесплатная парковка"],
    mainPhotoUrl: "/images/stock/restaurants/dining-02.jpg",
    galleryPhotos: [
      "/images/stock/restaurants/dining-02.jpg",
      "/images/stock/restaurants/dining-03.jpg",
    ],
    hours: weekdayWeekendHours("14:00", "02:00", "14:00", "03:00"),
    menu: [
      {
        title: "Кальяны",
        items: [
          { title: "Кальян классический", description: "Базовый кальян на выбранном табаке.", price: 900 },
          { title: "Кальян VIP", description: "Премиум-табак и авторская подача.", price: 1300 },
        ],
      },
      {
        title: "Бар",
        items: [
          { title: "Коктейль S Lounge", description: "Фирменный безалкогольный коктейль.", price: 300 },
          { title: "Чай", description: "Чайник с выбранным вкусом.", price: 180 },
          { title: "Лимонад", description: "Классический или ягодный.", price: 220 },
        ],
      },
    ],
  },
];

function tableData(count: number) {
  return Array.from({ length: count }, (_, i) => ({
    number: String(i + 1),
    seats: i % 4 === 0 ? 6 : i % 2 === 0 ? 4 : 2,
    shape: i % 3 === 0 ? ("circle" as const) : i % 2 === 0 ? ("square" as const) : ("rectangle" as const),
    x: 54 + (i % 5) * 154,
    y: 48 + Math.floor(i / 5) * 132,
    width: i % 3 === 0 ? 86 : 112,
    height: i % 3 === 0 ? 86 : 72,
    rotation: 0,
    isActive: true,
  }));
}

async function main() {
  const passwordHash = await bcrypt.hash("hookah2024", 10);

  // Create or find owner for hookah bars
  const owner = await prisma.user.upsert({
    where: { email: "hookah@kaifbook.ru" },
    update: {},
    create: {
      email: "hookah@kaifbook.ru",
      passwordHash,
      fullName: "Кальян-бары Курска",
      phone: "+74712000050",
      role: "restaurant_owner",
    },
  });

  for (const bar of hookahBars) {
    // Skip if already exists
    const existing = await prisma.restaurant.findUnique({ where: { slug: bar.slug } });
    if (existing) {
      console.log(`Skipping ${bar.title} — already exists (${existing.id})`);
      continue;
    }

    const restaurant = await prisma.restaurant.create({
      data: {
        ownerId: owner.id,
        title: bar.title,
        slug: bar.slug,
        description: bar.description,
        shortDescription: bar.shortDescription,
        city: "Курск",
        address: bar.address,
        phone: bar.phone,
        email: bar.email,
        website: bar.website ?? null,
        averageCheck: bar.averageCheck,
        rating: bar.rating,
        reviewsCount: bar.reviewsCount,
        cuisineTypes: JSON.stringify(bar.cuisineTypes),
        features: JSON.stringify(bar.features),
        tags: JSON.stringify(bar.tags),
        badges: JSON.stringify(bar.badges),
        mainPhotoUrl: bar.mainPhotoUrl,
        galleryPhotos: JSON.stringify(bar.galleryPhotos),
        status: "approved",
        isActive: true,
      },
    });

    console.log(`Created: ${bar.title} (${restaurant.id})`);

    // Reservation settings
    await prisma.reservationSettings.create({
      data: {
        restaurantId: restaurant.id,
        minGuests: 1,
        maxGuests: 10,
        reservationDurationMinutes: 120,
        minAdvanceBookingMinutes: 60,
        maxAdvanceBookingDays: 30,
        autoConfirmEnabled: false,
        allowTableSelection: true,
        allowSeatSelection: true,
        reserveWholeTableWhenSeatsSelected: true,
        minSeatsSelection: 1,
        bookingIntervalMinutes: 30,
      },
    });

    // Working hours
    for (const h of bar.hours) {
      await prisma.restaurantWorkingHour.create({
        data: { ...h, restaurantId: restaurant.id },
      });
    }

    // Menu
    for (const [sortOrder, category] of bar.menu.entries()) {
      const createdCategory = await prisma.menuCategory.create({
        data: { restaurantId: restaurant.id, title: category.title, sortOrder, isActive: true },
      });
      for (const [itemIndex, item] of category.items.entries()) {
        await prisma.menuItem.create({
          data: {
            restaurantId: restaurant.id,
            categoryId: createdCategory.id,
            title: item.title,
            description: item.description,
            price: item.price,
            weight: item.weight ?? "1 порция",
            sortOrder: itemIndex,
            isAvailable: true,
          },
        });
      }
    }

    // Hall & tables
    const hall = await prisma.hall.create({
      data: { restaurantId: restaurant.id, title: "Основной зал", width: 900, height: 520, sortOrder: 0, isActive: true },
    });
    for (const t of tableData(6)) {
      await prisma.restaurantTable.create({ data: { ...t, hallId: hall.id, restaurantId: restaurant.id } });
    }

    // Page events
    await prisma.restaurantPageEvent.createMany({
      data: [
        ...Array.from({ length: 15 }, (_, i) => ({ restaurantId: restaurant.id, type: "view" as const, source: i % 3 === 0 ? "vk" : "site", createdAt: new Date(Date.now() - i * 86400000) })),
        ...Array.from({ length: 4 }, (_, i) => ({ restaurantId: restaurant.id, type: "booking_click" as const, source: "site", createdAt: new Date(Date.now() - i * 86400000 * 2) })),
      ],
    });
  }

  console.log("\nDone! All hookah bars seeded.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
