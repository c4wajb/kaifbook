import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

type DemoRestaurant = {
  title: string;
  slug: string;
  sourceUrl: string;
  description: string;
  shortDescription: string;
  address: string;
  phone: string;
  email: string;
  averageCheck: number;
  cuisineTypes: string[];
  features: string[];
  mainPhotoUrl: string;
  galleryPhotos: string[];
  hours: Array<{ dayOfWeek: number; openTime: string; closeTime: string; isClosed?: boolean }>;
  menu: Array<{ title: string; items: Array<{ title: string; description: string; price: number; weight?: string }> }>;
};

const restaurants: DemoRestaurant[] = [
  {
    title: "Ресторан SEI",
    slug: "sei-kursk",
    sourceUrl: "https://sei.rest/",
    shortDescription: "Средиземноморская кухня, завтраки, кофе и авторская концепция шести элементов.",
    description:
      "SEI на улице Ленина работает как ресторан и кофейня с авторской средиземноморской концепцией. На официальном сайте ресторан описывает идею шести элементов, завтраки, доставку, десерты и подарочные сертификаты.",
    address: "ул. Ленина, 20",
    phone: "+7 4712 308-800",
    email: "sei.coffee@yandex.ru",
    averageCheck: 2400,
    cuisineTypes: ["средиземноморская", "европейская", "кофейня", "завтраки"],
    features: ["завтраки", "доставка", "десерты", "кофе"],
    mainPhotoUrl: "https://static.tildacdn.com/tild3164-6538-4739-b832-346438356461/881.jpg",
    galleryPhotos: [
      "https://static.tildacdn.com/tild3562-6630-4365-b831-653135383565/_.jpg",
      "https://static.tildacdn.com/tild3436-6530-4531-b436-353236326333/_.jpg",
      "https://static.tildacdn.com/tild3735-3261-4736-a432-303662393466/__1.jpg",
    ],
    hours: weeklyHours("09:00", "23:00", { 5: "23:59", 6: "23:59" }),
    menu: [
      { title: "Завтраки", items: [{ title: "Сырники SEI", description: "Демо-позиция для витрины завтраков.", price: 520 }, { title: "Омлет с зеленью", description: "Легкий завтрак с кофейным сопровождением.", price: 460 }] },
      { title: "Средиземноморье", items: [{ title: "Паста с креветками", description: "Паста в средиземноморском стиле.", price: 980 }, { title: "Салат с бурратой", description: "Свежие томаты, зелень и мягкий сыр.", price: 890 }] },
      { title: "Десерты", items: [{ title: "Фирменный торт", description: "Демо-позиция кондитерской SEI.", price: 490 }, { title: "Кофейный сет", description: "Напиток и небольшой десерт.", price: 430 }] },
    ],
  },
  {
    title: "Бутылочная bar&store",
    slug: "butylochnaya-kursk",
    sourceUrl: "https://butylochnaya.ru/",
    shortDescription: "Крафтовый бар-магазин в центре Курска со Smoke BBQ и камерной атмосферой.",
    description:
      "«Бутылочная» — бар & store на Садовой улице: крафтовое пиво, сидр, настойки, блюда из собственной коптильни и барные закуски. Официальный сайт описывает формат как уютный бар в центре Курска.",
    address: "Садовая ул., 10А",
    phone: "+7 4712 36-02-80",
    email: "butylochnaya@example.com",
    averageCheck: 1600,
    cuisineTypes: ["бар", "bbq", "европейская"],
    features: ["крафт", "музыка", "коктейли", "бар"],
    mainPhotoUrl: "https://butylochnaya.ru/assets/photos/hero.jpg",
    galleryPhotos: ["https://butylochnaya.ru/assets/photos/hero.jpg"],
    hours: weeklyHours("12:00", "23:59"),
    menu: [
      { title: "Smoke BBQ", items: [{ title: "Свиные ребрышки", description: "Позиция из коптильни по данным официального меню.", price: 680 }, { title: "Брискет с коул-слоу", description: "Мясо из смокера и гарнир.", price: 850 }] },
      { title: "Закуски", items: [{ title: "Картофель фри", description: "Барная закуска.", price: 210 }, { title: "Сет сыров", description: "Сырный сет с ягодным соусом.", price: 550 }] },
      { title: "Бар", items: [{ title: "Крафтовое пиво", description: "Линейка обновляется регулярно.", price: 320 }, { title: "Сидр", description: "Демо-позиция барной карты.", price: 300 }] },
    ],
  },
  {
    title: "Ресторан «Альт»",
    slug: "alt-kursk",
    sourceUrl: "https://welcomekursk.ru/restaurants/1463/restoran-alt",
    shortDescription: "Ресторан и кальян-бар с живой музыкой, мясными блюдами и бизнес-ланчем.",
    description:
      "«Альт» — ресторан, где можно поесть, посмотреть спортивную трансляцию или послушать живую музыку. В меню представлены итальянская и русская кухня, мясные блюда, салаты, супы, чай и кофейные коктейли.",
    address: "ул. Орловская, 9А",
    phone: "+7 996 944-46-46",
    email: "alt-kursk@example.com",
    averageCheck: 1100,
    cuisineTypes: ["итальянская", "русская", "европейская"],
    features: ["живая музыка", "бизнес-ланч", "спорт", "кальян"],
    mainPhotoUrl: "https://welcomekursk.ru/uploads/82fa492defce38d0bbb05cf984783ba8.jpg",
    galleryPhotos: [
      "https://welcomekursk.ru/uploads/0a8bb7696bbc3a3cc4d28b65b36dbf40.jpg",
      "https://welcomekursk.ru/uploads/ca359fb73015a74363992dd75c865275.jpg",
      "https://welcomekursk.ru/uploads/07d09fdfb3b2854200ec2fcf15782b00.jpg",
    ],
    hours: weeklyHours("12:00", "23:00"),
    menu: [
      { title: "Мясо", items: [{ title: "Свиные ребра", description: "Мясная позиция из описания ресторана.", price: 790 }, { title: "Бефстроганов", description: "С соленым огурчиком.", price: 760 }] },
      { title: "Салаты и супы", items: [{ title: "Цезарь с лососем", description: "Лосось на гриле.", price: 690 }, { title: "Борщ со свининой", description: "Горячий суп.", price: 390 }] },
      { title: "Бар", items: [{ title: "Кофейный коктейль", description: "Демо-позиция барной карты.", price: 360 }, { title: "Китайский чай", description: "Пуэр, сенча, масала или матча.", price: 320 }] },
    ],
  },
  {
    title: "Ресторан «Котлета»",
    slug: "kotleta-kursk",
    sourceUrl: "https://welcomekursk.ru/restaurants/1429/restoran-kotleta",
    shortDescription: "Русская кухня, большие порции, котлеты по разным рецептам и уютный интерьер.",
    description:
      "«Котлета» — уютный ресторан на Семеновской улице. В меню основной акцент сделан на традиционной русской кухне: супы, холодец, уха, котлеты, бефстроганов и гарниры.",
    address: "ул. Семеновская, 98",
    phone: "+7 951 316-49-94",
    email: "kotleta-kursk@example.com",
    averageCheck: 1700,
    cuisineTypes: ["русская", "европейская"],
    features: ["с детьми", "банкетный зал", "семейный"],
    mainPhotoUrl: "https://welcomekursk.ru/uploads/992e906e4cfdf337a62a74326e58890d.jpg",
    galleryPhotos: [
      "https://welcomekursk.ru/uploads/8fe042e033945f0a47baccadca554772.jpg",
      "https://welcomekursk.ru/uploads/36f15665cff73a579ce46b2ff266d5e3.jpg",
      "https://welcomekursk.ru/uploads/d23855637709364ba8770356ed7dcea3.jpg",
    ],
    hours: weeklyHours("12:00", "23:00"),
    menu: [
      { title: "Русская кухня", items: [{ title: "Котлета по-киевски", description: "Фирменная демо-позиция.", price: 620 }, { title: "Пожарская котлета", description: "Классика русской кухни.", price: 590 }] },
      { title: "Супы", items: [{ title: "Солянка", description: "С гренками и сметаной.", price: 390 }, { title: "Уха", description: "Из семги и осетрины.", price: 520 }] },
      { title: "Гарниры", items: [{ title: "Картофельное пюре", description: "Классический гарнир.", price: 220 }, { title: "Гречневая каша", description: "Домашний гарнир.", price: 210 }] },
    ],
  },
  {
    title: "Ресторан «Гогия»",
    slug: "gogiya-kursk",
    sourceUrl: "https://welcomekursk.ru/restaurants/1426/restoran-gogiya",
    shortDescription: "Грузинская кухня с современным характером, шашлыки, долма и цыпленок тапака.",
    description:
      "«Гогия» работает под девизом «Традиционная Грузия с современным характером». В меню много мясных блюд: шашлыки, люля-кебаб, оджахури, чашушули, долма и грузинские десерты.",
    address: "ул. Кирова, 2А",
    phone: "+7 4712 20-03-00",
    email: "gogiya-kursk@example.com",
    averageCheck: 1500,
    cuisineTypes: ["грузинская", "кавказская"],
    features: ["банкетный зал", "семейный", "мясо"],
    mainPhotoUrl: "https://welcomekursk.ru/uploads/85b512e585c05a5ef51813ebc1fe792d.jpg",
    galleryPhotos: [
      "https://welcomekursk.ru/uploads/5861b123307fd57b0a5a24054599389b.jpg",
      "https://welcomekursk.ru/uploads/e808e41c04bad85ddbc3000869057e5f.jpg",
    ],
    hours: weeklyHours("11:00", "23:00"),
    menu: [
      { title: "Гриль", items: [{ title: "Шашлык", description: "Мясо на углях.", price: 690 }, { title: "Люля-кебаб", description: "Кавказская классика.", price: 620 }] },
      { title: "Грузинская кухня", items: [{ title: "Долма", description: "С мясной начинкой.", price: 520 }, { title: "Цыпленок тапака", description: "С томатным соусом.", price: 790 }] },
      { title: "Закуски", items: [{ title: "Ассорти грузинских сыров", description: "Сырная тарелка.", price: 730 }, { title: "Рулетики из баклажанов", description: "С ореховой начинкой.", price: 420 }] },
    ],
  },
  {
    title: "Ресторан «Тбиладжио»",
    slug: "tbiladzhio-kursk",
    sourceUrl: "https://welcomekursk.ru/restaurants/1423/restoran-tbiladzhio",
    shortDescription: "Грузинская и итальянская кухня, VIP-зоны и меню для праздников.",
    description:
      "В «Тбиладжио» готовят блюда грузинской и итальянской кухни. В меню есть пицца, салаты, шашлык, хинкали, хачапури, мясные и рыбные блюда, а для больших застолий предусмотрены VIP-зоны.",
    address: "ул. Ленина, 31",
    phone: "+7 910 731-31-31",
    email: "tbiladzhio-kursk@example.com",
    averageCheck: 1800,
    cuisineTypes: ["грузинская", "итальянская", "европейская"],
    features: ["банкетный зал", "с детьми", "семейный"],
    mainPhotoUrl: "https://welcomekursk.ru/uploads/b40036014f6ae186d66f53ebce3df900.jpg",
    galleryPhotos: ["https://welcomekursk.ru/uploads/b40036014f6ae186d66f53ebce3df900.jpg"],
    hours: weeklyHours("11:00", "23:00"),
    menu: [
      { title: "Грузинская кухня", items: [{ title: "Хинкали", description: "Позиция грузинского меню.", price: 520 }, { title: "Хачапури", description: "Сырная выпечка.", price: 560 }] },
      { title: "Италия", items: [{ title: "Пицца", description: "Итальянский раздел меню.", price: 690 }, { title: "Салат с сыром", description: "Легкая позиция.", price: 480 }] },
      { title: "Гриль", items: [{ title: "Шашлык", description: "Мясо с кавказскими специями.", price: 760 }, { title: "Рыба на гриле", description: "Демо-позиция.", price: 890 }] },
    ],
  },
  {
    title: "Ресторан Seasons",
    slug: "seasons-kursk",
    sourceUrl: "https://welcomekursk.ru/restaurants/980/restoran-seasons",
    shortDescription: "Авторская кухня, европейские и азиатские акценты, современный интерьер.",
    description:
      "Seasons предлагает авторскую кухню от бренд-шефа, блюда разных континентов, гриль, десерты и барную карту. Интерьер выполнен в современном экостиле и подходит для ужина, банкетов и деловых встреч.",
    address: "ул. Перекальского, 7А",
    phone: "+7 4712 27-00-06",
    email: "seasons@kursk-element.ru",
    averageCheck: 2600,
    cuisineTypes: ["авторская", "европейская", "азиатская"],
    features: ["банкетный зал", "вино", "деловые встречи"],
    mainPhotoUrl: "https://welcomekursk.ru/uploads/963b4c81e80e841fd4ab2ff16f089c39.png",
    galleryPhotos: [
      "https://welcomekursk.ru/uploads/e7b83e2f55fb112fc27dee91d0bef7f8.png",
      "https://welcomekursk.ru/uploads/4c10dd3472cca8677fa72d5acb8302f7.png",
      "https://welcomekursk.ru/uploads/68ba46d32dd178ebd63a8ae833416f26.png",
    ],
    hours: weeklyHours("12:00", "23:59"),
    menu: [
      { title: "Авторская кухня", items: [{ title: "Салат с деликатесами", description: "Демо-позиция авторского меню.", price: 980 }, { title: "Гриль-сет", description: "Блюда на гриле.", price: 1450 }] },
      { title: "Азия и Европа", items: [{ title: "Паста с морепродуктами", description: "Европейская позиция.", price: 1160 }, { title: "Теплый салат", description: "Авторское сочетание вкусов.", price: 790 }] },
      { title: "Десерты", items: [{ title: "Десерт Seasons", description: "Фирменная сладкая позиция.", price: 520 }, { title: "Сорбет", description: "Легкий десерт.", price: 360 }] },
    ],
  },
  {
    title: "Панорамный ресторан «Мезонин»",
    slug: "mezonin-kursk",
    sourceUrl: "https://welcomekursk.ru/restaurants/592/panoramnyi-restoran-mezonin",
    shortDescription: "Панорамный ресторан в ТРК «МегаГринн» с итальянской и европейской кухней.",
    description:
      "«Мезонин» расположен на пятом этаже ТРК «МегаГринн». Из окон открывается панорамный вид на город. В ресторане готовят пасту, пиццу, салаты, супы, блюда на открытом огне и десерты; есть открытая кухня и детская игровая зона.",
    address: "ул. Карла Маркса, 68, 5 этаж",
    phone: "+7 4712 73-37-33",
    email: "mezonin@mega-grinn.ru",
    averageCheck: 2300,
    cuisineTypes: ["итальянская", "европейская", "стейки"],
    features: ["с детьми", "живая музыка", "открытая кухня", "видовой"],
    mainPhotoUrl: "https://welcomekursk.ru/uploads/9a843e584234a1aeb8733de778eaaec3.jpg",
    galleryPhotos: [
      "https://welcomekursk.ru/uploads/e9148c5fa56f91c89d601e33ad5ffcb2.jpg",
      "https://welcomekursk.ru/uploads/7468d4bd9ce8de6b7a5e0249501ff0e2.jpg",
      "https://welcomekursk.ru/uploads/d45939fb99e22eb988635652f3ee0ed2.jpg",
    ],
    hours: weeklyHours("12:00", "23:59"),
    menu: [
      { title: "Италия", items: [{ title: "Паста", description: "Домашняя паста.", price: 790 }, { title: "Пицца из печи", description: "Пицца из дровяной печи.", price: 720 }] },
      { title: "Море и гриль", items: [{ title: "Лангустины на гриле", description: "Позиция из описания ресторана.", price: 1360 }, { title: "Стейк", description: "Блюдо на открытом огне.", price: 1550 }] },
      { title: "Десерты", items: [{ title: "Домашнее мороженое", description: "Десерт ресторана.", price: 340 }, { title: "Буррата", description: "Свежий сыр с подачей.", price: 850 }] },
    ],
  },
  {
    title: "Ресторан «Испанский»",
    slug: "ispansky-kursk",
    sourceUrl: "https://welcomekursk.ru/restaurants/583/restoran-ispanskii",
    shortDescription: "Ресторан-сыроварня с морепродуктами, сырами и средиземноморской кухней.",
    description:
      "«Испанский» — ресторан-сыроварня на Карла Маркса. Здесь делают сливочные сыры, подают моцареллу, страчателлу, буррату, устрицы, осьминога, креветки, стейки и блюда средиземноморской кухни.",
    address: "ул. Карла Маркса, 6, 4 этаж",
    phone: "+7 910 271-85-42",
    email: "ispansky-kursk@example.com",
    averageCheck: 2800,
    cuisineTypes: ["средиземноморская", "испанская", "сыроварня", "морепродукты"],
    features: ["доставка", "вино", "сыроварня", "видовой"],
    mainPhotoUrl: "https://welcomekursk.ru/uploads/94d62ae82f628b7346d3d980dd0f0227.jpg",
    galleryPhotos: [
      "https://welcomekursk.ru/uploads/56196d3902295810caae1557e6433d8d.jpg",
      "https://welcomekursk.ru/uploads/54d18542dbbcb7a655e315db3ef2991e.jpg",
      "https://welcomekursk.ru/uploads/c9f23f808bf3c77518034fdfe92d7873.jpg",
    ],
    hours: weeklyHours("10:00", "23:00"),
    menu: [
      { title: "Сыроварня", items: [{ title: "Буррата", description: "Сливочный сыр собственного производства.", price: 790 }, { title: "Страчателла", description: "Нежный сыр с сезонной подачей.", price: 690 }] },
      { title: "Море", items: [{ title: "Устрицы", description: "Демо-позиция морского меню.", price: 420 }, { title: "Осьминог", description: "Средиземноморская подача.", price: 1490 }] },
      { title: "Горячее", items: [{ title: "Испанский стейк", description: "Мясное блюдо.", price: 1650 }, { title: "Королевские креветки", description: "С чесночным соусом.", price: 1250 }] },
    ],
  },
  {
    title: "Винный бар Culture",
    slug: "culture-kursk",
    sourceUrl: "https://welcomekursk.ru/restaurants/1435/vinnyi-bar-culture",
    shortDescription: "Винный бар с авторской кухней, сомелье, коктейлями и летней верандой.",
    description:
      "Culture — винный бар с авторской кухней, лофтовым интерьером и большой винной картой. Гостям помогают подобрать вино к блюдам, летом работает веранда, а в меню есть авторские позиции от шеф-повара.",
    address: "ул. Димитрова, 66",
    phone: "+7 951 076-25-54",
    email: "culture-kursk@example.com",
    averageCheck: 2200,
    cuisineTypes: ["авторская", "европейская", "винный бар"],
    features: ["вино", "летняя веранда", "коктейли", "сомелье"],
    mainPhotoUrl: "https://welcomekursk.ru/uploads/3903e4e3c23d72fbcd379cf0efb1e17a.jpg",
    galleryPhotos: [
      "https://welcomekursk.ru/uploads/b678b634b7b1926280f3f473538260b0.jpg",
      "https://welcomekursk.ru/uploads/bc1f5a0909a5e5e7a67aec373aa61f0b.jpg",
      "https://welcomekursk.ru/uploads/2445fca2661587f4e0aa8c23cb4a8e1e.jpg",
    ],
    hours: weeklyHours("12:00", "23:59"),
    menu: [
      { title: "Вино и закуски", items: [{ title: "Сырная тарелка", description: "Пара к вину.", price: 780 }, { title: "Брускетты", description: "Легкая закуска.", price: 460 }] },
      { title: "Авторская кухня", items: [{ title: "Говяжья щека", description: "С птитимом и соусом из печеного перца.", price: 970 }, { title: "Салат от шефа", description: "Демо-позиция авторского меню.", price: 620 }] },
      { title: "Бар", items: [{ title: "Бокал вина", description: "Выбор сомелье.", price: 450 }, { title: "Коктейль Culture", description: "Фирменная подача.", price: 520 }] },
    ],
  },
  {
    title: "Ресторан Introvert",
    slug: "introvert-kursk",
    sourceUrl: "https://welcomekursk.ru/restaurants/1422/restoran-introvert",
    shortDescription: "Ресторан на Магистральной улице для спокойных ужинов и встреч.",
    description: "Карточка ресторана Introvert размещена на портале «Соловьиный край». Для MVP добавлены базовые данные, фото и демо-меню, чтобы заведение участвовало в поиске и бронировании.",
    address: "ул. Магистральная, 2",
    phone: "+7 961 191-14-41",
    email: "introvert-kursk@example.com",
    averageCheck: 1600,
    cuisineTypes: ["европейская", "авторская"],
    features: ["семейный", "вино", "коктейли"],
    mainPhotoUrl: "https://welcomekursk.ru/uploads/e7f2dfc357e76444dbf9e36fc5e4f68a.jpg",
    galleryPhotos: ["https://welcomekursk.ru/uploads/e7f2dfc357e76444dbf9e36fc5e4f68a.jpg"],
    hours: weeklyHours("12:00", "23:00"),
    menu: europeanMenu("Introvert"),
  },
  {
    title: "Ресторан Sava",
    slug: "sava-kursk",
    sourceUrl: "https://welcomekursk.ru/restaurants/1389/restoran-sava",
    shortDescription: "Современная европейская кухня и одна из крупных карт стейков в Курске.",
    description: "Sava описывает себя как ресторан современной аутентичной европейской кухни с крупной картой стейков. В MVP средний чек и меню используются как демонстрационные данные.",
    address: "ул. Ленина, 12",
    phone: "+7 960 676-85-83",
    email: "sava-kursk@example.com",
    averageCheck: 2600,
    cuisineTypes: ["европейская", "стейки", "авторская"],
    features: ["вино", "мясо", "деловые встречи"],
    mainPhotoUrl: "https://welcomekursk.ru/uploads/c682af8ee792d5c55f8cb3760f4fcffc.jpg",
    galleryPhotos: ["https://welcomekursk.ru/uploads/c682af8ee792d5c55f8cb3760f4fcffc.jpg"],
    hours: weeklyHours("12:00", "23:00"),
    menu: steakMenu("Sava"),
  },
  {
    title: "Ресторан «Аквамарин»",
    slug: "akvamarin-kursk",
    sourceUrl: "https://welcomekursk.ru/restaurants/1208/restoran-akvamarin",
    shortDescription: "Ресторан при Aquamarine hotel&spa на Интернациональной улице.",
    description: "«Аквамарин» представлен на туристическом портале Курской области. Для демо-каталога добавлены основные контактные данные, фото и универсальное ресторанное меню.",
    address: "ул. Интернациональная, 64",
    phone: "+7 4712 20-09-99",
    email: "akvamarin-kursk@example.com",
    averageCheck: 1900,
    cuisineTypes: ["европейская", "русская"],
    features: ["банкетный зал", "семейный", "парковка"],
    mainPhotoUrl: "https://welcomekursk.ru/uploads/e070135ee6456a001a72fba0c1440e8f.jpg",
    galleryPhotos: ["https://welcomekursk.ru/uploads/e070135ee6456a001a72fba0c1440e8f.jpg"],
    hours: weeklyHours("11:00", "23:00"),
    menu: europeanMenu("Аквамарин"),
  },
  {
    title: "Ресторан «Морской конёк»",
    slug: "morskoy-konek-kursk",
    sourceUrl: "https://welcomekursk.ru/restaurants/981/restoran-morskoi-konyok",
    shortDescription: "Рыбный ресторан с морепродуктами, устрицами, мидиями и крабом.",
    description: "«Морской конёк» на портале описан как первый рыбный ресторан в Черноземье. В меню используются морепродукты, рыба, устрицы, мидии и гребешки.",
    address: "ул. Ленина, 2",
    phone: "+7 4712 52-05-20",
    email: "morskoy-konek@example.com",
    averageCheck: 3200,
    cuisineTypes: ["морепродукты", "европейская"],
    features: ["вино", "морепродукты", "видовой"],
    mainPhotoUrl: "https://welcomekursk.ru/uploads/593ecbbe1dde636df71ee6d1d4f57d5b.jpg",
    galleryPhotos: ["https://welcomekursk.ru/uploads/593ecbbe1dde636df71ee6d1d4f57d5b.jpg"],
    hours: weeklyHours("12:00", "23:00"),
    menu: seafoodMenu("Морской конёк"),
  },
  {
    title: "Ресторан «Белая акация»",
    slug: "belaya-akaciya-kursk",
    sourceUrl: "https://welcomekursk.ru/restaurants/789/restoran-belaya-akaciya",
    shortDescription: "Традиционные блюда Курской губернии и русская кухня.",
    description: "«Белая акация» позиционируется как место, где можно попробовать традиционные блюда Курской губернии. Для MVP добавлены демо-позиции русской кухни.",
    address: "ул. 50 лет Октября, 4А",
    phone: "+7 4712 27-05-00",
    email: "belaya-akaciya@example.com",
    averageCheck: 1700,
    cuisineTypes: ["русская", "европейская"],
    features: ["семейный", "банкетный зал", "с детьми"],
    mainPhotoUrl: "https://welcomekursk.ru/uploads/1c2431483c81c284fcec2ee1c3604868.jpg",
    galleryPhotos: ["https://welcomekursk.ru/uploads/1c2431483c81c284fcec2ee1c3604868.jpg"],
    hours: weeklyHours("11:00", "23:00"),
    menu: russianMenu("Белая акация"),
  },
  {
    title: "Ресторан «Пивзавод»",
    slug: "pivzavod-kursk",
    sourceUrl: "https://welcomekursk.ru/restaurants/587/restoran-pivzavod",
    shortDescription: "Beer & street food на Карла Маркса.",
    description: "«Пивзавод» представлен как beer & street food формат. В seed добавлены блюда под барный сценарий: бургеры, закуски и напитки.",
    address: "ул. Карла Маркса, 6",
    phone: "+7 910 271-85-78",
    email: "pivzavod-kursk@example.com",
    averageCheck: 1400,
    cuisineTypes: ["бар", "bbq", "европейская"],
    features: ["крафт", "бар", "музыка"],
    mainPhotoUrl: "https://welcomekursk.ru/uploads/2cff1b4c2d8c6a2f15206f4487e817c7.jpg",
    galleryPhotos: ["https://welcomekursk.ru/uploads/2cff1b4c2d8c6a2f15206f4487e817c7.jpg"],
    hours: weeklyHours("12:00", "23:59"),
    menu: barMenu("Пивзавод"),
  },
  {
    title: "Ресторан «Утка»",
    slug: "utka-kursk",
    sourceUrl: "https://welcomekursk.ru/restaurants/586/restoran-utka",
    shortDescription: "Авторская кухня, свежие продукты и винная карта.",
    description: "«Утка» описана как ресторан авторской кухни с необычными сочетаниями вкусов, свежими продуктами и вином. В MVP добавлены авторские демо-позиции.",
    address: "ул. Студенческая, 1",
    phone: "+7 910 730-31-13",
    email: "utka-kursk@example.com",
    averageCheck: 2400,
    cuisineTypes: ["авторская", "европейская"],
    features: ["вино", "семейный", "деловые встречи"],
    mainPhotoUrl: "https://welcomekursk.ru/uploads/399527825518cc8f659bca95c53d5bd5.jpg",
    galleryPhotos: ["https://welcomekursk.ru/uploads/399527825518cc8f659bca95c53d5bd5.jpg"],
    hours: weeklyHours("12:00", "23:00"),
    menu: europeanMenu("Утка"),
  },
  {
    title: "Рестобар Caramel",
    slug: "caramel-kursk",
    sourceUrl: "https://welcomekursk.ru/restaurants/585/restobar-caramel",
    shortDescription: "Оригинальные блюда, контактный бар, вечеринки и караоке.",
    description: "Caramel — рестобар на проспекте Дериглазова. В описании портала указаны оригинальные блюда, контактный бар, вечеринки и караоке.",
    address: "пр-т Анатолия Дериглазова, 17г",
    phone: "+7 4712 74-74-66",
    email: "caramel-kursk@example.com",
    averageCheck: 1500,
    cuisineTypes: ["бар", "европейская"],
    features: ["коктейли", "музыка", "караоке"],
    mainPhotoUrl: "https://welcomekursk.ru/uploads/d8171ecfd48da29d8251172c3eaa2b40.jpg",
    galleryPhotos: ["https://welcomekursk.ru/uploads/d8171ecfd48da29d8251172c3eaa2b40.jpg"],
    hours: weeklyHours("12:00", "23:59"),
    menu: barMenu("Caramel"),
  },
  {
    title: "Ресторан Ferma",
    slug: "ferma-kursk",
    sourceUrl: "https://welcomekursk.ru/restaurants/584/restoran-ferma",
    shortDescription: "Ресторан с мировой картой вкусов на Карла Маркса.",
    description: "Ferma представлен на портале как ресторан с мировой картой вкусов. Для MVP добавлены блюда европейской и авторской кухни.",
    address: "ул. Карла Маркса, 6",
    phone: "+7 919 173-17-17",
    email: "ferma-kursk@example.com",
    averageCheck: 2200,
    cuisineTypes: ["европейская", "авторская"],
    features: ["семейный", "вино", "банкетный зал"],
    mainPhotoUrl: "https://welcomekursk.ru/uploads/c356b10aedf4ba14b8a35721f30ea1cf.jpg",
    galleryPhotos: ["https://welcomekursk.ru/uploads/c356b10aedf4ba14b8a35721f30ea1cf.jpg"],
    hours: weeklyHours("11:00", "23:00"),
    menu: europeanMenu("Ferma"),
  },
  {
    title: "Ресторан «Быковский»",
    slug: "bykovsky-kursk",
    sourceUrl: "https://welcomekursk.ru/restaurants/582/restoran-bykovskii",
    shortDescription: "Ресторан для всей семьи на Карла Маркса.",
    description: "«Быковский» указан на портале как ресторан для всей семьи. В демо-каталоге он доступен для поиска, просмотра и бронирования.",
    address: "ул. Карла Маркса, 10",
    phone: "+7 910 315-31-35",
    email: "bykovsky-kursk@example.com",
    averageCheck: 1800,
    cuisineTypes: ["европейская", "русская"],
    features: ["семейный", "с детьми", "банкетный зал"],
    mainPhotoUrl: "https://welcomekursk.ru/uploads/c64465e80a09c789993aca844458bc45.jpg",
    galleryPhotos: ["https://welcomekursk.ru/uploads/c64465e80a09c789993aca844458bc45.jpg"],
    hours: weeklyHours("11:00", "23:00"),
    menu: russianMenu("Быковский"),
  },
  {
    title: "Ресторан «Ривьера»",
    slug: "rivera-kursk",
    sourceUrl: "https://welcomekursk.ru/restaurants/494/restoran-rivera",
    shortDescription: "Семейный ресторан с авторской кухней и детским меню.",
    description: "«Ривьера» — семейный ресторан с авторской кухней, банкетным залом и детским меню. Карточка добавлена для расширения клиентского каталога.",
    address: "ул. Красной Армии, 59",
    phone: "+7 4712 31-50-50",
    email: "rivera-kursk@example.com",
    averageCheck: 1700,
    cuisineTypes: ["европейская", "авторская", "детское меню"],
    features: ["с детьми", "банкетный зал", "семейный"],
    mainPhotoUrl: "https://welcomekursk.ru/uploads/7482bc47a9efed2932d03b61e0784ced.jpg",
    galleryPhotos: ["https://welcomekursk.ru/uploads/7482bc47a9efed2932d03b61e0784ced.jpg"],
    hours: weeklyHours("11:00", "23:00"),
    menu: familyMenu("Ривьера"),
  },
  {
    title: "Джаз-клуб RedStone",
    slug: "redstone-kursk",
    sourceUrl: "https://welcomekursk.ru/restaurants/492/dzhaz-klub-redstone",
    shortDescription: "Ресторан с живой джазовой музыкой.",
    description: "RedStone — джаз-клуб и ресторан с живой музыкой. Для MVP добавлены барные и ресторанные позиции, а также возможность брони.",
    address: "ул. Верхняя Луговая, 32",
    phone: "+7 909 236-57-97",
    email: "redstone-kursk@example.com",
    averageCheck: 1900,
    cuisineTypes: ["бар", "европейская"],
    features: ["живая музыка", "коктейли", "бар"],
    mainPhotoUrl: "https://welcomekursk.ru/uploads/255d49601057f9cb38c890bef1d98b0c.jpg",
    galleryPhotos: ["https://welcomekursk.ru/uploads/255d49601057f9cb38c890bef1d98b0c.jpg"],
    hours: weeklyHours("18:00", "23:59"),
    menu: barMenu("RedStone"),
  },
  {
    title: "Кофейня «Комета»",
    slug: "kometa-kursk",
    sourceUrl: "https://welcomekursk.ru/restaurants/588/kofeinya-kometa",
    shortDescription: "Небольшая specialty-кофейня у КГУ с террасой и dog-friendly форматом.",
    description: "«Комета» — кофейня с панорамными окнами, кофе по авторским рецептам, сибирским чаем, десертами, летними лимонадами и dog-friendly подходом.",
    address: "ул. Ленина, 24/1",
    phone: "+7 961 194-10-89",
    email: "kometa-kursk@example.com",
    averageCheck: 700,
    cuisineTypes: ["кофейня", "завтраки", "десерты"],
    features: ["pet-friendly", "летняя веранда", "кофе"],
    mainPhotoUrl: "https://welcomekursk.ru/uploads/6c46bc5b06eaab9903e31c77b64c5623.jpg",
    galleryPhotos: [
      "https://welcomekursk.ru/uploads/6c46bc5b06eaab9903e31c77b64c5623.jpg",
      "https://welcomekursk.ru/uploads/1b715030467d84ab47e6c265da02d99b.jpg",
      "https://welcomekursk.ru/uploads/184d3430e41adab393f9b114c5ae40c6.jpg",
    ],
    hours: weekdayWeekendHours("08:30", "22:00", "10:00", "22:00"),
    menu: coffeeMenu("Комета"),
  },
  {
    title: "Кофейня Bloom Coffee",
    slug: "bloom-coffee-kursk",
    sourceUrl: "https://welcomekursk.ru/restaurants/1109/kofeinya-bloom-coffee",
    shortDescription: "Кофейня и цветочный бар с завтраками-конструкторами и авторскими рафами.",
    description: "Bloom Coffee сочетает формат кофейни и цветочного бара. В меню — завтраки-конструкторы, сырники с разными начинками, классический кофе и авторские рафы.",
    address: "ул. Димитрова, 66",
    phone: "+7 4712 55-00-66",
    email: "bloom-coffee-kursk@example.com",
    averageCheck: 900,
    cuisineTypes: ["кофейня", "завтраки", "десерты"],
    features: ["завтраки", "кофе", "семейный"],
    mainPhotoUrl: "https://welcomekursk.ru/uploads/b0cf0155a29106f7249f9b72c27a8de2.png",
    galleryPhotos: [
      "https://welcomekursk.ru/uploads/b0cf0155a29106f7249f9b72c27a8de2.png",
      "https://welcomekursk.ru/uploads/1b715030467d84ab47e6c265da02d99b.jpg",
      "https://welcomekursk.ru/uploads/91274aead74cc1f7afc3dd9bf890140e.jpg",
    ],
    hours: weeklyHours("08:00", "22:00"),
    menu: coffeeMenu("Bloom Coffee"),
  },
  {
    title: "Кофейня «Канело»",
    slug: "kanelo-kursk",
    sourceUrl: "https://welcomekursk.ru/restaurants/131/kofeinya-kanelo",
    shortDescription: "Скандинавская кофейня в центре Курска с завтраками весь день.",
    description: "«Канело» — небольшая кофейня в скандинавском стиле. Здесь готовят завтраки весь день, классический и альтернативный кофе, авторские напитки, лимонады и чай.",
    address: "ул. Ленина, 86",
    phone: "+7 930 768-80-77",
    email: "kanelo-kursk@example.com",
    averageCheck: 850,
    cuisineTypes: ["кофейня", "завтраки", "десерты"],
    features: ["pet-friendly", "завтраки", "кофе"],
    mainPhotoUrl: "https://welcomekursk.ru/uploads/e85db2468a6b15f7bfaa1f87d3082d3c.jpg",
    galleryPhotos: [
      "https://welcomekursk.ru/uploads/e85db2468a6b15f7bfaa1f87d3082d3c.jpg",
      "https://welcomekursk.ru/uploads/184d3430e41adab393f9b114c5ae40c6.jpg",
      "https://welcomekursk.ru/uploads/fc15cd3b23cd1893bbfd350419a12bff.jpg",
    ],
    hours: weekdayWeekendHours("08:00", "22:00", "09:00", "23:00"),
    menu: coffeeMenu("Канело"),
  },
  {
    title: "Кофейня Donut Bar",
    slug: "donut-bar-kursk",
    sourceUrl: "https://welcomekursk.ru/restaurants/973/kofeinya-donut-bar",
    shortDescription: "Кофейня с донатами, завтраками, ланчами и доставкой.",
    description: "Donut Bar — уютная кофейня в центре Курска. В меню есть авторские напитки, десерты, завтраки, ланчи и фирменные пончики собственного производства.",
    address: "ул. Радищева, 58",
    phone: "+7 4712 54-58-58",
    email: "donut-bar-kursk@example.com",
    averageCheck: 750,
    cuisineTypes: ["кофейня", "завтраки", "десерты"],
    features: ["доставка", "завтраки", "кофе"],
    mainPhotoUrl: "https://welcomekursk.ru/uploads/2907ab23bf8f7e73f1f0535545943356.jpg",
    galleryPhotos: [
      "https://welcomekursk.ru/uploads/2907ab23bf8f7e73f1f0535545943356.jpg",
      "https://welcomekursk.ru/uploads/b0cf0155a29106f7249f9b72c27a8de2.png",
      "https://welcomekursk.ru/uploads/91274aead74cc1f7afc3dd9bf890140e.jpg",
    ],
    hours: weeklyHours("09:00", "22:00"),
    menu: coffeeMenu("Donut Bar"),
  },
  {
    title: "Кафе-пельменная «Папа лепит»",
    slug: "papa-lepit-kursk",
    sourceUrl: "https://welcomekursk.ru/restaurants/1295/kafe-pelmennaya-papa-lepit",
    shortDescription: "Кафе с пельменями, варениками, супами, сырниками и доставкой.",
    description: "«Папа лепит» — кафе-пельменная на улице Димитрова. Здесь можно пообедать, взять горячий перекус с собой, заказать доставку или купить замороженные полуфабрикаты.",
    address: "ул. Димитрова",
    phone: "+7 4712 70-70-70",
    email: "papa-lepit-kursk@example.com",
    averageCheck: 650,
    cuisineTypes: ["русская", "кафе", "домашняя кухня"],
    features: ["доставка", "с детьми", "недорого"],
    mainPhotoUrl: "https://welcomekursk.ru/uploads/041d3950263c542cc5c00209d9bbc743.jpg",
    galleryPhotos: [
      "https://welcomekursk.ru/uploads/041d3950263c542cc5c00209d9bbc743.jpg",
      "https://welcomekursk.ru/uploads/8d262f0bc3e3a53ddff3f75c782cdcea.jpg",
      "https://welcomekursk.ru/uploads/261a342bb70a904baf733ea1fb0a5725.jpg",
    ],
    hours: weeklyHours("10:00", "21:00"),
    menu: pelmeniMenu("Папа лепит"),
  },
];

function weeklyHours(openTime: string, closeTime: string, overrides: Record<number, string> = {}) {
  return [1, 2, 3, 4, 5, 6, 0].map((dayOfWeek) => ({
    dayOfWeek,
    openTime,
    closeTime: overrides[dayOfWeek] ?? closeTime,
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

function europeanMenu(name: string) {
  return [
    { title: "Закуски", items: [{ title: `Салат ${name}`, description: "Демо-позиция для расширенного каталога.", price: 520 }, { title: "Брускетта", description: "Легкая закуска к столу.", price: 390 }] },
    { title: "Горячее", items: [{ title: "Паста с соусом", description: "Европейская горячая позиция.", price: 690 }, { title: "Куриное филе", description: "С овощами и соусом.", price: 740 }] },
    { title: "Напитки", items: [{ title: "Домашний лимонад", description: "Освежающий напиток.", price: 260 }, { title: "Чайная карта", description: "Черный, зеленый или травяной чай.", price: 240 }] },
  ];
}

function russianMenu(name: string) {
  return [
    { title: "Русская кухня", items: [{ title: `Фирменное блюдо ${name}`, description: "Демо-позиция русской кухни.", price: 620 }, { title: "Борщ", description: "Классический суп.", price: 360 }] },
    { title: "Горячее", items: [{ title: "Котлета с пюре", description: "Домашняя горячая позиция.", price: 540 }, { title: "Жаркое", description: "Мясо и овощи.", price: 650 }] },
    { title: "Напитки", items: [{ title: "Морс", description: "Домашний ягодный напиток.", price: 190 }, { title: "Чай", description: "Чайник на стол.", price: 240 }] },
  ];
}

function steakMenu(name: string) {
  return [
    { title: "Стейки", items: [{ title: `Стейк ${name}`, description: "Демо-позиция мясного меню.", price: 1450 }, { title: "Медальоны", description: "С овощами и соусом.", price: 1120 }] },
    { title: "Гарниры", items: [{ title: "Овощи гриль", description: "Гарнир к мясу.", price: 340 }, { title: "Картофель", description: "Запеченный картофель.", price: 280 }] },
    { title: "Бар", items: [{ title: "Бокал вина", description: "Подбор к мясу.", price: 480 }, { title: "Лимонад", description: "Домашний напиток.", price: 260 }] },
  ];
}

function seafoodMenu(name: string) {
  return [
    { title: "Море", items: [{ title: `Сет ${name}`, description: "Демо-сет морепродуктов.", price: 1650 }, { title: "Мидии", description: "В сливочном соусе.", price: 980 }] },
    { title: "Рыба", items: [{ title: "Филе рыбы", description: "С овощами.", price: 1190 }, { title: "Креветки", description: "С чесночным маслом.", price: 1250 }] },
    { title: "Напитки", items: [{ title: "Белое вино", description: "Пара к морепродуктам.", price: 520 }, { title: "Вода", description: "Газированная или негазированная.", price: 180 }] },
  ];
}

function barMenu(name: string) {
  return [
    { title: "Бар", items: [{ title: `Коктейль ${name}`, description: "Фирменная демо-позиция.", price: 480 }, { title: "Крафтовое пиво", description: "Линейка меняется.", price: 330 }] },
    { title: "Закуски", items: [{ title: "Бургер", description: "Барная горячая позиция.", price: 590 }, { title: "Картофель фри", description: "Классическая закуска.", price: 220 }] },
    { title: "Горячее", items: [{ title: "Куриные крылья", description: "С соусом.", price: 490 }, { title: "Ребра BBQ", description: "Мясо в соусе.", price: 790 }] },
  ];
}

function familyMenu(name: string) {
  return [
    { title: "Семейное меню", items: [{ title: `Салат ${name}`, description: "Легкая позиция для всей семьи.", price: 470 }, { title: "Суп дня", description: "Демо-позиция.", price: 330 }] },
    { title: "Детское меню", items: [{ title: "Куриные котлетки", description: "С картофельным пюре.", price: 390 }, { title: "Сырники", description: "Со сметаной.", price: 340 }] },
    { title: "Десерты", items: [{ title: "Мороженое", description: "Ванильное или шоколадное.", price: 260 }, { title: "Пирог", description: "Домашний десерт.", price: 310 }] },
  ];
}

function coffeeMenu(name: string) {
  return [
    { title: "Кофе", items: [{ title: `Раф ${name}`, description: "Авторский кофейный напиток.", price: 260 }, { title: "Капучино", description: "Классический кофе.", price: 210 }] },
    { title: "Завтраки", items: [{ title: "Сырники", description: "Со сметаной и ягодами.", price: 360 }, { title: "Омлет", description: "С зеленью и сыром.", price: 390 }] },
    { title: "Десерты", items: [{ title: "Донат", description: "Сладкая позиция к кофе.", price: 180 }, { title: "Круассан", description: "Свежая выпечка.", price: 220 }] },
  ];
}

function pelmeniMenu(name: string) {
  return [
    { title: "Пельмени", items: [{ title: `Пельмени ${name}`, description: "Фирменная демо-позиция.", price: 360 }, { title: "Жареные пельмени", description: "С хрустящей корочкой.", price: 390 }] },
    { title: "Домашняя кухня", items: [{ title: "Вареники", description: "С картофелем или творогом.", price: 330 }, { title: "Суп дня", description: "Горячий обед.", price: 290 }] },
    { title: "Напитки", items: [{ title: "Морс", description: "Домашний ягодный напиток.", price: 160 }, { title: "Чай", description: "Черный или зеленый.", price: 140 }] },
  ];
}

function day(days: number) {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + days));
}

function tableData(count: number) {
  return Array.from({ length: count }, (_, i) => ({
    number: String(i + 1),
    seats: i % 4 === 0 ? 6 : i % 2 === 0 ? 4 : 2,
    shape: i % 3 === 0 ? "circle" : i % 2 === 0 ? "square" : "rectangle",
    x: 54 + (i % 5) * 154,
    y: 48 + Math.floor(i / 5) * 132,
    width: i % 3 === 0 ? 86 : 112,
    height: i % 3 === 0 ? 86 : 72,
    rotation: 0,
    isActive: true,
  }));
}

async function updateGuestStats(guestId: string) {
  const reservations = await prisma.reservation.findMany({ where: { guestId }, select: { status: true, guestsCount: true, reservationDate: true } });
  const completed = reservations.filter((reservation) => reservation.status === "completed" || reservation.status === "seated");
  const noShowCount = reservations.filter((reservation) => reservation.status === "no_show").length;
  const noShowRate = reservations.length ? Math.round((noShowCount / reservations.length) * 100) : 0;
  const lastVisitAt = completed.map((reservation) => reservation.reservationDate).sort((a, b) => b.getTime() - a.getTime())[0] ?? null;
  const lastReservationAt = reservations.map((reservation) => reservation.reservationDate).sort((a, b) => b.getTime() - a.getTime())[0] ?? null;
  await prisma.guest.update({
    where: { id: guestId },
    data: {
      reservationsCount: reservations.length,
      visitsCount: completed.length,
      completedVisitsCount: completed.length,
      noShowCount,
      noShowRate,
      cancelledCount: reservations.filter((reservation) => reservation.status === "cancelled" || reservation.status === "cancelled_by_guest" || reservation.status === "cancelled_by_restaurant" || reservation.status === "rejected").length,
      lastReservationAt,
      lastVisitAt,
      riskLevel: noShowCount > 0 || noShowRate >= 25 ? "high" : noShowRate >= 10 ? "medium" : "low",
      totalGuests: completed.reduce((sum, reservation) => sum + reservation.guestsCount, 0),
    },
  });
}

async function createRestaurantSaasDemo(ownerId: string, customerId: string) {
  const restaurant = await prisma.restaurant.create({
    data: {
      ownerId,
      title: "Ресторан «Лето»",
      slug: "leto-demo-kursk",
      description:
        "Демо-ресторан для продажи SaaS: европейская и японская кухня, летняя веранда, семейные ужины, банкеты и удобная онлайн-бронь без звонка. Средний чек указан как демо-оценка для MVP.",
      shortDescription: "Демо-ресторан с живой аналитикой, CRM гостей и бронями за последние 14 дней.",
      city: "Курск",
      address: "ул. Ленина, 20",
      phone: "+7 4712 55-44-33",
      email: "leto-demo@restaurant.local",
      website: "https://kaifbook.ru/r/leto-demo-kursk/book",
      averageCheck: 2500,
      cuisineTypes: JSON.stringify(["европейская", "японская"]),
      features: JSON.stringify(["с детьми", "летняя веранда", "банкеты"]),
      mainPhotoUrl: "/images/stock/restaurants/dining-01.jpg",
      galleryPhotos: JSON.stringify([
        "/images/stock/restaurants/dining-02.jpg",
        "/images/stock/restaurants/dining-03.jpg",
      ]),
      status: "approved",
      isActive: true,
    },
  });

  await prisma.reservationSettings.create({
    data: {
      restaurantId: restaurant.id,
      minGuests: 1,
      maxGuests: 20,
      reservationDurationMinutes: 120,
      minAdvanceBookingMinutes: 60,
      maxAdvanceBookingDays: 45,
      autoConfirmEnabled: false,
      allowTableSelection: true,
      allowSeatSelection: true,
      reserveWholeTableWhenSeatsSelected: true,
      minSeatsSelection: 1,
      bookingIntervalMinutes: 30,
      cancellationPolicyText: "Если планы изменились, пожалуйста, отмените бронь не позднее чем за 2 часа до визита.",
    },
  });

  for (const h of weeklyHours("10:00", "23:00", { 5: "23:59", 6: "23:59", 0: "22:00" })) {
    await prisma.restaurantWorkingHour.create({ data: { ...h, restaurantId: restaurant.id } });
  }

  const menu = [
    { title: "Завтраки", items: [{ title: "Сырники с ягодами", description: "Сметана, ягодный соус, мята.", price: 420 }, { title: "Омлет с лососем", description: "Легкий завтрак с зеленью.", price: 590 }] },
    { title: "Основное", items: [{ title: "Ролл Лето", description: "Лосось, авокадо, сливочный сыр.", price: 760 }, { title: "Паста с креветками", description: "Сливочный соус и томаты.", price: 890 }, { title: "Цыпленок гриль", description: "Овощи и соус демиглас.", price: 820 }] },
    { title: "Банкеты", items: [{ title: "Сет на компанию", description: "Ассорти закусок для 4 гостей.", price: 2400 }, { title: "Фруктовая тарелка", description: "Сезонные фрукты.", price: 950 }] },
  ];

  for (const [sortOrder, category] of menu.entries()) {
    const createdCategory = await prisma.menuCategory.create({ data: { restaurantId: restaurant.id, title: category.title, sortOrder, isActive: true } });
    for (const [itemIndex, item] of category.items.entries()) {
      await prisma.menuItem.create({ data: { restaurantId: restaurant.id, categoryId: createdCategory.id, title: item.title, description: item.description, price: item.price, weight: "1 порция", sortOrder: itemIndex, isAvailable: true } });
    }
  }

  const hall = await prisma.hall.create({ data: { restaurantId: restaurant.id, title: "Основной зал", width: 900, height: 520, sortOrder: 0, isActive: true } });
  const tables: Array<{ id: string }> = [];
  for (const t of tableData(10)) tables.push(await prisma.restaurantTable.create({ data: { ...t, hallId: hall.id, restaurantId: restaurant.id } }));

  const guestInputs = [
    ["Анна Смирнова", "+79205550101", "VIP"],
    ["Игорь Петров", "+79205550102", "постоянный"],
    ["Мария Иванова", "+79205550103", "с детьми"],
    ["Дмитрий Соколов", "+79205550104", "любит окно"],
    ["Елена Орлова", "+79205550105", "день рождения"],
    ["Павел Морозов", "+79205550106", "деловая встреча"],
    ["Ольга Кузнецова", "+79205550107", "постоянный"],
    ["Никита Волков", "+79205550108", "no-show risk"],
    ["Светлана Белова", "+79205550109", "банкет"],
    ["Алексей Фролов", "+79205550110", "VIP"],
    ["Кирилл Егоров", "+79205550111", "свидание"],
    ["Дарья Лебедева", "+79205550112", "завтраки"],
    ["Роман Захаров", "+79205550113", "проблемный"],
    ["Виктория Павлова", "+79205550114", "постоянный"],
    ["Сергей Новиков", "+79205550115", "любит окно"],
  ];
  const guests: Array<{ id: string; name: string; phone: string; email: string | null }> = [];
  for (const [name, phone, tag] of guestInputs) {
    guests.push(await prisma.guest.create({ data: { restaurantId: restaurant.id, name, phone, email: `${phone.replace(/\D/g, "")}@example.com`, tags: JSON.stringify([tag]) } }));
  }

  const statuses = ["completed", "completed", "confirmed", "new", "cancelled", "no_show", "seated", "completed"];
  const sources = ["site", "vk", "telegram", "manual", "widget"];
  const occasions = ["обычный визит", "день рождения", "семейный ужин", "деловая встреча", "свидание", "банкет"];
  for (let i = 0; i < 30; i++) {
    const guest = guests[i % guests.length];
    const status = statuses[i % statuses.length];
    const reservationDate = day(-13 + (i % 14));
    const startHour = [12, 14, 18, 19, 20, 21][i % 6];
    const table = tables[i % tables.length];
    await prisma.reservation.create({
      data: {
        restaurantId: restaurant.id,
        guestId: guest.id,
        hallId: hall.id,
        tableId: table.id,
        userId: i % 5 === 0 ? customerId : null,
        customerName: guest.name,
        customerPhone: guest.phone,
        customerEmail: guest.email,
        guestsCount: [2, 2, 3, 4, 5, 6][i % 6],
        reservationDate,
        startTime: `${String(startHour).padStart(2, "0")}:00`,
        endTime: `${String(startHour + 2).padStart(2, "0")}:00`,
        occasion: occasions[i % occasions.length],
        comment: i % 4 === 0 ? "Просит стол у окна" : null,
        internalComment: i % 7 === 0 ? "Важный гость, подтвердить заранее" : null,
        status,
        source: sources[i % sources.length],
        confirmedAt: ["confirmed", "seated", "completed"].includes(status) ? day(-13 + (i % 14)) : null,
        cancelledAt: status === "cancelled" ? day(-13 + (i % 14)) : null,
        completedAt: status === "completed" ? day(-13 + (i % 14)) : null,
      },
    });
  }

  for (const guest of guests) await updateGuestStats(guest.id);

  await prisma.restaurantPageEvent.createMany({
    data: [
      ...Array.from({ length: 180 }, (_, index) => ({ restaurantId: restaurant.id, type: "view", source: sources[index % sources.length], createdAt: day(-(index % 30)) })),
      ...Array.from({ length: 54 }, (_, index) => ({ restaurantId: restaurant.id, type: "booking_click", source: sources[index % sources.length], createdAt: day(-(index % 30)) })),
    ],
  });

  await prisma.recommendation.createMany({
    data: [
      { restaurantId: restaurant.id, type: "low_occupancy_day", title: "Усилить вторник", description: "По вторникам загрузка ниже среднего. Попробуйте специальный сет или акцию для компаний 2-4 человека.", priority: 3 },
      { restaurantId: restaurant.id, type: "popular_time_slot", title: "Пик спроса 19:00-21:00", description: "В этот период стоит заранее распределять столы и быстро подтверждать новые заявки.", priority: 2 },
      { restaurantId: restaurant.id, type: "high_no_show", title: "Снизить no-show", description: "Есть несколько неявок. Включите напоминания и звонок подтверждения за 2 часа до визита.", priority: 3 },
    ],
  });

  await prisma.notification.create({ data: { userId: ownerId, restaurantId: restaurant.id, type: "demo_ready", title: "Демо-ресторан готов", message: "В Лето добавлены гости, брони, аналитика и рекомендации для показа продукта." } });
}

async function createNoShowDepositDemo(ownerId: string, customerId: string) {
  const restaurant = await prisma.restaurant.create({
    data: {
      ownerId,
      title: "Red Stone Demo",
      slug: "red-stone-demo",
      description: "Демо-ресторан для показа защиты от no-show: маленькие столы можно бронировать без депозита, большие столы и пиковые часы требуют депозит по внешней платежной ссылке ресторана. Данные демонстрационные.",
      shortDescription: "Демо no-show: маленькие столы без депозита, большие столы с депозитом.",
      city: "Курск",
      address: "ул. Радищева, 24",
      phone: "+7 4712 55-44-33",
      email: "redstone-demo@restaurant.local",
      website: "https://kaifbook.local/r/red-stone-demo/book",
      averageCheck: 2300,
      cuisineTypes: JSON.stringify(["европейская", "стейки", "бар"]),
      features: JSON.stringify(["большие компании", "депозит", "живая музыка", "банкеты"]),
      mainPhotoUrl: "/images/stock/restaurants/dining-02.jpg",
      galleryPhotos: JSON.stringify([
        "/images/stock/restaurants/dining-01.jpg",
        "/images/stock/restaurants/bar-01.jpg",
      ]),
      paymentMode: "external_deposit",
      externalDepositAmount: 2000,
      externalPaymentUrl: "https://example.com/kaifbook-demo-payment",
      paymentTermsText: "Для подтверждения брони нужно внести депозит. Оплата проходит напрямую ресторану. Депозит будет зачтен в счет заказа. Чек и возврат оформляет ресторан.",
      isPaymentEnabled: true,
      showDepositInfo: true,
      status: "approved",
      isActive: true,
    },
  });

  await prisma.reservationSettings.create({ data: { restaurantId: restaurant.id, minGuests: 1, maxGuests: 12, reservationDurationMinutes: 120, bookingIntervalMinutes: 30, allowTableSelection: true, allowSeatSelection: true, reserveWholeTableWhenSeatsSelected: true, minSeatsSelection: 1, autoConfirmEnabled: false } });
  await prisma.reservationDepositSettings.create({
    data: {
      restaurantId: restaurant.id,
      depositEnabled: true,
      depositMode: "custom_rules",
      defaultDepositAmount: 2000,
      requireDepositForLargeTables: true,
      requireDepositForGuestsFrom: 6,
      requireDepositForPeakHours: true,
      requireDepositForHighRiskGuests: true,
      paymentTimeoutMinutes: 20,
      depositAccountingText: "Депозит будет учтен в счете гостя.",
      depositRefundPolicyText: "Условия возврата фиксируются рестораном и показываются гостю до оплаты.",
      legalNoticeText: "Оплата депозита подключается через официальный платежный провайдер. Переводы на карту не используются.",
    },
  });
  await prisma.noShowSettings.create({ data: { restaurantId: restaurant.id, reminderEnabled: true, reminderHoursBefore: 24, secondReminderEnabled: true, secondReminderMinutesBefore: 120, requireGuestConfirmation: true, confirmationDeadlineMinutesBefore: 120, autoMarkAtRiskEnabled: true } });
  for (const h of weeklyHours("12:00", "23:59")) await prisma.restaurantWorkingHour.create({ data: { ...h, restaurantId: restaurant.id } });

  const smallType = await prisma.tableType.create({ data: { restaurantId: restaurant.id, title: "Маленький стол", code: "small", description: "До 3 гостей, без обязательного депозита.", minGuests: 1, maxGuests: 3, defaultDepositAmount: 0, defaultBookingPrice: 0, isDepositRequired: false } });
  const largeType = await prisma.tableType.create({ data: { restaurantId: restaurant.id, title: "Большой стол", code: "large", description: "Для компаний 4-8 гостей. Ресторан просит депозит, чтобы не держать большой стол пустым.", minGuests: 4, maxGuests: 8, defaultDepositAmount: 2000, defaultBookingPrice: 0, isDepositRequired: true } });

  const hall = await prisma.hall.create({ data: { restaurantId: restaurant.id, title: "Основной зал", width: 980, height: 560, sortOrder: 0, isActive: true } });
  const smallTables = [];
  for (let i = 0; i < 5; i++) {
    smallTables.push(await prisma.restaurantTable.create({
      data: { restaurantId: restaurant.id, hallId: hall.id, tableTypeId: smallType.id, number: `S${i + 1}`, seats: 3, minGuests: 1, maxGuests: 3, shape: i % 2 === 0 ? "circle" : "square", x: 60 + i * 150, y: 70, width: 86, height: 86, rotation: 0, isActive: true },
    }));
  }
  const largeTables = [];
  for (let i = 0; i < 3; i++) {
    largeTables.push(await prisma.restaurantTable.create({
      data: { restaurantId: restaurant.id, hallId: hall.id, tableTypeId: largeType.id, number: `L${i + 1}`, seats: 8, minGuests: 4, maxGuests: 8, bookingPrice: 0, depositAmount: i === 2 ? 3000 : 2000, depositRequired: true, shape: "rectangle", x: 90 + i * 275, y: 280, width: 180, height: 92, rotation: 0, isActive: true },
    }));
  }

  await prisma.bookingPricingRule.createMany({
    data: [
      { restaurantId: restaurant.id, title: "Большой стол", tableTypeId: largeType.id, minGuests: 4, maxGuests: 8, depositAmount: 2000, bookingPrice: 0, isDepositRequired: true, priority: 10 },
      { restaurantId: restaurant.id, title: "Пятница и суббота вечером", tableTypeId: largeType.id, dayOfWeek: 5, startTime: "18:00", endTime: "23:59", depositAmount: 3000, bookingPrice: 0, isDepositRequired: true, priority: 30 },
      { restaurantId: restaurant.id, title: "VIP большой стол L3", tableId: largeTables[2].id, depositAmount: 3000, bookingPrice: 0, isDepositRequired: true, priority: 40 },
      { restaurantId: restaurant.id, title: "Маленькие столы без депозита", tableTypeId: smallType.id, minGuests: 1, maxGuests: 3, depositAmount: 0, bookingPrice: 0, isDepositRequired: false, priority: 5 },
    ],
  });

  const categories = [
    { title: "Стейки", items: [{ title: "Стейк Red Stone", description: "Демо-позиция для показа меню.", price: 1450 }, { title: "Медальоны с соусом", description: "Горячее блюдо для ужина.", price: 1120 }] },
    { title: "Для компаний", items: [{ title: "Сет на 6 гостей", description: "Закуски к большому столу.", price: 3200 }, { title: "Гриль ассорти", description: "Мясо и овощи.", price: 2800 }] },
    { title: "Бар", items: [{ title: "Домашний лимонад", description: "Безалкогольный напиток.", price: 320 }, { title: "Коктейль Red Stone", description: "Демо-позиция барной карты.", price: 520 }] },
  ];
  for (const [sortOrder, category] of categories.entries()) {
    const created = await prisma.menuCategory.create({ data: { restaurantId: restaurant.id, title: category.title, sortOrder, isActive: true } });
    for (const [itemIndex, item] of category.items.entries()) await prisma.menuItem.create({ data: { restaurantId: restaurant.id, categoryId: created.id, sortOrder: itemIndex, isAvailable: true, weight: "1 порция", ...item } });
  }

  const guestInputs = [
    ["Марина Орлова", "+79207001001", ["VIP"]],
    ["Денис Котов", "+79207001002", ["постоянный"]],
    ["Екатерина Белова", "+79207001003", ["с детьми"]],
    ["Андрей Соловьев", "+79207001004", ["no-show risk"]],
    ["Виктор Лебедев", "+79207001005", ["банкет"]],
    ["Ольга Романова", "+79207001006", ["любит окно"]],
    ["Сергей Антонов", "+79207001007", ["проблемный"]],
  ] as const;
  const guests = [];
  for (const [name, phone, tags] of guestInputs) {
    const tagList = [...tags] as string[];
    guests.push(await prisma.guest.create({ data: { restaurantId: restaurant.id, name, phone, email: `${phone.replace(/\D/g, "")}@demo.local`, tags: JSON.stringify(tagList), riskLevel: tagList.includes("no-show risk") || tagList.includes("проблемный") ? "high" : "low" } }));
  }

  const reservationSeeds = [
    { guest: 0, table: smallTables[0], guestsCount: 2, status: "confirmed_by_guest", date: 1, start: "18:00", deposit: false, paid: false, confirmed: true },
    { guest: 1, table: smallTables[1], guestsCount: 3, status: "awaiting_restaurant_confirmation", date: 2, start: "19:00", deposit: false, paid: false },
    { guest: 2, table: largeTables[0], guestsCount: 6, status: "awaiting_deposit_payment", date: 3, start: "20:00", deposit: true, paid: false },
    { guest: 3, table: largeTables[1], guestsCount: 8, status: "deposit_paid", date: 4, start: "19:30", deposit: true, paid: true },
    { guest: 4, table: largeTables[2], guestsCount: 7, status: "confirmed", date: 5, start: "21:00", deposit: true, paid: true, confirmed: true },
    { guest: 5, table: smallTables[2], guestsCount: 2, status: "completed", date: -2, start: "18:30", deposit: false, paid: false, confirmed: true },
    { guest: 6, table: largeTables[0], guestsCount: 6, status: "no_show", date: -3, start: "20:00", deposit: false, paid: false },
    { guest: 3, table: largeTables[1], guestsCount: 8, status: "payment_expired", date: -1, start: "19:00", deposit: true, paid: false, expired: true },
    { guest: 1, table: smallTables[3], guestsCount: 2, status: "cancelled_by_guest", date: -4, start: "17:00", deposit: false, paid: false },
  ];
  for (const [index, seed] of reservationSeeds.entries()) {
    const guest = guests[seed.guest];
    const reservation = await prisma.reservation.create({
      data: {
        restaurantId: restaurant.id,
        guestId: guest.id,
        hallId: hall.id,
        tableId: seed.table.id,
        selectedSeatNumbers: JSON.stringify(Array.from({ length: Math.min(seed.guestsCount, seed.table.seats) }, (_, seatIndex) => `${seed.table.id}:seat-${seatIndex + 1}`)),
        userId: index === 0 ? customerId : null,
        customerName: guest.name,
        customerPhone: guest.phone,
        customerEmail: guest.email,
        guestsCount: seed.guestsCount,
        reservationDate: day(seed.date),
        startTime: seed.start,
        endTime: `${String(Number(seed.start.slice(0, 2)) + 2).padStart(2, "0")}${seed.start.slice(2)}`,
        occasion: seed.guestsCount >= 6 ? "банкет" : "обычный визит",
        comment: seed.deposit ? "Клиент видит условия депозита до отправки." : "Бронь без депозита.",
        internalComment: seed.status === "no_show" ? "Гость не пришел и не предупредил." : null,
        status: seed.status,
        source: index % 2 === 0 ? "site" : "telegram",
        confirmationToken: crypto.randomUUID(),
        bookingPrice: 0,
        depositAmount: seed.deposit ? (seed.table.depositAmount ?? 2000) : 0,
        isDepositRequired: seed.deposit,
        paymentRequired: seed.deposit,
        paymentStatus: seed.deposit ? (seed.paid ? "paid_to_restaurant" : seed.expired ? "cancelled" : "awaiting_external_payment") : "not_required",
        paymentAmount: seed.deposit ? (seed.table.depositAmount ?? 2000) : 0,
        paymentUrl: seed.deposit ? "https://example.com/kaifbook-demo-payment" : null,
        paymentMarkedPaidByUserId: seed.paid ? ownerId : null,
        paymentMarkedPaidAt: seed.paid ? day(seed.date - 1) : null,
        pricingExplanation: seed.deposit ? `Для большого стола ресторан просит депозит ${seed.table.depositAmount ?? 2000} ₽. Он будет учтен в счете или обработан по правилам ресторана.` : "Для этого стола депозит не требуется. Просто подтвердите бронь по ссылке.",
        noShowRiskLevel: seed.status === "no_show" || guest.riskLevel === "high" ? "high" : seed.deposit || seed.confirmed ? "low" : "medium",
        noShowRiskScore: seed.status === "no_show" || guest.riskLevel === "high" ? 90 : seed.deposit || seed.confirmed ? 10 : 45,
        guestConfirmedAt: seed.confirmed ? day(seed.date - 1) : null,
        confirmationRequestedAt: day(seed.date - 1),
        confirmedAt: ["confirmed", "confirmed_by_guest", "deposit_paid", "completed"].includes(seed.status) ? day(seed.date - 1) : null,
        cancelledAt: seed.status === "cancelled_by_guest" ? day(seed.date) : null,
        completedAt: seed.status === "completed" ? day(seed.date) : null,
      },
    });
  }

  await prisma.waitlistEntry.createMany({
    data: [
      { restaurantId: restaurant.id, guestName: "Наталья Миронова", guestPhone: "+79207001080", guestsCount: 6, desiredDate: day(3), desiredStartTime: "20:00", desiredEndTime: "22:00", preferredTableTypeId: largeType.id, comment: "Если освободится большой стол", status: "new" },
      { restaurantId: restaurant.id, guestName: "Павел Егоров", guestPhone: "+79207001081", guestsCount: 2, desiredDate: day(1), desiredStartTime: "19:00", desiredEndTime: "21:00", preferredTableTypeId: smallType.id, comment: "Любой стол у окна", status: "new" },
    ],
  });
  for (const guest of guests) await updateGuestStats(guest.id);
  await prisma.restaurantPageEvent.createMany({
    data: [
      ...Array.from({ length: 90 }, (_, index) => ({ restaurantId: restaurant.id, type: "view", source: index % 3 === 0 ? "vk" : "site", createdAt: day(-(index % 14)) })),
      ...Array.from({ length: 28 }, (_, index) => ({ restaurantId: restaurant.id, type: "booking_click", source: index % 2 === 0 ? "site" : "qr", createdAt: day(-(index % 14)) })),
    ],
  });
  await prisma.recommendation.createMany({
    data: [
      { restaurantId: restaurant.id, type: "high_no_show", title: "Включить депозит для больших столов", description: "Большие столы без депозита чаще создают риск пустой посадки. Для типа «Большой стол» уже настроен депозит 2000 ₽.", priority: 3 },
      { restaurantId: restaurant.id, type: "popular_time_slot", title: "Пик спроса 19:00-21:00", description: "В этот период лучше быстрее отправлять ссылку подтверждения и следить за оплатой депозита.", priority: 2 },
      { restaurantId: restaurant.id, type: "repeat_guests_growth", title: "Используйте CRM гостей", description: "Повторные гости и гости с no-show историей подсвечены в карточках броней.", priority: 2 },
    ],
  });
  await prisma.notification.create({ data: { userId: ownerId, restaurantId: restaurant.id, type: "demo_no_show_ready", title: "Red Stone Demo готов", message: "Добавлены типы столов, депозитные правила, внешняя платежная ссылка ресторана и no-show аналитика." } });
}

async function main() {
  const passwordHash = await bcrypt.hash("demo12345", 10);

  await prisma.notification.deleteMany({});
  await prisma.payment.deleteMany({});
  await prisma.reservation.deleteMany({});
  await prisma.waitlistEntry.deleteMany({});
  await prisma.restaurantPageEvent.deleteMany({});
  await prisma.recommendation.deleteMany({});
  await prisma.guest.deleteMany({});
  await prisma.bookingPricingRule.deleteMany({});
  await prisma.reservationSettings.deleteMany({});
  await prisma.reservationDepositSettings.deleteMany({});
  await prisma.noShowSettings.deleteMany({});
  await prisma.restaurantLead.deleteMany({});
  await prisma.restaurantTable.deleteMany({});
  await prisma.tableType.deleteMany({});
  await prisma.hall.deleteMany({});
  await prisma.menuItem.deleteMany({});
  await prisma.menuCategory.deleteMany({});
  await prisma.restaurantReview.deleteMany({});
  await prisma.restaurantWorkingHour.deleteMany({});
  await prisma.restaurant.deleteMany({});
  await prisma.user.deleteMany({ where: { email: { endsWith: "@customers.kaifbook.local" } } });

  await prisma.user.upsert({
    where: { email: "admin@kaifbook.ru" },
    update: { fullName: "Администратор", phone: "+74712000001", passwordHash, role: "admin", isActive: true },
    create: { email: "admin@kaifbook.ru", fullName: "Администратор", phone: "+74712000001", passwordHash, role: "admin", isActive: true },
  });

  const owner = await prisma.user.upsert({
    where: { email: "owner@kaifbook.ru" },
    update: { fullName: "Демо Владелец", phone: "+74712000002", passwordHash, role: "restaurant_owner", isActive: true },
    create: { email: "owner@kaifbook.ru", fullName: "Демо Владелец", phone: "+74712000002", passwordHash, role: "restaurant_owner", isActive: true },
  });

  const demoOwner = await prisma.user.upsert({
    where: { email: "demo@restaurant.local" },
    update: { fullName: "Демо Ресторан", phone: "+74712000999", passwordHash, role: "restaurant_owner", isActive: true },
    create: { email: "demo@restaurant.local", fullName: "Демо Ресторан", phone: "+74712000999", passwordHash, role: "restaurant_owner", isActive: true },
  });

  const customer = await prisma.user.upsert({
    where: { email: "customer@kaifbook.ru" },
    update: { fullName: "Демо Клиент", phone: "+74712000003", passwordHash, role: "customer", isActive: true },
    create: { email: "customer@kaifbook.ru", fullName: "Демо Клиент", phone: "+74712000003", passwordHash, role: "customer", isActive: true },
  });

  for (const [index, demo] of restaurants.entries()) {
    const restaurant = await prisma.restaurant.create({
      data: {
        ownerId: owner.id,
        title: demo.title,
        slug: demo.slug,
        description: `${demo.description}\n\nСредний чек указан как демо-оценка для MVP. Источник карточки: ${demo.sourceUrl}`,
        shortDescription: demo.shortDescription,
        city: "Курск",
        address: demo.address,
        phone: demo.phone,
        email: demo.email,
        website: demo.sourceUrl,
        averageCheck: demo.averageCheck,
        cuisineTypes: JSON.stringify(demo.cuisineTypes),
        features: JSON.stringify(demo.features),
        mainPhotoUrl: demo.mainPhotoUrl,
        galleryPhotos: JSON.stringify(demo.galleryPhotos),
        status: "approved",
        isActive: true,
      },
    });

    await prisma.reservationSettings.create({ data: { restaurantId: restaurant.id, minGuests: 1, maxGuests: 14, reservationDurationMinutes: 120, bookingIntervalMinutes: 30, allowTableSelection: true, allowSeatSelection: true, reserveWholeTableWhenSeatsSelected: true, minSeatsSelection: 1 } });

    for (const h of demo.hours) await prisma.restaurantWorkingHour.create({ data: { ...h, restaurantId: restaurant.id } });

    for (const [sortOrder, category] of demo.menu.entries()) {
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

    const hall = await prisma.hall.create({
      data: { restaurantId: restaurant.id, title: "Основной зал", width: 900, height: 520, sortOrder: 0, isActive: true },
    });

    const createdTables: Array<{ id: string }> = [];
    for (const t of tableData(8 + (index % 3))) {
      createdTables.push(await prisma.restaurantTable.create({ data: { ...t, hallId: hall.id, restaurantId: restaurant.id } }));
    }

    const annaGuest = await prisma.guest.create({
      data: { restaurantId: restaurant.id, name: "Анна Смирнова", phone: "+79205551234", email: "anna@example.com", reservationsCount: 1, tags: JSON.stringify(["любит окно"]) },
    });
    const igorGuest = await prisma.guest.create({
      data: { restaurantId: restaurant.id, name: "Игорь Петров", phone: "+79101112233", reservationsCount: 1, tags: JSON.stringify(["день рождения"]) },
    });

    await prisma.reservation.create({
      data: {
        restaurantId: restaurant.id,
        guestId: annaGuest.id,
        hallId: hall.id,
        tableId: createdTables[0].id,
        selectedSeatNumbers: JSON.stringify([`${createdTables[0].id}:seat-1`, `${createdTables[0].id}:seat-2`]),
        userId: customer.id,
        customerName: "Анна Смирнова",
        customerPhone: "+7 920 555-12-34",
        customerEmail: "anna@example.com",
        guestsCount: 2,
        reservationDate: day(2 + index),
        startTime: "19:00",
        endTime: "21:00",
        comment: "Стол у окна",
        status: index % 2 === 0 ? "new" : "confirmed",
        source: "demo",
      },
    });

    await prisma.reservation.create({
      data: {
        restaurantId: restaurant.id,
        guestId: igorGuest.id,
        hallId: hall.id,
        customerName: "Игорь Петров",
        customerPhone: "+7 910 111-22-33",
        guestsCount: 4,
        reservationDate: day(4 + index),
        startTime: "18:30",
        endTime: "20:30",
        comment: "День рождения",
        status: "new",
        source: "demo",
      },
    });

    await prisma.restaurantPageEvent.createMany({
      data: [
        ...Array.from({ length: 12 + index }, (_, eventIndex) => ({ restaurantId: restaurant.id, type: "view", source: eventIndex % 3 === 0 ? "vk" : "site", createdAt: day(-eventIndex % 20) })),
        ...Array.from({ length: 3 + (index % 4) }, (_, eventIndex) => ({ restaurantId: restaurant.id, type: "booking_click", source: "site", createdAt: day(-eventIndex % 12) })),
      ],
    });
  }

  await createRestaurantSaasDemo(demoOwner.id, customer.id);
  await createNoShowDepositDemo(demoOwner.id, customer.id);

  console.log("Seed completed: demo@restaurant.local / demo12345, owner@kaifbook.ru / demo12345, admin@kaifbook.ru / demo12345");
}

main()
  .then(async () => prisma.$disconnect())
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
