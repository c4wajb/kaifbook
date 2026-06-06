import { mkdir, stat, writeFile } from "node:fs/promises";
import path from "node:path";

const force = process.argv.includes("--force");
const root = process.cwd();
const publicRoot = path.join(root, "public");

const assets = [
  {
    path: "images/stock/restaurants/dining-01.jpg",
    id: "30951016",
    width: 1800,
    sourcePage: "https://www.pexels.com/photo/30951016/",
    description: "Modern restaurant dining room",
  },
  {
    path: "images/stock/restaurants/dining-02.jpg",
    id: "262978",
    width: 1800,
    sourcePage: "https://www.pexels.com/photo/262978/",
    description: "Waiter serving plates in a restaurant",
  },
  {
    path: "images/stock/restaurants/dining-03.jpg",
    id: "32738700",
    width: 1800,
    sourcePage: "https://www.pexels.com/photo/32738700/",
    description: "Warm restaurant table setting",
  },
  {
    path: "images/stock/restaurants/cafe-01.jpg",
    id: "18516401",
    width: 1600,
    sourcePage: "https://www.pexels.com/photo/18516401/",
    description: "Coffee and pastries in a cafe",
  },
  {
    path: "images/stock/restaurants/bar-01.jpg",
    id: "1579739",
    width: 1800,
    sourcePage: "https://www.pexels.com/photo/1579739/",
    description: "Cozy bar and restaurant interior",
  },
  {
    path: "images/stock/restaurants/terrace-01.jpg",
    id: "19039292",
    width: 1800,
    sourcePage: "https://www.pexels.com/photo/19039292/",
    description: "Restaurant tables near windows",
  },
  {
    path: "images/stock/menu/dish-fallback.jpg",
    id: "1640777",
    width: 1200,
    sourcePage: "https://www.pexels.com/photo/1640777/",
    description: "Fallback healthy bowl",
  },
  {
    path: "images/stock/menu/salad.jpg",
    id: "1640777",
    width: 1200,
    sourcePage: "https://www.pexels.com/photo/1640777/",
    description: "Colorful salad bowl",
  },
  {
    path: "images/stock/menu/soup.jpg",
    id: "539451",
    width: 1200,
    sourcePage: "https://www.pexels.com/photo/539451/",
    description: "Soup in a bowl",
  },
  {
    path: "images/stock/menu/breakfast.jpg",
    id: "376464",
    width: 1200,
    sourcePage: "https://www.pexels.com/photo/376464/",
    description: "Breakfast pancakes",
  },
  {
    path: "images/stock/menu/coffee.jpg",
    id: "312418",
    width: 1200,
    sourcePage: "https://www.pexels.com/photo/312418/",
    description: "Coffee cup",
  },
  {
    path: "images/stock/menu/pizza.jpg",
    id: "825661",
    width: 1200,
    sourcePage: "https://www.pexels.com/photo/825661/",
    description: "Pizza",
  },
  {
    path: "images/stock/menu/sushi.jpg",
    id: "2098085",
    width: 1200,
    sourcePage: "https://www.pexels.com/photo/2098085/",
    description: "Sushi set",
  },
  {
    path: "images/stock/menu/pasta.jpg",
    id: "1438672",
    width: 1200,
    sourcePage: "https://www.pexels.com/photo/1438672/",
    description: "Pasta on a plate",
  },
  {
    path: "images/stock/menu/seafood.jpg",
    id: "2092906",
    width: 1200,
    sourcePage: "https://www.pexels.com/photo/2092906/",
    description: "Seafood pasta",
  },
  {
    path: "images/stock/menu/steak.jpg",
    id: "769289",
    width: 1200,
    sourcePage: "https://www.pexels.com/photo/769289/",
    description: "Steak with vegetables",
  },
  {
    path: "images/stock/menu/bbq.jpg",
    id: "410648",
    width: 1200,
    sourcePage: "https://www.pexels.com/photo/410648/",
    description: "Grilled ribs",
  },
  {
    path: "images/stock/menu/dessert.jpg",
    id: "1126359",
    width: 1200,
    sourcePage: "https://www.pexels.com/photo/1126359/",
    description: "Dessert with berries",
  },
  {
    path: "images/stock/menu/dumplings.jpg",
    id: "955137",
    width: 1200,
    sourcePage: "https://www.pexels.com/photo/955137/",
    description: "Dumplings",
  },
  {
    path: "images/stock/menu/khinkali.jpg",
    id: "955137",
    width: 1200,
    sourcePage: "https://www.pexels.com/photo/955137/",
    description: "Dumplings used for khinkali-style demo dishes",
  },
  {
    path: "images/stock/menu/bruschetta.jpg",
    id: "1126728",
    width: 1200,
    sourcePage: "https://www.pexels.com/photo/1126728/",
    description: "Small plates and snacks",
  },
  {
    path: "images/stock/menu/lemonade.jpg",
    id: "17305193",
    width: 1200,
    sourcePage: "https://www.pexels.com/photo/17305193/",
    description: "Cafe drink",
  },
  {
    path: "images/stock/menu/wine.jpg",
    id: "1407857",
    width: 1200,
    sourcePage: "https://www.pexels.com/photo/1407857/",
    description: "Wine and fruit",
  },
  {
    path: "images/stock/menu/cocktail.jpg",
    id: "1283219",
    width: 1200,
    sourcePage: "https://www.pexels.com/photo/1283219/",
    description: "Bar bottles for cocktail section",
  },
  {
    path: "images/stock/menu/kids.jpg",
    id: "461198",
    width: 1200,
    sourcePage: "https://www.pexels.com/photo/461198/",
    description: "Casual wrap for kids menu",
  },
];

async function exists(filePath) {
  try {
    const info = await stat(filePath);
    return info.size > 10_000;
  } catch {
    return false;
  }
}

async function download(asset) {
  const target = path.join(publicRoot, asset.path);
  if (!force && (await exists(target))) {
    console.log(`skip ${asset.path}`);
    return;
  }

  const url = `https://images.pexels.com/photos/${asset.id}/pexels-photo-${asset.id}.jpeg?auto=compress&cs=tinysrgb&w=${asset.width}`;
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to download ${asset.path}: ${response.status} ${response.statusText}`);
  }

  const contentType = response.headers.get("content-type") || "";
  if (!contentType.startsWith("image/")) {
    throw new Error(`Unexpected content type for ${asset.path}: ${contentType}`);
  }

  await mkdir(path.dirname(target), { recursive: true });
  await writeFile(target, Buffer.from(await response.arrayBuffer()));
  console.log(`downloaded ${asset.path}`);
}

async function main() {
  for (const asset of assets) {
    await download(asset);
  }

  await writeFile(
    path.join(publicRoot, "images/stock/photo-sources.json"),
    JSON.stringify(
      {
        license: "https://www.pexels.com/license/",
        note: "Stock demo photos from Pexels. These are not claimed to be photos of the exact restaurants.",
        assets,
      },
      null,
      2,
    ),
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
