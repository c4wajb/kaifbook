import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";

const root = process.cwd();

function esc(value) {
  return String(value).replace(/[&<>"']/g, (char) => {
    if (char === "&") return "&amp;";
    if (char === "<") return "&lt;";
    if (char === ">") return "&gt;";
    if (char === "\"") return "&quot;";
    return "&apos;";
  });
}

async function writeAsset(file, svg) {
  const target = join(root, "public", file);
  await mkdir(dirname(target), { recursive: true });
  await writeFile(target, svg, "utf8");
}

function baseSvg({ label, accent = "#b86a43", secondary = "#2f211a", body = "" }) {
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="820" viewBox="0 0 1200 820" role="img" aria-label="${esc(label)}">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#fff8ec"/>
      <stop offset="0.55" stop-color="#ead9bd"/>
      <stop offset="1" stop-color="#d0a06a"/>
    </linearGradient>
    <radialGradient id="glow" cx="50%" cy="34%" r="58%">
      <stop offset="0" stop-color="#ffffff" stop-opacity="0.88"/>
      <stop offset="1" stop-color="#ffffff" stop-opacity="0"/>
    </radialGradient>
    <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="26" stdDeviation="28" flood-color="#3a2018" flood-opacity="0.22"/>
    </filter>
  </defs>
  <rect width="1200" height="820" fill="url(#bg)"/>
  <rect width="1200" height="820" fill="url(#glow)"/>
  <g opacity="0.13" stroke="#7b4a34" stroke-width="2">
    <path d="M0 160h1200M0 320h1200M0 480h1200M0 640h1200"/>
    <path d="M160 0v820M320 0v820M480 0v820M640 0v820M800 0v820M960 0v820M1120 0v820"/>
  </g>
  <g filter="url(#shadow)">
    <ellipse cx="600" cy="512" rx="330" ry="118" fill="#c48b56" opacity="0.24"/>
    <circle cx="600" cy="390" r="238" fill="#fffaf1"/>
    <circle cx="600" cy="390" r="198" fill="#f8ead3" stroke="#c99a68" stroke-width="16"/>
    <circle cx="600" cy="390" r="122" fill="#fffaf1"/>
    ${body}
  </g>
  <g fill="${secondary}" opacity="0.42">
    <circle cx="145" cy="120" r="8"/><circle cx="181" cy="144" r="5"/><circle cx="1020" cy="118" r="7"/><circle cx="1076" cy="164" r="5"/>
  </g>
  <path d="M112 682c78-44 170-56 278-28 96 25 195 21 298-13 89-29 181-25 276 11" fill="none" stroke="${accent}" stroke-width="20" stroke-linecap="round" opacity="0.22"/>
</svg>`;
}

const plate = {
  salad: baseSvg({
    label: "Salad dish",
    accent: "#6f9c6b",
    body: `
      <circle cx="510" cy="365" r="46" fill="#7fbf73"/>
      <circle cx="592" cy="336" r="56" fill="#8ccf82"/>
      <circle cx="676" cy="374" r="48" fill="#5d9c63"/>
      <circle cx="550" cy="444" r="44" fill="#e44f3c"/>
      <circle cx="646" cy="456" r="38" fill="#f0b04d"/>
      <path d="M483 405c86-72 182-78 276-16" fill="none" stroke="#315c3b" stroke-width="18" stroke-linecap="round"/>
    `,
  }),
  bruschetta: baseSvg({
    label: "Bruschetta appetizer",
    accent: "#b86a43",
    body: `
      <rect x="412" y="330" width="176" height="132" rx="34" fill="#d79b5d" transform="rotate(-9 500 396)"/>
      <rect x="602" y="322" width="186" height="142" rx="34" fill="#d79b5d" transform="rotate(8 695 393)"/>
      <circle cx="480" cy="370" r="18" fill="#d94235"/><circle cx="530" cy="420" r="20" fill="#d94235"/>
      <circle cx="664" cy="374" r="19" fill="#d94235"/><circle cx="721" cy="420" r="17" fill="#d94235"/>
      <path d="M441 412c53-44 103-47 150-8M626 404c61-44 119-42 174 7" fill="none" stroke="#558c4f" stroke-width="14" stroke-linecap="round"/>
    `,
  }),
  soup: baseSvg({
    label: "Soup bowl",
    accent: "#9a3f32",
    body: `
      <ellipse cx="600" cy="392" rx="185" ry="95" fill="#f4f0e8" stroke="#c89b68" stroke-width="16"/>
      <ellipse cx="600" cy="382" rx="140" ry="62" fill="#9a2f30"/>
      <circle cx="550" cy="365" r="17" fill="#f2c94c"/><circle cx="620" cy="395" r="15" fill="#ffdf6e"/><circle cx="673" cy="370" r="13" fill="#7db66a"/>
      <path d="M457 476c76 52 212 60 309 0" fill="none" stroke="#7b4a34" stroke-width="22" stroke-linecap="round"/>
    `,
  }),
  pasta: baseSvg({
    label: "Pasta dish",
    accent: "#c98245",
    body: `
      <path d="M450 410c80-88 210-112 315-18" fill="none" stroke="#e6bd61" stroke-width="28" stroke-linecap="round"/>
      <path d="M472 455c78-98 236-108 307-19M498 368c92 20 155 68 194 144" fill="none" stroke="#f1d37d" stroke-width="20" stroke-linecap="round"/>
      <circle cx="545" cy="418" r="18" fill="#d94732"/><circle cx="649" cy="397" r="16" fill="#d94732"/><circle cx="699" cy="456" r="18" fill="#d94732"/>
      <path d="M514 333l184 156" stroke="#5e8b4f" stroke-width="12" stroke-linecap="round"/>
    `,
  }),
  steak: baseSvg({
    label: "Steak and vegetables",
    accent: "#7b3f2f",
    body: `
      <path d="M470 385c38-82 152-105 235-53 61 39 72 111 27 165-58 70-188 65-252-1-39-40-43-91-10-111Z" fill="#8b3b2c"/>
      <path d="M513 382c45-38 126-37 184 8" fill="none" stroke="#d9a078" stroke-width="18" stroke-linecap="round" opacity="0.82"/>
      <circle cx="752" cy="438" r="31" fill="#7fbf73"/><circle cx="790" cy="382" r="25" fill="#f0b04d"/>
      <path d="M424 480c90 47 216 53 361 1" fill="none" stroke="#653124" stroke-width="12" stroke-linecap="round" opacity="0.55"/>
    `,
  }),
  seafood: baseSvg({
    label: "Seafood dish",
    accent: "#4f8794",
    body: `
      <path d="M466 412c84-88 229-88 312 0-79 76-223 76-312 0Z" fill="#6ab4c4"/>
      <path d="M777 412l88-56-26 56 26 56Z" fill="#5c9dad"/>
      <circle cx="525" cy="394" r="12" fill="#20333b"/>
      <path d="M485 455c74 40 165 39 238-2" fill="none" stroke="#fff7e5" stroke-width="12" stroke-linecap="round"/>
      <circle cx="438" cy="357" r="24" fill="#f08d55"/><circle cx="805" cy="466" r="22" fill="#f0b04d"/>
    `,
  }),
  dumplings: baseSvg({
    label: "Dumplings dish",
    accent: "#a96f47",
    body: `
      <g fill="#f5d19b" stroke="#b87548" stroke-width="9">
        <path d="M442 386c28-62 107-62 136 0-28 44-104 44-136 0Z"/>
        <path d="M542 456c28-62 107-62 136 0-28 44-104 44-136 0Z"/>
        <path d="M620 358c28-62 107-62 136 0-28 44-104 44-136 0Z"/>
        <path d="M469 500c28-62 107-62 136 0-28 44-104 44-136 0Z"/>
      </g>
      <path d="M465 382c36 16 72 16 110 0M571 452c34 16 69 16 103 0M650 355c32 14 65 14 98 0" fill="none" stroke="#8e583a" stroke-width="7" stroke-linecap="round"/>
    `,
  }),
  khinkali: baseSvg({
    label: "Khinkali dish",
    accent: "#9a6a42",
    body: `
      <g fill="#f2d2a3" stroke="#9c6746" stroke-width="10">
        <path d="M504 489c-58-75-38-154 45-196 14-36 74-36 88 0 83 42 103 121 45 196-42 54-136 54-178 0Z"/>
        <path d="M396 469c-47-61-31-126 37-160 12-29 62-29 74 0 68 34 84 99 37 160-35 44-109 44-144 0Z" opacity="0.85"/>
        <path d="M666 470c-47-61-31-126 37-160 12-29 62-29 74 0 68 34 84 99 37 160-35 44-109 44-144 0Z" opacity="0.85"/>
      </g>
      <path d="M548 291c24 16 56 16 80 0M443 309c22 13 45 13 68 0M710 310c22 13 45 13 68 0" fill="none" stroke="#7b4a34" stroke-width="8" stroke-linecap="round"/>
    `,
  }),
  sushi: baseSvg({
    label: "Sushi set",
    accent: "#2f6f68",
    body: `
      <g transform="translate(412 315)">
        <rect x="0" y="0" width="138" height="88" rx="34" fill="#263f3b"/><circle cx="69" cy="44" r="30" fill="#fffaf1"/><circle cx="69" cy="44" r="16" fill="#e9684b"/>
        <rect x="168" y="15" width="156" height="82" rx="34" fill="#fffaf1" stroke="#263f3b" stroke-width="12"/><rect x="194" y="34" width="104" height="28" rx="14" fill="#f29b52"/>
        <rect x="344" y="-8" width="138" height="88" rx="34" fill="#263f3b"/><circle cx="413" cy="36" r="30" fill="#fffaf1"/><circle cx="413" cy="36" r="16" fill="#7fbf73"/>
        <rect x="88" y="140" width="260" height="28" rx="14" fill="#7b4a34" transform="rotate(-8 218 154)"/>
      </g>
    `,
  }),
  breakfast: baseSvg({
    label: "Breakfast plate",
    accent: "#d1913e",
    body: `
      <circle cx="532" cy="382" r="70" fill="#fffaf1" stroke="#e2c18b" stroke-width="10"/>
      <circle cx="532" cy="382" r="32" fill="#f0b04d"/>
      <rect x="610" y="328" width="136" height="102" rx="28" fill="#d48c4b" transform="rotate(9 678 379)"/>
      <path d="M436 482c82 42 207 43 342 2" fill="none" stroke="#7b4a34" stroke-width="14" stroke-linecap="round"/>
      <circle cx="714" cy="462" r="31" fill="#e44f3c"/><circle cx="752" cy="455" r="22" fill="#7fbf73"/>
    `,
  }),
  dessert: baseSvg({
    label: "Dessert cake",
    accent: "#c7776c",
    body: `
      <path d="M447 492h310v-96c-80-62-198-61-310 0Z" fill="#f4c6bf" stroke="#9a4d43" stroke-width="12"/>
      <path d="M448 395c101 30 202 30 306 0" fill="none" stroke="#fff8ec" stroke-width="22" stroke-linecap="round"/>
      <rect x="492" y="327" width="222" height="62" rx="20" fill="#fff1d7" stroke="#9a4d43" stroke-width="10"/>
      <circle cx="604" cy="316" r="24" fill="#d94732"/>
      <path d="M512 447h196" stroke="#9a4d43" stroke-width="10" stroke-linecap="round" opacity="0.38"/>
    `,
  }),
  coffee: baseSvg({
    label: "Coffee cup",
    accent: "#7b4a34",
    body: `
      <rect x="456" y="352" width="264" height="150" rx="42" fill="#fff8ec" stroke="#7b4a34" stroke-width="14"/>
      <path d="M720 384h40c38 0 38 65 0 65h-40" fill="none" stroke="#7b4a34" stroke-width="14" stroke-linecap="round"/>
      <ellipse cx="588" cy="360" rx="102" ry="34" fill="#8b4d35"/>
      <path d="M527 282c-20 40 24 50 0 88M602 271c-20 43 25 55 0 96M675 282c-20 40 24 50 0 88" fill="none" stroke="#7b4a34" stroke-width="12" stroke-linecap="round" opacity="0.55"/>
    `,
  }),
  cocktail: baseSvg({
    label: "Cocktail drinks",
    accent: "#c67645",
    body: `
      <path d="M485 306h224l-84 124v96h-56v-96Z" fill="#fff8ec" stroke="#7b4a34" stroke-width="12"/>
      <path d="M520 336h174l-54 78H574Z" fill="#e9874d"/>
      <path d="M592 526v56M520 582h164" stroke="#7b4a34" stroke-width="13" stroke-linecap="round"/>
      <circle cx="692" cy="315" r="28" fill="#d94732"/>
      <path d="M668 306l80-74" stroke="#7b4a34" stroke-width="10" stroke-linecap="round"/>
    `,
  }),
  wine: baseSvg({
    label: "Wine glasses",
    accent: "#8b3b50",
    body: `
      <path d="M475 287h122c8 120-22 176-61 176s-69-56-61-176Z" fill="#fff8ec" stroke="#7b4a34" stroke-width="12"/>
      <path d="M481 344h110c-5 64-28 91-55 91s-50-27-55-91Z" fill="#8b3b50"/>
      <path d="M682 287h122c8 120-22 176-61 176s-69-56-61-176Z" fill="#fff8ec" stroke="#7b4a34" stroke-width="12"/>
      <path d="M688 344h110c-5 64-28 91-55 91s-50-27-55-91Z" fill="#d79b5d"/>
      <path d="M536 463v105M486 568h104M743 463v105M693 568h104" stroke="#7b4a34" stroke-width="12" stroke-linecap="round"/>
    `,
  }),
  lemonade: baseSvg({
    label: "Lemonade drink",
    accent: "#d8a83f",
    body: `
      <rect x="472" y="300" width="240" height="286" rx="54" fill="#fff8ec" stroke="#7b4a34" stroke-width="12"/>
      <rect x="492" y="390" width="200" height="164" rx="36" fill="#f0c84d"/>
      <circle cx="640" cy="386" r="36" fill="#f6df76" stroke="#fff8ec" stroke-width="8"/>
      <path d="M690 286l70-82" stroke="#7b4a34" stroke-width="12" stroke-linecap="round"/>
      <circle cx="548" cy="440" r="13" fill="#fff8ec"/><circle cx="613" cy="505" r="16" fill="#fff8ec"/>
    `,
  }),
  pizza: baseSvg({
    label: "Pizza slice",
    accent: "#d08a3b",
    body: `
      <path d="M455 300l330 86-250 182Z" fill="#f0c15f" stroke="#9a5731" stroke-width="14" stroke-linejoin="round"/>
      <path d="M473 315c91 47 179 70 263 72" fill="none" stroke="#c7773b" stroke-width="18" stroke-linecap="round"/>
      <circle cx="574" cy="397" r="20" fill="#d94732"/><circle cx="642" cy="448" r="17" fill="#d94732"/><circle cx="555" cy="487" r="16" fill="#7fbf73"/>
    `,
  }),
  bbq: baseSvg({
    label: "BBQ plate",
    accent: "#7b3f2f",
    body: `
      <rect x="462" y="350" width="274" height="110" rx="50" fill="#813828" transform="rotate(-8 599 405)"/>
      <rect x="497" y="456" width="236" height="84" rx="38" fill="#b65b33" transform="rotate(6 615 498)"/>
      <path d="M440 344c88 78 210 112 365 102" fill="none" stroke="#f2c94c" stroke-width="13" stroke-linecap="round"/>
      <circle cx="456" cy="501" r="28" fill="#7fbf73"/><circle cx="788" cy="400" r="24" fill="#e44f3c"/>
    `,
  }),
  kids: baseSvg({
    label: "Kids meal",
    accent: "#e19558",
    body: `
      <circle cx="546" cy="370" r="34" fill="#e44f3c"/><circle cx="672" cy="370" r="34" fill="#e44f3c"/>
      <path d="M510 440c62 52 154 52 216 0" fill="none" stroke="#7b4a34" stroke-width="16" stroke-linecap="round"/>
      <rect x="464" y="312" width="116" height="74" rx="28" fill="#f2c94c"/><rect x="642" y="312" width="116" height="74" rx="28" fill="#f2c94c"/>
      <circle cx="543" cy="393" r="12" fill="#fff8ec"/><circle cx="685" cy="393" r="12" fill="#fff8ec"/>
    `,
  }),
};

function restaurantSvg({ label, accent = "#b86a43", theme = "dining" }) {
  const extras =
    theme === "bar"
      ? `<rect x="290" y="432" width="620" height="82" rx="30" fill="#7b3f2f"/><circle cx="418" cy="340" r="42" fill="#f2c94c"/><circle cx="600" cy="340" r="42" fill="#f2c94c"/><circle cx="782" cy="340" r="42" fill="#f2c94c"/>`
      : theme === "cafe"
        ? `<rect x="334" y="456" width="436" height="58" rx="28" fill="#8a5a3f"/><rect x="502" y="314" width="208" height="132" rx="44" fill="#fff8ec" stroke="#7b4a34" stroke-width="13"/><path d="M710 346h42c38 0 38 66 0 66h-42" fill="none" stroke="#7b4a34" stroke-width="12"/>`
        : `<rect x="288" y="470" width="624" height="74" rx="34" fill="#6c4434"/><ellipse cx="600" cy="450" rx="196" ry="72" fill="#d0a06a"/><rect x="368" y="320" width="464" height="112" rx="44" fill="#fff8ec" opacity="0.86"/>`;

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="1400" height="900" viewBox="0 0 1400 900" role="img" aria-label="${esc(label)}">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#fff8ec"/>
      <stop offset="0.45" stop-color="#ead9bd"/>
      <stop offset="1" stop-color="${accent}"/>
    </linearGradient>
    <radialGradient id="lamp" cx="50%" cy="19%" r="54%">
      <stop offset="0" stop-color="#fff5cf" stop-opacity="0.92"/>
      <stop offset="1" stop-color="#fff5cf" stop-opacity="0"/>
    </radialGradient>
    <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="26" stdDeviation="30" flood-color="#2f211a" flood-opacity="0.24"/>
    </filter>
  </defs>
  <rect width="1400" height="900" fill="url(#bg)"/>
  <rect width="1400" height="900" fill="url(#lamp)"/>
  <g opacity="0.14" stroke="#5d3729" stroke-width="2">
    <path d="M0 150h1400M0 300h1400M0 450h1400M0 600h1400M0 750h1400"/>
    <path d="M160 0v900M320 0v900M480 0v900M640 0v900M800 0v900M960 0v900M1120 0v900M1280 0v900"/>
  </g>
  <g filter="url(#shadow)">
    <rect x="164" y="162" width="1072" height="520" rx="92" fill="#fffaf1" opacity="0.56"/>
    ${extras}
    <path d="M240 676c140-62 284-70 432-22 178 58 362 42 548-50" fill="none" stroke="#fff8ec" stroke-width="26" stroke-linecap="round" opacity="0.5"/>
  </g>
</svg>`;
}

const writes = [
  ["images/dish-fallback.svg", baseSvg({ label: "Dish placeholder", body: `<path d="M424 525h352" stroke="#7b4a34" stroke-width="18" stroke-linecap="round"/><path d="M442 300c64 174 253 173 316 0" fill="none" stroke="#7b4a34" stroke-width="18" stroke-linecap="round" opacity="0.42"/>` })],
  ["images/restaurant-fallback.svg", restaurantSvg({ label: "Restaurant placeholder", theme: "dining", accent: "#b86a43" })],
  ["images/restaurants/dining.svg", restaurantSvg({ label: "Dining room", theme: "dining", accent: "#b86a43" })],
  ["images/restaurants/cafe.svg", restaurantSvg({ label: "Cafe interior", theme: "cafe", accent: "#c8925d" })],
  ["images/restaurants/bar.svg", restaurantSvg({ label: "Bar interior", theme: "bar", accent: "#7b3f2f" })],
  ["images/restaurants/terrace.svg", restaurantSvg({ label: "Restaurant terrace", theme: "dining", accent: "#738e69" })],
  ...Object.entries(plate).map(([name, svg]) => [`images/menu/${name}.svg`, svg]),
];

await Promise.all(writes.map(([file, svg]) => writeAsset(file, svg)));
console.log(`Generated ${writes.length} content assets.`);
