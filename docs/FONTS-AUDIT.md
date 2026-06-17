# FONTS-AUDIT — типографика Stolix / Kaifbook

## Было (разнобой)
В `globals.css` намешано ≥4 конкурирующих стека и частью пустые переменные:
- `body` → `Arial, Helvetica, sans-serif`.
- Текст/интерфейс → местами `Inter, Manrope, ui-sans-serif, …`, местами `Arial`,
  `Roboto`.
- Заголовки → местами `var(--font-serif, Georgia, serif)`, местами прямой
  `Georgia, "Times New Roman", serif`, местами `Inter`.
- Переменные: `--font-serif`, `--font-sans` (раньше задавались прямо из
  `next/font`), плюс осиротевшие `--font-heading` (не встречалась в итоге) и
  `--display-font` (одно использование на `.owner-menu-category h3`, фолбэк
  `inherit`).
- Моноширинный — три прямых объявления (`ui-monospace,…` ×2 и голый `monospace`).
- Итого ~30 объявлений `font-family`, один и тот же по смыслу элемент мог
  рендериться разным шрифтом на разных страницах.

## Единый словарь переменных (решение)
Сводим к **трём** переменным, определённым ОДИН раз в `:root`:

| Переменная | Значение | Назначение |
|---|---|---|
| `--font-serif` | `var(--font-playfair), Georgia, serif` | Заголовки / витрины (Playfair Display) |
| `--font-sans` | `var(--font-golos), system-ui, -apple-system, "Segoe UI", sans-serif` | Текст и интерфейс (Golos Text) |
| `--font-mono` | `ui-monospace, SFMono-Regular, Menlo, monospace` | Код, ID, slug, моно-телефоны |

`--font-playfair` / `--font-golos` приходят из `next/font/google` (layout.tsx,
`subsets: ["latin","cyrillic"]`). Осиротевшие `--font-heading` / `--display-font`
схлопнуты в `--font-serif`. Контентные правила используют **только** `var(--font-*)`
— прямых `Arial/Inter/Manrope/Roboto/Georgia/Times` в правилах не остаётся
(`Georgia` живёт только как фолбэк внутри определения `--font-serif`).

## Про веса
Подключены **вариативные** шрифты (без перечисления статических весов):
- Заголовки используют `font-weight: 760` (база `h1,h2,h3…`). Статический набор
  `600/700/800` округлил бы 760→800 (тяжелее) — это визуальное изменение.
  Вариативный Playfair рендерит 760 точно. Golos Text аналогично покрывает
  400–700 без округления.
- Перформанс: вариативные = по одному woff2 на подсет (8 файлов на 2 семейства ×
  latin/cyrillic), запросов не больше, чем у набора статических инстансов.
- Если предпочтительнее статические веса — переключение тривиально (добавить
  `weight: [...]` в `next/font` и заменить 760→700 в базовом правиле заголовков).
