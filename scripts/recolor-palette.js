/* recolor-palette.js — Re-theme hardcoded colors to the new olive/platinum palette.
 *
 * Strategy: preserve each color's perceptual LIGHTNESS (so every contrast and
 * elevation relationship in the UI survives), shift warm browns / terracotta /
 * cream / gold onto the palette's olive hue, and leave semantic greens, reds,
 * blues, and purples alone so status/category colors keep their meaning.
 *
 * Palette anchors: Pine Tree #2b2c25 · Black Olive #3e3a37 · Axolotl #71705c · Platinum #eae9e6
 *
 * Usage:
 *   node scripts/recolor-palette.js            # dry run — prints the mapping
 *   node scripts/recolor-palette.js --write    # apply in place
 */
const fs = require("fs");
const path = require("path");

const WRITE = process.argv.includes("--write");
const ROOT = path.resolve(__dirname, "..");

// ---------- color math ----------
const clamp = (x, lo, hi) => Math.min(hi, Math.max(lo, x));

function rgbToHsl(r, g, b) {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0; const l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      default: h = (r - g) / d + 4; break;
    }
    h /= 6;
  }
  return [h * 360, s, l];
}
function hue2rgb(p, q, t) {
  if (t < 0) t += 1;
  if (t > 1) t -= 1;
  if (t < 1 / 6) return p + (q - p) * 6 * t;
  if (t < 1 / 2) return q;
  if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
  return p;
}
function hslToRgb(h, s, l) {
  h = ((h % 360) + 360) % 360 / 360;
  let r, g, b;
  if (s === 0) { r = g = b = l; }
  else {
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r = hue2rgb(p, q, h + 1 / 3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1 / 3);
  }
  return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)];
}
const toHex = (r, g, b) =>
  "#" + [r, g, b].map((x) => clamp(x, 0, 255).toString(16).padStart(2, "0")).join("");

// ---------- the recolor decision ----------
const OLIVE_HUE = 52; // hue of the new earthy/olive family (between Black Olive & Axolotl)

function recolor(r, g, b) {
  const [h, s, l] = rgbToHsl(r, g, b);

  // Pure-ish neutral greys -> faint platinum-olive grey (white/black stay put: l==1/0).
  if (s < 0.06) return hslToRgb(46, Math.min(s + 0.015, 0.05), l);

  // Keep semantic families so status & category colors stay meaningful:
  if (h >= 78 && h <= 175) return [r, g, b];   // greens / sage  (success, editor markers)
  if (h > 175 && h <= 320) return [r, g, b];   // teal / blue / purple (info, categories)
  if (h < 12 || h > 345) return [r, g, b];     // reds (danger)

  // Everything warm (browns, terracotta, gold, amber, orange) -> olive, lightness kept.
  const newS = clamp(s * 0.5, 0.04, 0.16);
  return hslToRgb(OLIVE_HUE, newS, l);
}

// ---------- token replacement ----------
const HEX_RE = /(?<![\w&#])#([0-9a-fA-F]{6}|[0-9a-fA-F]{3})(?![0-9a-fA-F])/g;
const RGB_RE = /rgba?\(([^)]+)\)/gi;

const tally = new Map(); // old -> {to, n}
function note(from, to) {
  const k = from + " -> " + to;
  tally.set(k, (tally.get(k) || 0) + 1);
}

function transform(src) {
  let out = src.replace(HEX_RE, (m, hex) => {
    const low = hex.toLowerCase();
    if (low === "fff" || low === "ffffff" || low === "000" || low === "000000") return m;
    let r, g, b;
    if (hex.length === 3) {
      r = parseInt(hex[0] + hex[0], 16);
      g = parseInt(hex[1] + hex[1], 16);
      b = parseInt(hex[2] + hex[2], 16);
    } else {
      r = parseInt(hex.slice(0, 2), 16);
      g = parseInt(hex.slice(2, 4), 16);
      b = parseInt(hex.slice(4, 6), 16);
    }
    const nx = toHex(...recolor(r, g, b));
    if (nx === "#" + low || nx === m.toLowerCase()) return m;
    note(m, nx);
    return nx;
  });

  out = out.replace(RGB_RE, (m, inner) => {
    const parts = inner.split(",").map((s) => s.trim());
    if (parts.length < 3) return m;
    const r = parseFloat(parts[0]), g = parseFloat(parts[1]), b = parseFloat(parts[2]);
    if ([r, g, b].some((n) => Number.isNaN(n))) return m;
    const [nr, ng, nb] = recolor(r, g, b);
    if (nr === Math.round(r) && ng === Math.round(g) && nb === Math.round(b)) return m;
    const alpha = parts[3];
    const next = alpha !== undefined
      ? `rgba(${nr}, ${ng}, ${nb}, ${alpha})`
      : `rgb(${nr}, ${ng}, ${nb})`;
    note(m, next);
    return next;
  });

  return out;
}

// ---------- file collection ----------
function walk(dir, acc) {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) {
      if (ent.name === "node_modules" || ent.name === ".next") continue;
      walk(p, acc);
    } else acc.push(p);
  }
  return acc;
}

const files = [];
// CSS modules, except the hand-authored foundation (variables.css)
for (const f of fs.readdirSync(path.join(ROOT, "src/styles"))) {
  if (f.endsWith(".css") && f !== "variables.css") files.push(path.join(ROOT, "src/styles", f));
}
// inline colors in components / routes
for (const f of walk(path.join(ROOT, "src"), [])) {
  if (/\.(tsx|ts)$/.test(f)) files.push(f);
}

let changedFiles = 0;
for (const f of files) {
  const src = fs.readFileSync(f, "utf8");
  const out = transform(src);
  if (out !== src) {
    changedFiles++;
    if (WRITE) fs.writeFileSync(f, out);
  }
}

// ---------- report ----------
const rows = [...tally.entries()].sort((a, b) => b[1] - a[1]);
console.log(`${WRITE ? "WROTE" : "DRY RUN"} — ${rows.length} distinct color mappings, ${changedFiles} files affected\n`);
for (const [k, n] of rows) console.log(String(n).padStart(4), k);
