import { PrismaClient } from "@prisma/client";
import { randomBytes } from "node:crypto";
import { writeFileSync } from "node:fs";
import https from "node:https";
import http from "node:http";
import { resolve } from "node:path";

function createId() {
  return "c" + randomBytes(12).toString("hex");
}

const prisma = new PrismaClient();

const img = (name) => `/images/stock/menu/${name}.jpg`;

// ── New stock images to download ──────────────────────────────────────
const newImages = {
  tea:       "https://images.unsplash.com/photo-1556679343-c7306c1976bc?w=600&h=400&fit=crop&q=80",
  chicken:   "https://images.unsplash.com/photo-1598103442097-8b74394b95c6?w=600&h=400&fit=crop&q=80",
  beer:      "https://images.unsplash.com/photo-1535958636474-b021ee887b13?w=600&h=400&fit=crop&q=80",
  burger:    "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=600&h=400&fit=crop&q=80",
  pancakes:  "https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445?w=600&h=400&fit=crop&q=80",
  risotto:   "https://images.unsplash.com/photo-1476124369491-e7addf5db371?w=600&h=400&fit=crop&q=80",
  icecream:  "https://images.unsplash.com/photo-1497034825429-c343d7c6a68f?w=600&h=400&fit=crop&q=80",
  cake:      "https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=600&h=400&fit=crop&q=80",
  cheese:    "https://images.unsplash.com/photo-1452195100486-9cc805987862?w=600&h=400&fit=crop&q=80",
  wok:       "https://images.unsplash.com/photo-1512058564366-18510be2db19?w=600&h=400&fit=crop&q=80",
  shashlik:  "https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=600&h=400&fit=crop&q=80",
  ramen:     "https://images.unsplash.com/photo-1569718212165-3a8278d5f624?w=600&h=400&fit=crop&q=80",
  bread:     "https://images.unsplash.com/photo-1509440159596-0249088772ff?w=600&h=400&fit=crop&q=80",
  omelette:  "https://images.unsplash.com/photo-1525351484163-7529414344d8?w=600&h=400&fit=crop&q=80",
  croissant: "https://images.unsplash.com/photo-1555507036-ab1f4038024a?w=600&h=400&fit=crop&q=80",
};

function downloadImage(url, destPath) {
  return new Promise((resolve, reject) => {
    const protocol = url.startsWith("https") ? https : http;
    const request = (u) => {
      protocol.get(u, { headers: { "User-Agent": "Mozilla/5.0" } }, (res) => {
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          const loc = res.headers.location;
          const proto = loc.startsWith("https") ? https : http;
          proto.get(loc, { headers: { "User-Agent": "Mozilla/5.0" } }, (res2) => {
            const chunks = [];
            res2.on("data", (c) => chunks.push(c));
            res2.on("end", () => {
              const buf = Buffer.concat(chunks);
              if (buf.length > 5000) { writeFileSync(destPath, buf); resolve(true); }
              else resolve(false);
            });
            res2.on("error", () => resolve(false));
          }).on("error", () => resolve(false));
          return;
        }
        if (res.statusCode !== 200) { resolve(false); return; }
        const chunks = [];
        res.on("data", (c) => chunks.push(c));
        res.on("end", () => {
          const buf = Buffer.concat(chunks);
          if (buf.length > 5000) { writeFileSync(destPath, buf); resolve(true); }
          else resolve(false);
        });
        res.on("error", () => resolve(false));
      }).on("error", () => resolve(false));
    };
    request(url);
  });
}

async function downloadAllImages() {
  const dir = resolve("public/images/stock/menu");
  const results = {};
  for (const [name, url] of Object.entries(newImages)) {
    const dest = `${dir}/${name}.jpg`;
    try {
      const ok = await downloadImage(url, dest);
      results[name] = ok;
      console.log(`  ${ok ? "OK" : "SKIP"}: ${name}.jpg`);
    } catch {
      results[name] = false;
      console.log(`  FAIL: ${name}.jpg`);
    }
  }
  return results;
}

// Fallback for images that failed to download
const fallbacks = {
  tea: "coffee", chicken: "steak", beer: "cocktail", burger: "bbq",
  pancakes: "breakfast", risotto: "pasta", icecream: "dessert", cake: "dessert",
  cheese: "bruschetta", wok: "pasta", shashlik: "bbq", ramen: "soup",
  bread: "bruschetta", omelette: "breakfast", croissant: "breakfast",
};

function safeImg(name, downloadedImages) {
  if (downloadedImages[name]) return img(name);
  return img(fallbacks[name] || name);
}

// ── Photo fix map for existing dishes ──────────────────────────────────
// title → correct photo
const photoFixes = [
  { title: "Хачапури", correctPhoto: img("bread") },    // was pizza
  { title: "Чай", correctPhoto: img("tea") },             // was coffee
  { title: "Чай с травами", correctPhoto: img("tea") },   // was coffee
];

// ── New dishes per restaurant slug ──────────────────────────────────────
function getNewDishes(slug, categories, dl) {
  // categories is a map: title -> id
  const cat = (title) => {
    // find best match
    const exact = categories[title];
    if (exact) return exact;
    for (const [key, id] of Object.entries(categories)) {
      if (key.toLowerCase().includes(title.toLowerCase())) return id;
      if (title.toLowerCase().includes(key.toLowerCase())) return id;
    }
    // return first category as fallback
    return Object.values(categories)[0];
  };

  const dishes = {
    // ── COFFEE SHOPS ──
    "sei-kursk": [
      { title: "Круассан с маслом", desc: "Свежий круассан с маслом и клубничным джемом.", price: 280, weight: "1 шт.", photo: safeImg("croissant", dl), categoryId: cat("Завтраки") },
      { title: "Гранола с йогуртом", desc: "Домашняя гранола, греческий йогурт и сезонные ягоды.", price: 380, weight: "280 г", photo: safeImg("omelette", dl), categoryId: cat("Завтраки") },
      { title: "Ризотто с грибами", desc: "Кремовое ризотто с белыми грибами и пармезаном.", price: 620, weight: "300 г", photo: safeImg("risotto", dl), categoryId: cat("Горячее") },
      { title: "Матча-латте", desc: "Японский зеленый чай матча с молоком.", price: 290, weight: "300 мл", photo: safeImg("tea", dl), categoryId: cat("Кофе и напитки") },
      { title: "Тирамису", desc: "Классический итальянский десерт с маскарпоне и кофе.", price: 420, weight: "150 г", photo: safeImg("cake", dl), categoryId: cat("Десерты") },
    ],
    "bloom-coffee-kursk": [
      { title: "Круассан с лососем", desc: "Хрустящий круассан, сливочный сыр и слабосолёный лосось.", price: 420, weight: "1 шт.", photo: safeImg("croissant", dl), categoryId: cat("Завтраки") },
      { title: "Блинчики с ягодами", desc: "Тонкие блинчики с творожной начинкой и ягодным соусом.", price: 360, weight: "3 шт.", photo: safeImg("pancakes", dl), categoryId: cat("Завтраки") },
      { title: "Куриный сэндвич", desc: "Сэндвич с куриным филе, песто и свежими овощами.", price: 380, weight: "1 шт.", photo: safeImg("burger", dl), categoryId: cat("Закуски и салаты") },
      { title: "Раф кофе", desc: "Сливочный раф с нотами ванили.", price: 280, weight: "300 мл", photo: img("coffee"), categoryId: cat("Кофе и напитки") },
      { title: "Медовик", desc: "Домашний медовый торт со сметанным кремом.", price: 350, weight: "150 г", photo: safeImg("cake", dl), categoryId: cat("Десерты") },
    ],
    "donut-bar-kursk": [
      { title: "Яйца Бенедикт", desc: "Пашот на тосте с голландским соусом и ветчиной.", price: 440, weight: "1 порция", photo: safeImg("omelette", dl), categoryId: cat("Завтраки") },
      { title: "Овсяная каша", desc: "Каша с бананом, орехами и мёдом.", price: 290, weight: "300 г", photo: img("breakfast"), categoryId: cat("Завтраки") },
      { title: "Цезарь с курицей", desc: "Классический салат с куриным филе, сухариками и пармезаном.", price: 490, weight: "260 г", photo: img("salad"), categoryId: cat("Закуски и салаты") },
      { title: "Какао", desc: "Горячий шоколадный напиток с маршмеллоу.", price: 240, weight: "300 мл", photo: img("coffee"), categoryId: cat("Кофе и напитки") },
      { title: "Макарон ассорти", desc: "Набор из 5 французских макаронов.", price: 380, weight: "5 шт.", photo: img("dessert"), categoryId: cat("Десерты") },
    ],
    "kanelo-kursk": [
      { title: "Сырная тарелка", desc: "Бри, дор-блю, чеддер, мёд и орехи.", price: 580, weight: "200 г", photo: safeImg("cheese", dl), categoryId: cat("Закуски и салаты") },
      { title: "Блинчики со сметаной", desc: "Тонкие блинчики с домашней сметаной.", price: 320, weight: "3 шт.", photo: safeImg("pancakes", dl), categoryId: cat("Завтраки") },
      { title: "Крем-суп из тыквы", desc: "Бархатный суп из печёной тыквы с семечками.", price: 380, weight: "300 мл", photo: img("soup"), categoryId: cat("Горячее") },
      { title: "Флэт уайт", desc: "Двойной эспрессо с бархатным молоком.", price: 260, weight: "250 мл", photo: img("coffee"), categoryId: cat("Кофе и напитки") },
      { title: "Штрудель яблочный", desc: "Тёплый штрудель с яблоками, корицей и ванильным соусом.", price: 360, weight: "160 г", photo: img("dessert"), categoryId: cat("Десерты") },
    ],
    "kometa-kursk": [
      { title: "Французский тост", desc: "Тост с карамелизированным бананом и кленовым сиропом.", price: 380, weight: "1 порция", photo: img("breakfast"), categoryId: cat("Завтраки") },
      { title: "Хумус с питой", desc: "Нежный хумус с тёплой питой и оливковым маслом.", price: 340, weight: "200 г", photo: safeImg("bread", dl), categoryId: cat("Закуски и салаты") },
      { title: "Куриный суп", desc: "Лёгкий куриный бульон с лапшой и зеленью.", price: 350, weight: "300 мл", photo: img("soup"), categoryId: cat("Горячее") },
      { title: "Чай с чабрецом", desc: "Травяной чай с горным чабрецом и мёдом.", price: 200, weight: "400 мл", photo: safeImg("tea", dl), categoryId: cat("Кофе и напитки") },
      { title: "Брауни с орехами", desc: "Шоколадный брауни с грецким орехом и мороженым.", price: 380, weight: "150 г", photo: safeImg("cake", dl), categoryId: cat("Десерты") },
    ],

    // ── GEORGIAN ──
    "gogiya-kursk": [
      { title: "Аджапсандал", desc: "Рагу из баклажанов, перца, томатов и зелени.", price: 420, weight: "280 г", photo: img("salad"), categoryId: cat("Закуски") },
      { title: "Чахохбили", desc: "Курица тушёная в томатном соусе с кинзой.", price: 560, weight: "320 г", photo: safeImg("chicken", dl), categoryId: cat("Мясо и горячее") },
      { title: "Лобио", desc: "Классическое грузинское блюдо из красной фасоли со специями.", price: 380, weight: "300 г", photo: img("soup"), categoryId: cat("Закуски") },
      { title: "Хачапури по-аджарски", desc: "Лодочка с сыром, маслом и яйцом.", price: 480, weight: "350 г", photo: safeImg("bread", dl), categoryId: cat("Хинкали и хачапури") },
      { title: "Чурчхела", desc: "Традиционная грузинская сладость с орехами.", price: 250, weight: "2 шт.", photo: img("dessert"), categoryId: cat("Десерты") },
    ],
    "tbiladzhio-kursk": [
      { title: "Сациви", desc: "Курица в ореховом соусе — классика грузинской кухни.", price: 520, weight: "300 г", photo: safeImg("chicken", dl), categoryId: cat("Мясо и горячее") },
      { title: "Лобио в горшочке", desc: "Красная фасоль со специями, подаётся в глиняном горшочке.", price: 390, weight: "300 г", photo: img("soup"), categoryId: cat("Закуски") },
      { title: "Хачапури по-мегрельски", desc: "Хачапури с двойным слоем сулугуни.", price: 490, weight: "350 г", photo: safeImg("bread", dl), categoryId: cat("Хинкали и хачапури") },
      { title: "Люля-кебаб", desc: "Бараний люля-кебаб на мангале с луком и зеленью.", price: 580, weight: "250 г", photo: safeImg("shashlik", dl), categoryId: cat("Мясо и горячее") },
      { title: "Пахлава", desc: "Слоёный медовый десерт с орехами.", price: 320, weight: "2 шт.", photo: img("dessert"), categoryId: cat("Десерты") },
    ],

    // ── BARS ──
    "butylochnaya-kursk": [
      { title: "Куриные крылышки BBQ", desc: "Крылышки в фирменном соусе барбекю.", price: 490, weight: "350 г", photo: safeImg("chicken", dl), categoryId: cat("BBQ и горячее") },
      { title: "Бургер с говядиной", desc: "Сочная котлета, чеддер, бекон и фирменный соус.", price: 590, weight: "1 шт.", photo: safeImg("burger", dl), categoryId: cat("Основное") },
      { title: "Нагетсы с соусом", desc: "Хрустящие куриные наггетсы с соусом на выбор.", price: 380, weight: "8 шт.", photo: safeImg("chicken", dl), categoryId: cat("Закуски к напиткам") },
      { title: "Крафтовое пиво", desc: "Бокал крафтового пива местной пивоварни.", price: 320, weight: "0.5 л", photo: safeImg("beer", dl), categoryId: cat("Барная карта") },
      { title: "Мороженое с топпингом", desc: "Ванильное мороженое с карамелью и орехами.", price: 290, weight: "150 г", photo: safeImg("icecream", dl), categoryId: cat("Десерты") },
    ],
    "culture-kursk": [
      { title: "Тартар из говядины", desc: "Рубленая говядина с каперсами, желтком и гренками.", price: 680, weight: "180 г", photo: img("steak"), categoryId: cat("Закуски к напиткам") },
      { title: "Утиная грудка", desc: "Утиная грудка с вишнёвым соусом и пюре из батата.", price: 780, weight: "280 г", photo: img("steak"), categoryId: cat("Основное") },
      { title: "Сырная тарелка к вину", desc: "Подборка сыров с мёдом и грецким орехом.", price: 720, weight: "200 г", photo: safeImg("cheese", dl), categoryId: cat("Закуски к напиткам") },
      { title: "Негрони", desc: "Классический итальянский коктейль с джином и кампари.", price: 480, weight: "180 мл", photo: img("cocktail"), categoryId: cat("Барная карта") },
      { title: "Крем-брюле", desc: "Классический французский десерт с карамельной корочкой.", price: 390, weight: "150 г", photo: img("dessert"), categoryId: cat("Десерты") },
    ],
    "redstone-kursk": [
      { title: "Острые крылышки", desc: "Крылышки в остром соусе чили с сельдереем.", price: 460, weight: "350 г", photo: safeImg("chicken", dl), categoryId: cat("BBQ и горячее") },
      { title: "Бургер Джаз", desc: "Двойной бургер с грибами, беконом и трюфельным маслом.", price: 640, weight: "1 шт.", photo: safeImg("burger", dl), categoryId: cat("Основное") },
      { title: "Начос с гуакамоле", desc: "Кукурузные чипсы с гуакамоле и сальсой.", price: 420, weight: "250 г", photo: img("salad"), categoryId: cat("Закуски к напиткам") },
      { title: "Виски сауэр", desc: "Классический коктейль на основе бурбона с лимоном.", price: 520, weight: "200 мл", photo: img("cocktail"), categoryId: cat("Барная карта") },
      { title: "Шоколадный фондан", desc: "Горячий кекс с жидким шоколадным центром.", price: 380, weight: "1 шт.", photo: safeImg("cake", dl), categoryId: cat("Десерты") },
    ],
    "caramel-kursk": [
      { title: "Карпаччо из говядины", desc: "Тонко нарезанная маринованная говядина с рукколой и пармезаном.", price: 580, weight: "160 г", photo: img("steak"), categoryId: cat("Закуски к напиткам") },
      { title: "Том Ям с креветками", desc: "Тайский кисло-острый суп с креветками и грибами.", price: 520, weight: "350 мл", photo: img("soup"), categoryId: cat("Основное") },
      { title: "Ребрышки BBQ", desc: "Свиные рёбрышки в соусе BBQ, томлённые 6 часов.", price: 890, weight: "400 г", photo: img("bbq"), categoryId: cat("BBQ и горячее") },
      { title: "Апероль Шприц", desc: "Лёгкий итальянский коктейль с просекко.", price: 440, weight: "250 мл", photo: img("cocktail"), categoryId: cat("Барная карта") },
      { title: "Чизкейк Нью-Йорк", desc: "Классический чизкейк с ягодным компотом.", price: 380, weight: "150 г", photo: safeImg("cake", dl), categoryId: cat("Десерты") },
    ],
    "pivzavod-kursk": [
      { title: "Луковые кольца", desc: "Хрустящие кольца в пивном кляре с чесночным соусом.", price: 340, weight: "200 г", photo: img("bbq"), categoryId: cat("Закуски к напиткам") },
      { title: "Бургер Пивзавод", desc: "Говяжий бургер с жареным луком и сырным соусом.", price: 540, weight: "1 шт.", photo: safeImg("burger", dl), categoryId: cat("Основное") },
      { title: "Колбаски гриль", desc: "Баварские колбаски с горчицей и квашеной капустой.", price: 580, weight: "300 г", photo: safeImg("shashlik", dl), categoryId: cat("BBQ и горячее") },
      { title: "Крафт IPA", desc: "Охмелённый эль местного крафтового производства.", price: 350, weight: "0.5 л", photo: safeImg("beer", dl), categoryId: cat("Барная карта") },
      { title: "Яблочный пирог", desc: "Тёплый яблочный пирог с корицей и мороженым.", price: 340, weight: "180 г", photo: safeImg("cake", dl), categoryId: cat("Десерты") },
    ],
    "red-stone-demo": [
      { title: "Тартар из лосося", desc: "Рубленый лосось с авокадо, каперсами и тостами.", price: 620, weight: "180 г", photo: img("seafood"), categoryId: cat("Закуски к напиткам") },
      { title: "Рибай стейк", desc: "Стейк Рибай прожарки Medium Rare с розмарином.", price: 1490, weight: "300 г", photo: img("steak"), categoryId: cat("BBQ и горячее") },
      { title: "Бургер Ред Стоун", desc: "Фирменный бургер с двойной котлетой и беконом.", price: 620, weight: "1 шт.", photo: safeImg("burger", dl), categoryId: cat("Основное") },
      { title: "Пиво крафтовое", desc: "Сезонное крафтовое пиво на кранах.", price: 380, weight: "0.5 л", photo: safeImg("beer", dl), categoryId: cat("Барная карта") },
      { title: "Тирамису", desc: "Итальянский десерт с маскарпоне и эспрессо.", price: 420, weight: "150 г", photo: safeImg("cake", dl), categoryId: cat("Десерты") },
    ],

    // ── ITALIAN / EUROPEAN FINE DINING ──
    "alt-kursk": [
      { title: "Ризотто с белыми грибами", desc: "Кремовое ризотто с пармезаном и трюфельным маслом.", price: 680, weight: "300 г", photo: safeImg("risotto", dl), categoryId: cat("Паста и пицца") },
      { title: "Карпаччо из говядины", desc: "Тонкие ломтики мраморной говядины с рукколой.", price: 590, weight: "160 г", photo: img("steak"), categoryId: cat("Антипасти") },
      { title: "Равиоли с рикоттой", desc: "Домашние равиоли с шпинатом и рикоттой в сливочном соусе.", price: 620, weight: "280 г", photo: img("pasta"), categoryId: cat("Паста и пицца") },
      { title: "Панна котта", desc: "Нежный итальянский десерт с ванилью и малиновым соусом.", price: 380, weight: "150 г", photo: img("dessert"), categoryId: cat("Десерты") },
      { title: "Апероль Шприц", desc: "Итальянский аперитив с просекко и содовой.", price: 420, weight: "250 мл", photo: img("cocktail"), categoryId: cat("Напитки") },
    ],
    "mezonin-kursk": [
      { title: "Ризотто с морепродуктами", desc: "Ризотто с креветками, мидиями и кальмарами.", price: 780, weight: "320 г", photo: safeImg("risotto", dl), categoryId: cat("Паста и пицца") },
      { title: "Стейк Филе-миньон", desc: "Нежнейший стейк из вырезки с овощами гриль.", price: 1590, weight: "250 г", photo: img("steak"), categoryId: cat("Горячее") },
      { title: "Фокачча с розмарином", desc: "Итальянский хлеб с оливковым маслом и розмарином.", price: 320, weight: "200 г", photo: safeImg("bread", dl), categoryId: cat("Антипасти") },
      { title: "Панна котта с манго", desc: "Сливочная панна котта с соусом из манго.", price: 420, weight: "150 г", photo: img("dessert"), categoryId: cat("Десерты") },
      { title: "Просекко", desc: "Бокал итальянского игристого вина.", price: 450, weight: "150 мл", photo: img("wine"), categoryId: cat("Напитки") },
    ],

    // ── SEAFOOD ──
    "ispansky-kursk": [
      { title: "Тартар из тунца", desc: "Свежий тунец с авокадо, соевым соусом и кунжутом.", price: 720, weight: "180 г", photo: img("seafood"), categoryId: cat("Закуски") },
      { title: "Мидии в белом вине", desc: "Чёрные мидии в сливочно-чесночном соусе.", price: 680, weight: "400 г", photo: img("seafood"), categoryId: cat("Морепродукты") },
      { title: "Крем-суп из лосося", desc: "Норвежский суп из лосося с картофелем и сливками.", price: 520, weight: "350 мл", photo: img("soup"), categoryId: cat("Закуски") },
      { title: "Сырная тарелка", desc: "Испанские сыры с хамоном и оливками.", price: 780, weight: "250 г", photo: safeImg("cheese", dl), categoryId: cat("Закуски") },
      { title: "Тирамису", desc: "Классический итальянский десерт.", price: 420, weight: "150 г", photo: safeImg("cake", dl), categoryId: cat("Десерты") },
    ],
    "morskoy-konek-kursk": [
      { title: "Устрицы", desc: "Свежие устрицы с лимоном и миньонет-соусом.", price: 890, weight: "3 шт.", photo: img("seafood"), categoryId: cat("Морепродукты") },
      { title: "Тартар из лосося", desc: "Рубленый лосось с авокадо и гренками.", price: 620, weight: "180 г", photo: img("seafood"), categoryId: cat("Закуски") },
      { title: "Уха по-царски", desc: "Наваристая уха из трёх видов рыбы.", price: 580, weight: "350 мл", photo: img("soup"), categoryId: cat("Закуски") },
      { title: "Ризотто с чернилами каракатицы", desc: "Чёрное ризотто с морепродуктами.", price: 720, weight: "300 г", photo: safeImg("risotto", dl), categoryId: cat("Паста") },
      { title: "Шоколадный фондан", desc: "Тёплый шоколадный кекс с жидким центром.", price: 420, weight: "1 шт.", photo: safeImg("cake", dl), categoryId: cat("Десерты") },
    ],

    // ── FAMILY / RUSSIAN ──
    "papa-lepit-kursk": [
      { title: "Вареники с картошкой", desc: "Домашние вареники с картофелем и жареным луком.", price: 320, weight: "300 г", photo: img("dumplings"), categoryId: cat("Пельмени и горячее") },
      { title: "Блины со сметаной", desc: "Тонкие блинчики с домашней сметаной.", price: 250, weight: "3 шт.", photo: safeImg("pancakes", dl), categoryId: cat("Десерты") },
      { title: "Окрошка на квасе", desc: "Классическая окрошка на домашнем квасе.", price: 310, weight: "350 мл", photo: img("soup"), categoryId: cat("Супы") },
      { title: "Компот из сухофруктов", desc: "Домашний компот из кураги, чернослива и яблок.", price: 150, weight: "350 мл", photo: img("lemonade"), categoryId: cat("Напитки") },
      { title: "Медовик", desc: "Торт медовик с нежным сметанным кремом.", price: 280, weight: "150 г", photo: safeImg("cake", dl), categoryId: cat("Десерты") },
    ],
    "akvamarin-kursk": [
      { title: "Борщ со сметаной", desc: "Классический борщ с говядиной и домашней сметаной.", price: 420, weight: "350 мл", photo: img("soup"), categoryId: cat("Салаты и супы") },
      { title: "Оливье", desc: "Классический салат с отварной говядиной.", price: 380, weight: "250 г", photo: img("salad"), categoryId: cat("Закуски") },
      { title: "Стейк из говядины", desc: "Стейк Нью-Йорк с перечным соусом и картофелем.", price: 1290, weight: "300 г", photo: img("steak"), categoryId: cat("Горячее") },
      { title: "Крем-брюле", desc: "Французский десерт с карамельной корочкой.", price: 360, weight: "150 г", photo: img("dessert"), categoryId: cat("Десерты") },
      { title: "Морс клюквенный", desc: "Домашний морс из свежей клюквы.", price: 220, weight: "350 мл", photo: img("lemonade"), categoryId: cat("Напитки") },
    ],
    "belaya-akaciya-kursk": [
      { title: "Борщ украинский", desc: "Наваристый борщ с пампушками и чесноком.", price: 450, weight: "350 мл", photo: img("soup"), categoryId: cat("Салаты и супы") },
      { title: "Куриная котлета по-киевски", desc: "Котлета с маслом и зеленью внутри, подаётся с пюре.", price: 580, weight: "280 г", photo: safeImg("chicken", dl), categoryId: cat("Горячее") },
      { title: "Селёдка под шубой", desc: "Слоёный салат с сельдью, свёклой и овощами.", price: 390, weight: "250 г", photo: img("salad"), categoryId: cat("Закуски") },
      { title: "Блинчики с мясом", desc: "Тонкие блинчики с начинкой из тушёной говядины.", price: 380, weight: "3 шт.", photo: safeImg("pancakes", dl), categoryId: cat("Горячее") },
      { title: "Наполеон", desc: "Слоёный торт с нежным заварным кремом.", price: 350, weight: "150 г", photo: safeImg("cake", dl), categoryId: cat("Десерты") },
    ],
    "bykovsky-kursk": [
      { title: "Борщ домашний", desc: "Классический борщ со свининой и домашней сметаной.", price: 410, weight: "350 мл", photo: img("soup"), categoryId: cat("Салаты и супы") },
      { title: "Пельмени домашние", desc: "Пельмени ручной лепки из говядины и свинины.", price: 420, weight: "300 г", photo: img("dumplings"), categoryId: cat("Горячее") },
      { title: "Цезарь с креветками", desc: "Салат Цезарь с тигровыми креветками.", price: 590, weight: "260 г", photo: img("salad"), categoryId: cat("Закуски") },
      { title: "Сырники со сгущёнкой", desc: "Нежные сырники с варёной сгущёнкой.", price: 320, weight: "3 шт.", photo: img("breakfast"), categoryId: cat("Десерты") },
      { title: "Чай с облепихой", desc: "Горячий чай с облепихой и мёдом.", price: 250, weight: "400 мл", photo: safeImg("tea", dl), categoryId: cat("Напитки") },
    ],
    "kotleta-kursk": [
      { title: "Борщ с говядиной", desc: "Густой борщ по домашнему рецепту.", price: 420, weight: "350 мл", photo: img("soup"), categoryId: cat("Салаты и супы") },
      { title: "Котлета по-домашнему", desc: "Сочная котлета из фарша с пюре и подливой.", price: 480, weight: "300 г", photo: safeImg("chicken", dl), categoryId: cat("Горячее") },
      { title: "Оливье классический", desc: "Салат оливье по традиционному рецепту.", price: 350, weight: "250 г", photo: img("salad"), categoryId: cat("Закуски") },
      { title: "Блины с творогом", desc: "Тонкие блинчики с нежным творогом и изюмом.", price: 310, weight: "3 шт.", photo: safeImg("pancakes", dl), categoryId: cat("Десерты") },
      { title: "Морс ягодный", desc: "Домашний морс из лесных ягод.", price: 200, weight: "350 мл", photo: img("lemonade"), categoryId: cat("Напитки") },
    ],
    "rivera-kursk": [
      { title: "Борщ по-домашнему", desc: "Наваристый борщ со сметаной и зеленью.", price: 430, weight: "350 мл", photo: img("soup"), categoryId: cat("Салаты и супы") },
      { title: "Куриное филе гриль", desc: "Куриная грудка на гриле с овощами и соусом песто.", price: 520, weight: "280 г", photo: safeImg("chicken", dl), categoryId: cat("Горячее") },
      { title: "Детский набор", desc: "Куриные наггетсы, картофель фри и сок.", price: 390, weight: "1 порция", photo: safeImg("chicken", dl), categoryId: cat("Горячее") },
      { title: "Мороженое ассорти", desc: "Три шарика мороженого с топпингами.", price: 320, weight: "180 г", photo: safeImg("icecream", dl), categoryId: cat("Десерты") },
      { title: "Чай фруктовый", desc: "Авторский чай с манго и маракуйей.", price: 280, weight: "400 мл", photo: safeImg("tea", dl), categoryId: cat("Напитки") },
    ],

    // ── FINE DINING / AUTHOR ──
    "ferma-kursk": [
      { title: "Тартар из говядины", desc: "Рубленая мраморная говядина с каперсами и желтком.", price: 680, weight: "180 г", photo: img("steak"), categoryId: cat("Закуски") },
      { title: "Ризотто с трюфелем", desc: "Кремовое ризотто с трюфельным маслом.", price: 780, weight: "300 г", photo: safeImg("risotto", dl), categoryId: cat("Горячее") },
      { title: "Утиная ножка конфи", desc: "Томлёная утиная ножка с ягодным соусом.", price: 880, weight: "300 г", photo: img("steak"), categoryId: cat("Горячее") },
      { title: "Сырная тарелка", desc: "Выдержанные сыры с мёдом и орехами.", price: 720, weight: "200 г", photo: safeImg("cheese", dl), categoryId: cat("Закуски") },
      { title: "Тирамису авторский", desc: "Тирамису от шеф-кондитера с маскарпоне.", price: 420, weight: "150 г", photo: safeImg("cake", dl), categoryId: cat("Десерты") },
    ],
    "introvert-kursk": [
      { title: "Тартар из лосося", desc: "Рубленый лосось с авокадо и цитрусовой заправкой.", price: 620, weight: "180 г", photo: img("seafood"), categoryId: cat("Закуски") },
      { title: "Ризотто с грибами", desc: "Кремовое ризотто с белыми грибами.", price: 680, weight: "300 г", photo: safeImg("risotto", dl), categoryId: cat("Горячее") },
      { title: "Стейк Рибай", desc: "Стейк из мраморной говядины с розмарином.", price: 1390, weight: "300 г", photo: img("steak"), categoryId: cat("Горячее") },
      { title: "Панна котта", desc: "Ванильная панна котта с клубничным соусом.", price: 380, weight: "150 г", photo: img("dessert"), categoryId: cat("Десерты") },
      { title: "Авторский коктейль", desc: "Сезонный коктейль от бармена.", price: 480, weight: "200 мл", photo: img("cocktail"), categoryId: cat("Напитки") },
    ],
    "sava-kursk": [
      { title: "Рибай стейк", desc: "Мраморная говядина прожарки Medium на углях.", price: 1690, weight: "350 г", photo: img("steak"), categoryId: cat("Горячее") },
      { title: "Тартар из говядины", desc: "Классический тартар с каперсами и желтком.", price: 720, weight: "180 г", photo: img("steak"), categoryId: cat("Закуски") },
      { title: "Карпаччо из телятины", desc: "Тонко нарезанная телятина с рукколой и пармезаном.", price: 620, weight: "160 г", photo: img("steak"), categoryId: cat("Закуски") },
      { title: "Картофель трюфельный", desc: "Запечённый картофель с трюфельным маслом и сыром.", price: 420, weight: "250 г", photo: img("salad"), categoryId: cat("Горячее") },
      { title: "Сорбет лимонный", desc: "Освежающий лимонный сорбет.", price: 320, weight: "120 г", photo: safeImg("icecream", dl), categoryId: cat("Десерты") },
    ],
    "utka-kursk": [
      { title: "Утиная грудка", desc: "Томлёная утиная грудка с апельсиновым соусом.", price: 890, weight: "280 г", photo: img("steak"), categoryId: cat("Горячее") },
      { title: "Тартар из тунца", desc: "Свежий тунец с авокадо и васаби.", price: 720, weight: "180 г", photo: img("seafood"), categoryId: cat("Закуски") },
      { title: "Крем-суп из цветной капусты", desc: "Бархатный суп с трюфельным маслом.", price: 480, weight: "300 мл", photo: img("soup"), categoryId: cat("Салаты и супы") },
      { title: "Сырная тарелка", desc: "Авторская подборка выдержанных сыров.", price: 780, weight: "200 г", photo: safeImg("cheese", dl), categoryId: cat("Закуски") },
      { title: "Шоколадный фондан", desc: "Тёплый кекс с жидким шоколадным центром.", price: 420, weight: "1 шт.", photo: safeImg("cake", dl), categoryId: cat("Десерты") },
    ],

    // ── JAPANESE / ASIAN ──
    "leto-demo-kursk": [
      { title: "Рамен с курицей", desc: "Японский суп с лапшой, курицей и яйцом.", price: 520, weight: "400 мл", photo: safeImg("ramen", dl), categoryId: cat("Горячее") },
      { title: "Том Ям", desc: "Тайский кисло-острый суп с креветками.", price: 560, weight: "350 мл", photo: img("soup"), categoryId: cat("Горячее") },
      { title: "Гёдза", desc: "Японские жареные пельмени с соевым соусом.", price: 420, weight: "6 шт.", photo: img("dumplings"), categoryId: cat("Закуски") },
      { title: "Вок с овощами", desc: "Лапша вок с овощами и соусом терияки.", price: 480, weight: "350 г", photo: safeImg("wok", dl), categoryId: cat("Горячее") },
      { title: "Моти", desc: "Японские рисовые пирожные с начинкой.", price: 360, weight: "3 шт.", photo: img("dessert"), categoryId: cat("Десерты") },
    ],
    "seasons-kursk": [
      { title: "Рамен с говядиной", desc: "Наваристый бульон с лапшой и тонко нарезанной говядиной.", price: 580, weight: "400 мл", photo: safeImg("ramen", dl), categoryId: cat("Горячее") },
      { title: "Тигровые креветки в темпуре", desc: "Хрустящие креветки в кляре с соусом понзу.", price: 680, weight: "200 г", photo: img("seafood"), categoryId: cat("Закуски") },
      { title: "Поке боул", desc: "Чаша с рисом, лососем, авокадо и соусом.", price: 520, weight: "350 г", photo: img("sushi"), categoryId: cat("Закуски") },
      { title: "Вок с курицей", desc: "Лапша удон с курицей и овощами в соусе терияки.", price: 480, weight: "350 г", photo: safeImg("wok", dl), categoryId: cat("Горячее") },
      { title: "Матча-чизкейк", desc: "Чизкейк с японским зелёным чаем матча.", price: 420, weight: "150 г", photo: safeImg("cake", dl), categoryId: cat("Десерты") },
    ],
  };

  return dishes[slug] || [];
}

// ── Hall layout templates ──────────────────────────────────────────────
// Each layout has objects and table positions
function getHallLayout(slug, restaurantId, hallId, existingTables) {
  const tableCount = existingTables.length;
  if (tableCount === 0) return null;

  // Hall objects: bar, kitchen, entrance, restroom, and decorative elements
  const layouts = {
    // ── BAR LAYOUT ── (bar counter + stage + small tables)
    bar: {
      width: 900, height: 600,
      objects: [
        { type: "bar", label: "Барная стойка", x: 580, y: 20, width: 300, height: 60, shape: "rectangle", icon: "🍷", color: "#7c4f3d" },
        { type: "zone", label: "Сцена", x: 20, y: 20, width: 200, height: 120, shape: "rectangle", icon: "🎵", color: "#5a4a3d" },
        { type: "entrance", label: "Вход", x: 380, y: 530, width: 140, height: 50, shape: "rectangle", icon: "↘", color: "#5f7f55" },
        { type: "toilet", label: "WC", x: 20, y: 480, width: 100, height: 80, shape: "rectangle", icon: "WC", color: "#64748b" },
        { type: "kitchen", label: "Кухня", x: 780, y: 480, width: 100, height: 100, shape: "rectangle", icon: "☕", color: "#9a5b3d" },
      ],
      tablePositions: [
        { x: 60, y: 200, w: 80, h: 80, shape: "circle" },
        { x: 200, y: 200, w: 80, h: 80, shape: "circle" },
        { x: 340, y: 200, w: 80, h: 80, shape: "circle" },
        { x: 480, y: 200, w: 80, h: 80, shape: "circle" },
        { x: 60, y: 340, w: 100, h: 70, shape: "rectangle" },
        { x: 200, y: 340, w: 100, h: 70, shape: "rectangle" },
        { x: 340, y: 340, w: 100, h: 70, shape: "rectangle" },
        { x: 480, y: 340, w: 100, h: 70, shape: "rectangle" },
        { x: 620, y: 200, w: 100, h: 70, shape: "rectangle" },
        { x: 620, y: 340, w: 100, h: 70, shape: "rectangle" },
      ],
    },
    // ── CAFE LAYOUT ── (counter + small cozy tables)
    cafe: {
      width: 900, height: 520,
      objects: [
        { type: "bar", label: "Кофейная стойка", x: 20, y: 20, width: 180, height: 50, shape: "rectangle", icon: "☕", color: "#8a6b4d" },
        { type: "zone", label: "Витрина", x: 220, y: 20, width: 120, height: 50, shape: "rectangle", icon: "🍰", color: "#b39066" },
        { type: "entrance", label: "Вход", x: 380, y: 450, width: 140, height: 50, shape: "rectangle", icon: "↘", color: "#5f7f55" },
        { type: "toilet", label: "WC", x: 800, y: 20, width: 80, height: 70, shape: "rectangle", icon: "WC", color: "#64748b" },
        { type: "zone", label: "Окно", x: 0, y: 120, width: 20, height: 300, shape: "rectangle", icon: "▪", color: "#a8c4a0" },
      ],
      tablePositions: [
        { x: 40, y: 130, w: 80, h: 80, shape: "circle" },
        { x: 40, y: 260, w: 80, h: 80, shape: "circle" },
        { x: 180, y: 130, w: 90, h: 65, shape: "rectangle" },
        { x: 180, y: 260, w: 90, h: 65, shape: "rectangle" },
        { x: 340, y: 130, w: 80, h: 80, shape: "circle" },
        { x: 340, y: 260, w: 80, h: 80, shape: "circle" },
        { x: 500, y: 130, w: 90, h: 65, shape: "rectangle" },
        { x: 500, y: 260, w: 90, h: 65, shape: "rectangle" },
        { x: 660, y: 130, w: 120, h: 70, shape: "rectangle" },
        { x: 660, y: 260, w: 120, h: 70, shape: "rectangle" },
      ],
    },
    // ── FINE DINING ── (spacious layout with zones)
    fineDining: {
      width: 900, height: 700,
      objects: [
        { type: "bar", label: "Бар", x: 680, y: 20, width: 200, height: 60, shape: "rectangle", icon: "🍷", color: "#7c4f3d" },
        { type: "kitchen", label: "Кухня", x: 680, y: 580, width: 200, height: 100, shape: "rectangle", icon: "☕", color: "#9a5b3d" },
        { type: "entrance", label: "Вход", x: 20, y: 620, width: 140, height: 60, shape: "rectangle", icon: "↘", color: "#5f7f55" },
        { type: "toilet", label: "WC", x: 200, y: 620, width: 100, height: 60, shape: "rectangle", icon: "WC", color: "#64748b" },
        { type: "zone", label: "VIP", x: 20, y: 20, width: 260, height: 180, shape: "rectangle", icon: "⭐", color: "#8f7b4d" },
      ],
      tablePositions: [
        // VIP zone
        { x: 40, y: 50, w: 100, h: 70, shape: "rectangle" },
        { x: 160, y: 50, w: 100, h: 70, shape: "rectangle" },
        // Main area
        { x: 40, y: 260, w: 90, h: 90, shape: "circle" },
        { x: 200, y: 260, w: 90, h: 90, shape: "circle" },
        { x: 360, y: 260, w: 90, h: 90, shape: "circle" },
        { x: 520, y: 260, w: 90, h: 90, shape: "circle" },
        { x: 40, y: 420, w: 110, h: 70, shape: "rectangle" },
        { x: 200, y: 420, w: 110, h: 70, shape: "rectangle" },
        { x: 360, y: 420, w: 110, h: 70, shape: "rectangle" },
        { x: 520, y: 420, w: 110, h: 70, shape: "rectangle" },
        { x: 360, y: 50, w: 120, h: 80, shape: "rectangle" },
        { x: 520, y: 50, w: 120, h: 80, shape: "rectangle" },
      ],
    },
    // ── FAMILY RESTAURANT ── (mix of sizes, kids area)
    family: {
      width: 900, height: 600,
      objects: [
        { type: "bar", label: "Бар", x: 700, y: 20, width: 180, height: 55, shape: "rectangle", icon: "🍷", color: "#7c4f3d" },
        { type: "kitchen", label: "Кухня", x: 700, y: 500, width: 180, height: 80, shape: "rectangle", icon: "☕", color: "#9a5b3d" },
        { type: "entrance", label: "Вход", x: 380, y: 530, width: 140, height: 50, shape: "rectangle", icon: "↘", color: "#5f7f55" },
        { type: "toilet", label: "WC", x: 20, y: 500, width: 100, height: 80, shape: "rectangle", icon: "WC", color: "#64748b" },
        { type: "zone", label: "Банкетная зона", x: 20, y: 20, width: 280, height: 150, shape: "rectangle", icon: "🎉", color: "#8f7b4d" },
      ],
      tablePositions: [
        // Banquet zone - large tables
        { x: 40, y: 40, w: 120, h: 80, shape: "rectangle" },
        { x: 180, y: 40, w: 100, h: 80, shape: "rectangle" },
        // Main area
        { x: 40, y: 220, w: 80, h: 80, shape: "circle" },
        { x: 180, y: 220, w: 80, h: 80, shape: "circle" },
        { x: 320, y: 220, w: 80, h: 80, shape: "circle" },
        { x: 460, y: 220, w: 80, h: 80, shape: "circle" },
        { x: 40, y: 360, w: 100, h: 70, shape: "rectangle" },
        { x: 200, y: 360, w: 100, h: 70, shape: "rectangle" },
        { x: 360, y: 360, w: 100, h: 70, shape: "rectangle" },
        { x: 520, y: 360, w: 100, h: 70, shape: "rectangle" },
        { x: 360, y: 40, w: 140, h: 80, shape: "rectangle" },
        { x: 520, y: 40, w: 120, h: 80, shape: "rectangle" },
      ],
    },
    // ── GEORGIAN LAYOUT ── (grill area + communal tables)
    georgian: {
      width: 900, height: 600,
      objects: [
        { type: "zone", label: "Мангал", x: 700, y: 20, width: 180, height: 100, shape: "rectangle", icon: "🔥", color: "#a05030" },
        { type: "kitchen", label: "Кухня", x: 700, y: 140, width: 180, height: 100, shape: "rectangle", icon: "☕", color: "#9a5b3d" },
        { type: "entrance", label: "Вход", x: 380, y: 530, width: 140, height: 50, shape: "rectangle", icon: "↘", color: "#5f7f55" },
        { type: "toilet", label: "WC", x: 20, y: 500, width: 100, height: 80, shape: "rectangle", icon: "WC", color: "#64748b" },
        { type: "bar", label: "Бар", x: 700, y: 460, width: 180, height: 55, shape: "rectangle", icon: "🍷", color: "#7c4f3d" },
      ],
      tablePositions: [
        // Long communal tables
        { x: 40, y: 40, w: 260, h: 80, shape: "rectangle" },
        { x: 340, y: 40, w: 260, h: 80, shape: "rectangle" },
        // Regular tables
        { x: 40, y: 180, w: 100, h: 100, shape: "circle" },
        { x: 200, y: 180, w: 100, h: 100, shape: "circle" },
        { x: 360, y: 180, w: 100, h: 100, shape: "circle" },
        { x: 520, y: 180, w: 100, h: 100, shape: "circle" },
        { x: 40, y: 340, w: 110, h: 75, shape: "rectangle" },
        { x: 200, y: 340, w: 110, h: 75, shape: "rectangle" },
        { x: 360, y: 340, w: 110, h: 75, shape: "rectangle" },
        { x: 520, y: 340, w: 110, h: 75, shape: "rectangle" },
      ],
    },
    // ── SEAFOOD LAYOUT ── (open kitchen + elegant tables)
    seafood: {
      width: 900, height: 600,
      objects: [
        { type: "kitchen", label: "Открытая кухня", x: 20, y: 20, width: 300, height: 80, shape: "rectangle", icon: "🐟", color: "#3d6b8a" },
        { type: "bar", label: "Бар", x: 700, y: 20, width: 180, height: 60, shape: "rectangle", icon: "🍷", color: "#7c4f3d" },
        { type: "entrance", label: "Вход", x: 380, y: 530, width: 140, height: 50, shape: "rectangle", icon: "↘", color: "#5f7f55" },
        { type: "toilet", label: "WC", x: 800, y: 500, width: 80, height: 70, shape: "rectangle", icon: "WC", color: "#64748b" },
        { type: "zone", label: "Аквариум", x: 360, y: 20, width: 140, height: 80, shape: "rectangle", icon: "🐠", color: "#4d7a8f" },
      ],
      tablePositions: [
        { x: 40, y: 150, w: 90, h: 90, shape: "circle" },
        { x: 200, y: 150, w: 90, h: 90, shape: "circle" },
        { x: 360, y: 150, w: 90, h: 90, shape: "circle" },
        { x: 520, y: 150, w: 90, h: 90, shape: "circle" },
        { x: 680, y: 150, w: 90, h: 90, shape: "circle" },
        { x: 40, y: 320, w: 110, h: 70, shape: "rectangle" },
        { x: 200, y: 320, w: 110, h: 70, shape: "rectangle" },
        { x: 360, y: 320, w: 110, h: 70, shape: "rectangle" },
        { x: 520, y: 320, w: 110, h: 70, shape: "rectangle" },
        { x: 680, y: 320, w: 110, h: 70, shape: "rectangle" },
      ],
    },
    // ── PANORAMIC LAYOUT ── (window seats + central area)
    panoramic: {
      width: 900, height: 700,
      objects: [
        { type: "zone", label: "Панорамные окна", x: 0, y: 20, width: 20, height: 500, shape: "rectangle", icon: "▪", color: "#7aa0b8" },
        { type: "bar", label: "Бар", x: 700, y: 20, width: 180, height: 60, shape: "rectangle", icon: "🍷", color: "#7c4f3d" },
        { type: "kitchen", label: "Кухня", x: 700, y: 560, width: 180, height: 120, shape: "rectangle", icon: "☕", color: "#9a5b3d" },
        { type: "entrance", label: "Вход", x: 380, y: 620, width: 140, height: 60, shape: "rectangle", icon: "↘", color: "#5f7f55" },
        { type: "toilet", label: "WC", x: 20, y: 580, width: 100, height: 80, shape: "rectangle", icon: "WC", color: "#64748b" },
      ],
      tablePositions: [
        // Window seats
        { x: 40, y: 40, w: 80, h: 80, shape: "circle" },
        { x: 40, y: 170, w: 80, h: 80, shape: "circle" },
        { x: 40, y: 300, w: 80, h: 80, shape: "circle" },
        { x: 40, y: 430, w: 80, h: 80, shape: "circle" },
        // Central area
        { x: 200, y: 60, w: 110, h: 75, shape: "rectangle" },
        { x: 380, y: 60, w: 110, h: 75, shape: "rectangle" },
        { x: 200, y: 200, w: 110, h: 75, shape: "rectangle" },
        { x: 380, y: 200, w: 110, h: 75, shape: "rectangle" },
        { x: 200, y: 340, w: 110, h: 75, shape: "rectangle" },
        { x: 380, y: 340, w: 110, h: 75, shape: "rectangle" },
        { x: 560, y: 200, w: 100, h: 100, shape: "circle" },
        { x: 560, y: 370, w: 100, h: 100, shape: "circle" },
      ],
    },
  };

  // Map restaurants to layout types
  const layoutMap = {
    "butylochnaya-kursk": "bar", "culture-kursk": "bar", "redstone-kursk": "bar",
    "caramel-kursk": "bar", "pivzavod-kursk": "bar", "red-stone-demo": "bar",
    "bloom-coffee-kursk": "cafe", "donut-bar-kursk": "cafe", "kanelo-kursk": "cafe",
    "kometa-kursk": "cafe", "sei-kursk": "cafe",
    "mezonin-kursk": "panoramic", "sava-kursk": "fineDining", "seasons-kursk": "fineDining",
    "utka-kursk": "fineDining", "ferma-kursk": "fineDining", "introvert-kursk": "fineDining",
    "alt-kursk": "fineDining",
    "akvamarin-kursk": "family", "belaya-akaciya-kursk": "family", "bykovsky-kursk": "family",
    "kotleta-kursk": "family", "papa-lepit-kursk": "family", "rivera-kursk": "family",
    "leto-demo-kursk": "fineDining",
    "gogiya-kursk": "georgian", "tbiladzhio-kursk": "georgian",
    "ispansky-kursk": "seafood", "morskoy-konek-kursk": "seafood",
  };

  const layoutType = layoutMap[slug] || "family";
  const layout = layouts[layoutType];
  if (!layout) return null;

  // Create objects
  const objects = layout.objects.map((obj) => ({
    id: createId(),
    restaurantId,
    hallId,
    ...obj,
    rotation: 0,
    zIndex: 0,
    isLocked: false,
    isVisible: true,
    notes: null,
  }));

  // Update table positions (map existing tables to layout positions)
  const positions = layout.tablePositions.slice(0, tableCount);
  const tableUpdates = existingTables.map((table, i) => {
    const pos = positions[i % positions.length];
    return {
      id: table.id,
      x: pos.x,
      y: pos.y,
      width: pos.w,
      height: pos.h,
      shape: pos.shape,
    };
  });

  return { objects, tableUpdates, width: layout.width, height: layout.height };
}

// ── Main execution ──────────────────────────────────────────────────────
async function main() {
  console.log("=== Enriching demo content ===\n");

  // Step 1: Images already uploaded via tar
  console.log("Step 1: Images already uploaded, marking all as available...");
  const downloadedImages = {};
  for (const name of Object.keys(newImages)) downloadedImages[name] = true;
  console.log(`  ${Object.keys(downloadedImages).length} images available\n`);

  // Step 2: Fix existing photo mismatches
  console.log("Step 2: Fixing photo mismatches...");
  for (const fix of photoFixes) {
    // Only update if new image was downloaded (for tea)
    const photoName = fix.correctPhoto.replace("/images/stock/menu/", "").replace(".jpg", "");
    if (downloadedImages[photoName] === false) {
      console.log(`  SKIP: ${fix.title} (image not available)`);
      continue;
    }
    const result = await prisma.menuItem.updateMany({
      where: { title: fix.title },
      data: { photoUrl: fix.correctPhoto },
    });
    console.log(`  Fixed ${fix.title}: ${result.count} items updated`);
  }
  console.log("");

  // Step 3: Add new dishes
  console.log("Step 3: Adding new dishes...");
  const restaurants = await prisma.restaurant.findMany({
    where: {
      slug: { notIn: ["yyyyyyavy", "yyyyyyavy-2", "yyyyyyavy-3", "esche-odin-restoran"] },
    },
    include: {
      menuCategories: { orderBy: { sortOrder: "asc" } },
    },
  });

  let totalAdded = 0;
  for (const restaurant of restaurants) {
    const categories = {};
    for (const cat of restaurant.menuCategories) {
      categories[cat.title] = cat.id;
    }

    const newDishes = getNewDishes(restaurant.slug, categories, downloadedImages);
    if (!newDishes.length) {
      console.log(`  ${restaurant.slug}: no dishes defined, skipping`);
      continue;
    }

    // Check for duplicates
    const existingTitles = await prisma.menuItem.findMany({
      where: { restaurantId: restaurant.id },
      select: { title: true },
    });
    const existingSet = new Set(existingTitles.map((item) => item.title));
    const maxSort = await prisma.menuItem.aggregate({
      where: { restaurantId: restaurant.id },
      _max: { sortOrder: true },
    });
    let sortOrder = (maxSort._max.sortOrder || 0) + 1;

    const toCreate = [];
    for (const dish of newDishes) {
      if (existingSet.has(dish.title)) continue;
      toCreate.push({
        id: createId(),
        restaurantId: restaurant.id,
        categoryId: dish.categoryId,
        title: dish.title,
        description: dish.desc,
        price: dish.price,
        weight: dish.weight,
        photoUrl: dish.photo,
        isAvailable: true,
        sortOrder: sortOrder++,
      });
    }

    if (toCreate.length) {
      await prisma.menuItem.createMany({ data: toCreate });
      totalAdded += toCreate.length;
      console.log(`  ${restaurant.slug}: +${toCreate.length} dishes`);
    }
  }
  console.log(`  Total: +${totalAdded} dishes\n`);

  // Step 4: Update hall layouts
  console.log("Step 4: Updating hall layouts...");
  const halls = await prisma.hall.findMany({
    where: {
      restaurant: {
        slug: { notIn: ["yyyyyyavy", "yyyyyyavy-2", "yyyyyyavy-3", "esche-odin-restoran"] },
      },
    },
    include: {
      restaurant: { select: { slug: true } },
      tables: { where: { isActive: true }, orderBy: { number: "asc" } },
      objects: true,
    },
  });

  // Only update main halls (first hall per restaurant, with tables)
  const processedRestaurants = new Set();
  for (const hall of halls) {
    const slug = hall.restaurant.slug;
    if (processedRestaurants.has(slug)) continue;
    if (hall.tables.length === 0) continue;
    processedRestaurants.add(slug);

    const layout = getHallLayout(slug, hall.restaurantId, hall.id, hall.tables);
    if (!layout) continue;

    // Delete old objects for this hall
    if (hall.objects.length) {
      await prisma.hallObject.deleteMany({ where: { hallId: hall.id } });
    }

    // Create new objects
    if (layout.objects.length) {
      await prisma.hallObject.createMany({
        data: layout.objects.map((obj) => ({
          ...obj,
          createdAt: new Date(),
          updatedAt: new Date(),
        })),
      });
    }

    // Update hall dimensions
    await prisma.hall.update({
      where: { id: hall.id },
      data: { width: layout.width, height: layout.height },
    });

    // Update table positions
    for (const update of layout.tableUpdates) {
      await prisma.restaurantTable.update({
        where: { id: update.id },
        data: {
          x: update.x,
          y: update.y,
          width: update.width,
          height: update.height,
          shape: update.shape,
        },
      });
    }

    console.log(`  ${slug}: ${layout.objects.length} objects, ${layout.tableUpdates.length} tables repositioned (${layout.width}x${layout.height})`);
  }

  console.log("\n=== Done ===");
  await prisma.$disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
