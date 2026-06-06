import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  // 1. Create owner user
  const owner = await prisma.user.upsert({
    where: { email: "kryzhovnik@kaifbook.ru" },
    update: {},
    create: {
      email: "kryzhovnik@kaifbook.ru",
      passwordHash: await bcrypt.hash("demo2024", 10),
      fullName: "Костевич Виктория",
      phone: "+79611961818",
      role: "owner",
    },
  });

  // 2. Create restaurant
  const restaurant = await prisma.restaurant.create({
    data: {
      ownerId: owner.id,
      title: "Сидрерия Крыжовник",
      slug: "kryzhovnik-kursk",
      description:
        "Первая сидрерия Курска, открытая в декабре 2021 года. Более 50 сортов разливного сидра из Испании, Франции, Великобритании, Швеции и лучших российских сидроделен. Уютный бар с мягкими диванами и барной стойкой, интерьер в сдержанных зелёных оттенках с фирменным гусём-символом. Горячие сидровые коктейли, кофе, закуски и блюда к напиткам.",
      shortDescription:
        "Первая сидрерия Курска — 50+ сортов разливного сидра, горячие пунши, закуски и камерная атмосфера.",
      city: "Курск",
      address: "ул. Димитрова, 66/1",
      phone: "+7 961 196-18-18",
      email: "gooseberry.bar46@gmail.com",
      website: "https://vk.com/gooseberry_bar",
      latitude: 51.743547,
      longitude: 36.186698,
      yandexOrgId: "215753176186",
      averageCheck: 800,
      rating: 4.8,
      reviewsCount: 68,
      cuisineTypes: JSON.stringify(["сидрерия", "бар", "европейская"]),
      features: JSON.stringify(["сидр", "пунши", "коктейли", "wi-fi", "летняя веранда", "настольные игры"]),
      tags: JSON.stringify(["крафт", "уютно", "свидание", "вечер с друзьями"]),
      badges: JSON.stringify(["Первая сидрерия Курска", "50+ сортов сидра"]),
      mainPhotoUrl: "https://welcomekursk.ru/uploads/82fa492defce38d0bbb05cf984783ba8.jpg",
      galleryPhotos: JSON.stringify([
        "https://welcomekursk.ru/uploads/0a8bb7696bbc3a3cc4d28b65b36dbf40.jpg",
        "https://welcomekursk.ru/uploads/ca359fb73015a74363992dd75c865275.jpg",
        "https://welcomekursk.ru/uploads/07d09fdfb3b2854200ec2fcf15782b00.jpg",
      ]),
      isFeatured: true,
      bannerTitle: "Сидрерия Крыжовник",
      bannerSubtitle: "50+ сортов сидра со всего мира",
      bannerImage: "https://welcomekursk.ru/uploads/82fa492defce38d0bbb05cf984783ba8.jpg",
      status: "approved",
      isActive: true,
    },
  });

  console.log(`Restaurant created: ${restaurant.id}`);

  // 3. Working hours (Mon-Sun 12:00-23:00)
  for (let day = 0; day <= 6; day++) {
    await prisma.restaurantWorkingHour.create({
      data: {
        restaurantId: restaurant.id,
        dayOfWeek: day,
        openTime: "12:00",
        closeTime: "23:00",
        isClosed: false,
      },
    });
  }

  // 4. Reservation settings
  await prisma.reservationSettings.create({
    data: {
      restaurantId: restaurant.id,
      minGuests: 1,
      maxGuests: 10,
      reservationDurationMinutes: 120,
      bookingIntervalMinutes: 30,
      allowTableSelection: true,
      allowSeatSelection: true,
      reserveWholeTableWhenSeatsSelected: true,
      minSeatsSelection: 1,
      autoConfirmEnabled: false,
    },
  });

  // 5. Menu categories and items
  const menuData = [
    {
      title: "Закуски",
      sortOrder: 0,
      items: [
        { title: "Паштет из куриной печени", description: "Нежный паштет с вареньем из белой черешни и крутонами.", price: 420, weight: "180 г" },
        { title: "Тыквенный хумус", description: "Хумус с тыквой, оливковым маслом, паприкой и лепёшкой.", price: 380, weight: "200 г" },
        { title: "Сырная тарелка", description: "Ассорти выдержанных и мягких сыров с мёдом и орехами.", price: 690, weight: "220 г" },
        { title: "Брускетты с томатами", description: "Хрустящий хлеб с томатами черри, базиликом и бальзамиком.", price: 350, weight: "160 г" },
        { title: "Картофель фри", description: "Хрустящий картофель с фирменным соусом.", price: 280, weight: "200 г" },
        { title: "Мясная тарелка", description: "Ассорти из вяленого мяса, колбас и пармской ветчины.", price: 750, weight: "240 г" },
      ],
    },
    {
      title: "Основные блюда",
      sortOrder: 1,
      items: [
        { title: "Паста Карбонара", description: "Спагетти с беконом, пармезаном и сливочным соусом.", price: 520, weight: "280 г" },
        { title: "Бургер «Крыжовник»", description: "Котлета из мраморной говядины, чеддер, карамелизированный лук, фирменный соус.", price: 590, weight: "320 г" },
        { title: "Куриные крылья BBQ", description: "Крылья в глазури барбекю с соусом блю-чиз.", price: 480, weight: "300 г" },
        { title: "Тартар из говядины", description: "Классический тартар с каперсами, горчицей и тостами.", price: 620, weight: "180 г" },
      ],
    },
    {
      title: "Десерты",
      sortOrder: 2,
      items: [
        { title: "Блинчики с карамелью", description: "Пышные блинчики с солёной карамелью и шариком мороженого.", price: 390, weight: "220 г" },
        { title: "Чизкейк", description: "Классический чизкейк с ягодным соусом.", price: 360, weight: "160 г" },
        { title: "Штрудель с яблоком", description: "Тёплый штрудель с яблоком, корицей и ванильным мороженым.", price: 380, weight: "200 г" },
      ],
    },
    {
      title: "Горячие коктейли",
      sortOrder: 3,
      items: [
        { title: "Сливочное пиво", description: "Классический сидр, карамельный сироп, взбитые сливки, какао.", price: 360, weight: "250 мл" },
        { title: "Облепиховый экспресс", description: "Сидр облепиха-манго, апельсиновый топпинг, лайм, корица, бадьян, гвоздика.", price: 360, weight: "330 мл" },
        { title: "Сибирский пунш", description: "Сидр облепиха-манго, малина, имбирь, апельсин, пряности.", price: 360, weight: "330 мл" },
        { title: "Пряная вишня", description: "Сидр вишня-миндаль, лимон, яблоко, апельсин, вишнёвый сироп, пряности.", price: 360, weight: "330 мл" },
        { title: "Лимонно-имбирный пунш", description: "Сидр лимон-имбирь, мёд, фрукты, имбирь, пряности.", price: 360, weight: "330 мл" },
        { title: "Виноградный пунш", description: "Сидр красный виноград, апельсин, розмарин, пряности.", price: 360, weight: "330 мл" },
        { title: "Черничный пунш", description: "Сидр черника-розмарин-мята, яблоко, чернично-апельсиновый сироп.", price: 360, weight: "330 мл" },
        { title: "Апельсиновый пунш", description: "Сидр апельсин-тимьян, мандариновый сироп, тимьян, пряности.", price: 360, weight: "330 мл" },
      ],
    },
    {
      title: "Безалкогольные горячие",
      sortOrder: 4,
      items: [
        { title: "Сибирский пунш б/а", description: "Апельсиновый сок, облепиховое пюре, лимонный сок, розмарин, корица.", price: 350, weight: "350 мл" },
        { title: "Вишнёвый глинтвейн б/а", description: "Вишнёвый сок, апельсин, лимон, яблоко, вишнёвый сироп, анис, гвоздика, корица.", price: 350, weight: "250 мл" },
        { title: "Яблочно-ванильный грог б/а", description: "Яблочный сок, ванильный сироп, яблоко, пряности.", price: 350, weight: "350 мл" },
        { title: "Клюквенный глинтвейн б/а", description: "Клюквенный морс, клюквенное пюре, апельсин, анис, гвоздика, корица.", price: 270, weight: "350 мл" },
      ],
    },
    {
      title: "Холодный кофе",
      sortOrder: 5,
      items: [
        { title: "Холодный крем-кофе", description: "Сублимированный крем-кофе, молоко, лёд. По желанию — сироп кленовый пекан.", price: 240, weight: "300 мл" },
        { title: "Бамбл-кофе", description: "Эспрессо, апельсиновый сок, апельсиновый топпинг, лёд.", price: 280, weight: "400 мл" },
        { title: "Айс латте", description: "Эспрессо, шоколадный или карамельный топпинг, молоко, взбитые сливки, лёд.", price: 260, weight: "400 мл" },
        { title: "Эспрессо-тоник классический", description: "Эспрессо, классический тоник, лёд.", price: 260, weight: "400 мл" },
        { title: "Эспрессо-тоник лимонный", description: "Эспрессо, лимонный тоник, лёд.", price: 260, weight: "400 мл" },
      ],
    },
    {
      title: "Разливной сидр",
      sortOrder: 6,
      items: [
        { title: "Barkaiztegi Gorenak (Испания)", description: "Натуральный баскский сидр, сухой, 6.0%.", price: 720, weight: "500 мл" },
        { title: "Trabanco Sidra Natural (Испания)", description: "Астурийский натуральный сидр, кислотный, 6.0%.", price: 640, weight: "500 мл" },
        { title: "Sorre Artisanal Brut (Франция)", description: "Бретонский артизанальный брют, 4.5%.", price: 680, weight: "500 мл" },
        { title: "Celtic Marches Abrahalls (Англия)", description: "Английский фермерский сидр, 6.0%.", price: 580, weight: "500 мл" },
        { title: "Henry Westons Vintage (Англия)", description: "Выдержанный английский сидр, 5.2%.", price: 470, weight: "500 мл" },
        { title: "Alska Nordic Berries (Швеция)", description: "Шведский ягодный сидр, 4.0%.", price: 580, weight: "500 мл" },
        { title: "Заповедник Lavender (Россия)", description: "Лавандовый сидр от «Заповедник», 5.0%.", price: 490, weight: "500 мл" },
        { title: "Gravity Project Sunrise", description: "Фруктовый крафтовый сидр, 5.0%.", price: 480, weight: "500 мл" },
        { title: "Дальняя Дача сухой (Россия)", description: "Классический сухой яблочный сидр, 5.5%.", price: 450, weight: "500 мл" },
        { title: "Бродилка полусухой (Россия)", description: "Полусухой яблочный мид, 5.5%.", price: 450, weight: "500 мл" },
        { title: "Сидр Пастораль полусладкий", description: "Легкий полусладкий яблочный сидр, 5.0%.", price: 420, weight: "500 мл" },
        { title: "Bullevie Toffee (Россия)", description: "Сидр со вкусом тоффи, 5.5%.", price: 420, weight: "500 мл" },
      ],
    },
  ];

  for (const cat of menuData) {
    const category = await prisma.menuCategory.create({
      data: { restaurantId: restaurant.id, title: cat.title, sortOrder: cat.sortOrder },
    });
    for (let i = 0; i < cat.items.length; i++) {
      const item = cat.items[i];
      await prisma.menuItem.create({
        data: {
          restaurantId: restaurant.id,
          categoryId: category.id,
          title: item.title,
          description: item.description,
          price: item.price,
          weight: item.weight || null,
          sortOrder: i,
        },
      });
    }
  }

  console.log("Menu created");

  // 6. Hall layout - cozy cidery bar with bar counter area
  // Dimensions: small cozy bar, 900x600
  const hall = await prisma.hall.create({
    data: {
      restaurantId: restaurant.id,
      title: "Основной зал",
      width: 900,
      height: 600,
      sortOrder: 0,
      isActive: true,
    },
  });

  // Hall objects (decorative elements)
  const objects = [
    { type: "bar", label: "Барная стойка", x: 600, y: 40, width: 260, height: 60, rotation: 0 },
    { type: "wall", label: "Вход", x: 0, y: 260, width: 30, height: 80, rotation: 0 },
    { type: "decoration", label: "Сцена", x: 700, y: 480, width: 160, height: 80, rotation: 0 },
  ];

  for (const obj of objects) {
    await prisma.hallObject.create({
      data: {
        restaurantId: restaurant.id,
        hallId: hall.id,
        type: obj.type,
        label: obj.label,
        x: obj.x,
        y: obj.y,
        width: obj.width,
        height: obj.height,
        rotation: obj.rotation,
      },
    });
  }

  // Tables layout for a cozy bar:
  // - 3 bar stools at bar counter (top right)
  // - 4 small tables (2 seats) along left wall - intimate seating
  // - 2 medium tables (4 seats) in center
  // - 2 sofa booths (6 seats) along right wall
  // - 1 large group table (8 seats) in back

  const tables = [
    // Bar stools (round, 2 seats each)
    { number: "Б1", seats: 2, shape: "circle", x: 620, y: 130, width: 60, height: 60 },
    { number: "Б2", seats: 2, shape: "circle", x: 720, y: 130, width: 60, height: 60 },
    { number: "Б3", seats: 2, shape: "circle", x: 820, y: 130, width: 60, height: 60 },

    // Left wall - small 2-seat tables
    { number: "1", seats: 2, shape: "circle", x: 80, y: 80, width: 76, height: 76 },
    { number: "2", seats: 2, shape: "circle", x: 80, y: 200, width: 76, height: 76 },
    { number: "3", seats: 2, shape: "circle", x: 80, y: 380, width: 76, height: 76 },
    { number: "4", seats: 2, shape: "circle", x: 80, y: 500, width: 76, height: 76 },

    // Center - medium 4-seat tables (rectangle)
    { number: "5", seats: 4, shape: "rectangle", x: 280, y: 100, width: 120, height: 80 },
    { number: "6", seats: 4, shape: "rectangle", x: 280, y: 260, width: 120, height: 80 },

    // Center-right - 4-seat tables
    { number: "7", seats: 4, shape: "rectangle", x: 460, y: 180, width: 120, height: 80 },

    // Sofa booths along bottom - 6 seats
    { number: "8", seats: 6, shape: "rectangle", x: 260, y: 460, width: 160, height: 90 },
    { number: "9", seats: 6, shape: "rectangle", x: 480, y: 460, width: 160, height: 90 },

    // Group table
    { number: "10", seats: 8, shape: "rectangle", x: 460, y: 310, width: 180, height: 100 },
  ];

  for (const t of tables) {
    await prisma.restaurantTable.create({
      data: {
        restaurantId: restaurant.id,
        hallId: hall.id,
        number: t.number,
        seats: t.seats,
        shape: t.shape,
        x: t.x,
        y: t.y,
        width: t.width,
        height: t.height,
        minGuests: 1,
        maxGuests: t.seats,
        isActive: true,
      },
    });
  }

  console.log("Hall & tables created");

  // 7. Reviews
  const reviews = [
    { authorName: "Алексей К.", rating: 5, text: "Лучшее место для любителей сидра в Курске! Огромный выбор разливного сидра, отличные горячие пунши зимой. Паштет невероятный." },
    { authorName: "Мария С.", rating: 5, text: "Очень уютная атмосфера, мягкие диваны, приглушённый свет. Блинчики с карамелью — мой фаворит. Обязательно попробуйте сливочное пиво!" },
    { authorName: "Дмитрий В.", rating: 4, text: "Хороший бар. Сидров реально много, бармен подскажет. Порции закусок можно чуть побольше, но качество на высоте." },
    { authorName: "Ольга П.", rating: 5, text: "Гусь на логотипе — это любовь. Безалкогольные пунши потрясающие, особенно клюквенный. Ходим с подругами каждые выходные." },
    { authorName: "Антон Р.", rating: 5, text: "Испанский натуральный сидр — это что-то невероятное. Уникальное место для Курска, подобного нигде нет." },
    { authorName: "Екатерина Л.", rating: 4, text: "Милое заведение. Карбонара вкусная, кофе холодный освежает. Иногда бывает шумно по вечерам в пятницу, но это скорее плюс." },
  ];

  for (const r of reviews) {
    await prisma.restaurantReview.create({
      data: {
        restaurantId: restaurant.id,
        authorName: r.authorName,
        rating: r.rating,
        text: r.text,
        source: "demo",
      },
    });
  }

  console.log("Reviews created");
  console.log(`\nDone! Restaurant slug: kryzhovnik-kursk`);
  console.log(`URL: /restaurants/kryzhovnik-kursk`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
