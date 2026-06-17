# FONTS-CHANGES — унификация типографики

Сведено к **двум гарнитурам + системный моно**, через `next/font`, единым
словарём CSS-переменных. Размеры/межстрочные/отступы/цвета не трогались —
только семейства шрифтов. `npm run build` — зелёный.

## Что изменилось
- **`src/app/layout.tsx`:** `next/font/google` грузит `Playfair_Display`
  (→ `--font-playfair`) и `Golos_Text` (→ `--font-golos`), оба
  `subsets: ["latin","cyrillic"]`, `display:"swap"`, переменные вешаются на
  `<html>`. (Вариативные — точные веса, кириллица, 8 woff2.)
- **`globals.css` `:root`:** добавлен словарь —
  `--font-serif: var(--font-playfair), Georgia, serif`,
  `--font-sans: var(--font-golos), system-ui, -apple-system, "Segoe UI", sans-serif`,
  `--font-mono: ui-monospace, SFMono-Regular, Menlo, monospace`.
- **`body` → `var(--font-sans)`.**
- **Сквозная замена контентных правил** на `var(--font-serif|sans|mono)`:
  - `Arial / Inter / Manrope / Roboto`-стеки → `var(--font-sans)`;
  - `Georgia / "Times New Roman"` и `var(--font-serif, …)` → `var(--font-serif)`;
  - `ui-monospace,…` и голый `monospace` → `var(--font-mono)`;
  - осиротевший `var(--display-font, inherit)` (`.owner-menu-category h3`) →
    `var(--font-serif)`.

## Удалено / больше не встречается
В `globals.css` **нет** прямых `Arial`, `Inter`, `Manrope`, `Roboto`, `Times`;
единственный `Georgia` — фолбэк внутри определения `--font-serif` в `:root`
(разрешённое место). Осиротевшие `--font-heading` / `--display-font` устранены.

## Осталось ровно
`--font-serif` (Playfair), `--font-sans` (Golos), `--font-mono` (системный) —
определены один раз в `:root`. Контентные правила используют только их.

## Как проверить
1. `grep -nE "Arial|Inter|Manrope|Roboto|Georgia|Times" src/app/globals.css` →
   единственное совпадение `Georgia` в `:root` (`--font-serif`). Других нет.
2. `grep -n "font-family:" src/app/globals.css` → только `var(--font-serif|sans|mono)`
   или `inherit`.
3. На **360 / 768 / 1440** и в VK Mini пройти: главная, каталог, профиль
   ресторана, форма брони, кабинет, админка — текст единым сансом (Golos),
   крупные заголовки — serif (Playfair), без «прыжков» шрифта между экранами.
   Мелкие UI-числа/бейджи/метки — sans (не Playfair).

## Заметка про веса
Использованы вариативные шрифты, чтобы сохранить точные веса (в частности
`font-weight:760` у базовых заголовков) без округления и визуального сдвига. Для
перехода на статический набор `Playfair 600/700/800` + `Golos 400/500/600/700`:
добавить `weight:[…]` в `next/font` и заменить `760→700` в базовом правиле
`h1,h2,h3…` (это уже допускает правило «font-weight при необходимости»).
