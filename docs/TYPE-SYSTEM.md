# TYPE-SYSTEM — типографическая дизайн-система Kaifbook

Заменяет прежний Playfair-сетап (см. `FONTS-CHANGES.md` — исторический).
Пара **A**: **Unbounded** (дисплей/логотип/заголовки) + **Golos Text**
(интерфейс/текст). Решает проблему слипания «fb» в логотипе и конфликт
тонкого serif с квадратной маркой «KB» — сервису ближе уверенный гротеск.

## Роли и токены (единственное место — `globals.css :root`)

```css
--font-display : Unbounded  — логотип + заголовки (h1–h3, hero, секции)
--font-text    : Golos Text — интерфейс, body, кнопки, мелкие лейблы
--font-mono    : системный моно
/* legacy-алиасы → роли (чтобы старые правила не трогать): */
--font-serif → --font-display     --font-sans → --font-text
/* тюнинг дисплея (Unbounded широкий): */
--tracking-display : -.02em   --tracking-tight : -.01em   --weight-display : 680
```

Шрифты грузит `next/font` в `layout.tsx` (`Unbounded` → `--font-unbounded`,
`Golos_Text` → `--font-golos`, оба `subsets:["latin","cyrillic"]`,
`display:"swap"`). Контентные правила используют **только** роли/алиасы.

## Правила применения

- **Дисплей (Unbounded):** логотип, `h1–h3`, hero-заголовки, заголовки секций.
  Базовое правило заголовков задаёт `font-family/weight/tracking` через токены.
- **Текст (Golos):** весь UI, абзацы, кнопки, бейджи, мелкие лейблы.
- **Мелкие цифры в кружках** (шаги степпера и т.п.) — **всегда `--font-text`**:
  широкие дисплейные цифры садятся не по центру маленького круга
  (правило `.booking-stepper-num` и соседи, `!important`).
- **Перенос:** у заголовков `overflow-wrap:break-word` — Unbounded широкий,
  длинные названия переносятся, а не уезжают за край на телефоне.

## Адаптив (важно для Unbounded)

Unbounded заметно шире Playfair, поэтому крупные заголовки уменьшены на
мобильных. Hero-`h1` и баннер-`h2` имеют один авторитетный оверрайд размеров
в конце `globals.css` (`@media ≤720` и `≤430`), перебивающий старые
дублирующие `!important`-правила. Если правишь размер hero/баннера на мобиле —
правь там, а не в разбросанных дубликатах.

## Как проверить

1. `grep -n "font-family:" globals.css` → только `var(--font-display|text|serif|sans|mono)`.
2. Прямых `Playfair`/`--font-playfair` в `src/` нет (только историч. упоминания
   в комментах/доках).
3. На **390 / 768 / 1440**: логотип «Kaifbook» без слипания «fb»; заголовки —
   Unbounded; текст — Golos; на 390 hero/баннер не уезжают за край.

## Откат

Вернуть `Unbounded` → `Playfair_Display` в `layout.tsx` и переменную
`--font-unbounded` → `--font-playfair`; в `:root` `--font-display` снова на
Playfair с serif-фолбэком. Остальное (токены, overflow-wrap, мобильные
размеры) — безвредно при любом дисплейном шрифте.
