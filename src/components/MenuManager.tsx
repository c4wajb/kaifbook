"use client";

import { Eye, EyeOff, ImageIcon, Pencil, Plus, Search, Trash2, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { FormEvent, startTransition, useState } from "react";

import { ImageUploadField } from "@/components/ImageUploadField";
import { formatMoney } from "@/lib/format";

type MenuItem = {
  id: string;
  categoryId?: string | null;
  title: string;
  description: string;
  price: number;
  weight: string | null;
  photoUrl: string | null;
  isAvailable: boolean;
  sortOrder?: number;
};

type MenuCategory = {
  id: string;
  title: string;
  sortOrder: number;
  isActive: boolean;
  items: MenuItem[];
};

const WEIGHT_UNITS = ["г", "кг", "мл", "л", "шт", "порция"] as const;

function keepNumericInput(event: FormEvent<HTMLInputElement>) {
  event.currentTarget.value = event.currentTarget.value
    .replace(",", ".")
    .replace(/[^\d.]/g, "")
    .replace(/(\..*)\./g, "$1")
    .slice(0, 8);
}

function normalizeNumber(value: FormDataEntryValue | null) {
  return String(value || "").replace(",", ".").replace(/[^\d.]/g, "");
}

function parseWeight(weight: string | null | undefined) {
  const match = String(weight || "").trim().match(/^(\d+(?:[.,]\d+)?)\s*(.+)?$/);
  const unit = match?.[2]?.trim();
  return {
    value: match?.[1]?.replace(",", ".") || "",
    unit: WEIGHT_UNITS.includes(unit as (typeof WEIGHT_UNITS)[number]) ? unit || "г" : "г",
  };
}

function weightFromForm(form: FormData) {
  const weightValue = normalizeNumber(form.get("weightValue"));
  const weightUnit = String(form.get("weightUnit") || "г");
  return weightValue ? `${weightValue} ${weightUnit}` : "";
}

function menuPayloadFromForm(form: FormData, fallbackSortOrder = 0) {
  return {
    categoryId: String(form.get("categoryId") || ""),
    title: String(form.get("title") || "").trim(),
    description: String(form.get("description") || "").trim(),
    price: Number(normalizeNumber(form.get("price")) || 0),
    weight: weightFromForm(form),
    photoUrl: String(form.get("photoUrl") || "").trim(),
    sortOrder: Number(normalizeNumber(form.get("sortOrder")) || fallbackSortOrder),
    isAvailable: form.get("isAvailable") === "on",
  };
}

function validateMenuPayload(payload: ReturnType<typeof menuPayloadFromForm>) {
  if (!payload.title) return "Введите название блюда.";
  if (!payload.categoryId) return "Выберите категорию.";
  if (!Number.isFinite(payload.price) || payload.price < 0) return "Цена не может быть отрицательной.";
  return null;
}

export function MenuManager({
  restaurantId,
  categories,
}: {
  restaurantId: string;
  categories: MenuCategory[];
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, setPending] = useState<string | null>(null);
  const [itemFormKey, setItemFormKey] = useState(0);
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
  const [availOverrides, setAvailOverrides] = useState<Record<string, boolean>>({});
  const [search, setSearch] = useState("");

  async function submitCategory(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setMessage(null);
    setPending("category");

    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const response = await fetch(`/api/restaurants/${restaurantId}/menu-categories`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: String(form.get("title") || ""),
        sortOrder: categories.length,
        isActive: true,
      }),
    });

    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      setError(data.error || "Не удалось добавить категорию.");
    } else {
      formElement.reset();
      setItemFormKey((value) => value + 1);
      setMessage("Категория добавлена.");
      router.refresh();
    }

    setPending(null);
  }

  async function submitItem(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setMessage(null);

    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const payload = menuPayloadFromForm(form, 0);
    const validationError = validateMenuPayload(payload);

    if (validationError) {
      setError(validationError);
      return;
    }

    setPending("item");
    const response = await fetch(`/api/restaurants/${restaurantId}/menu-items`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      setError(data.error || "Не удалось добавить блюдо.");
    } else {
      formElement.reset();
      setItemFormKey((value) => value + 1);
      setMessage("Блюдо добавлено.");
      router.refresh();
    }

    setPending(null);
  }

  async function submitEditItem(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editingItem) return;
    setError(null);
    setMessage(null);

    const form = new FormData(event.currentTarget);
    const payload = menuPayloadFromForm(form, editingItem.sortOrder ?? 0);
    const validationError = validateMenuPayload(payload);

    if (validationError) {
      setError(validationError);
      return;
    }

    setPending(`edit-${editingItem.id}`);
    const response = await fetch(`/api/menu-items/${editingItem.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      setError(data.error || "Не удалось сохранить блюдо. Попробуйте еще раз.");
    } else {
      setEditingItem(null);
      setMessage("Блюдо обновлено.");
      router.refresh();
    }

    setPending(null);
  }

  async function hide(endpoint: string, label = "эту позицию") {
    if (!window.confirm(`Удалить ${label}? Позиция пропадет с сайта.`)) return;
    setError(null);
    setMessage(null);
    setPending(endpoint);
    const response = await fetch(endpoint, { method: "DELETE" });
    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      setError(data.error || "Не удалось удалить позицию.");
    } else {
      setMessage("Позиция удалена.");
      router.refresh();
    }
    setPending(null);
  }

  function getAvail(item: MenuItem) {
    return item.id in availOverrides ? availOverrides[item.id] : item.isAvailable;
  }

  async function toggleAvailability(item: MenuItem) {
    const current = getAvail(item);
    const next = !current;
    setAvailOverrides((prev) => ({ ...prev, [item.id]: next }));
    setError(null);
    const response = await fetch(`/api/menu-items/${item.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isAvailable: next }),
    });
    if (!response.ok) {
      setAvailOverrides((prev) => ({ ...prev, [item.id]: current }));
      const data = await response.json().catch(() => ({}));
      setError(data.error || "Не удалось обновить блюдо.");
    } else {
      startTransition(() => router.refresh());
    }
  }

  const hasMenuItems = categories.some((category) => category.items.length > 0);

  // Client-side search over the menu so owners with long menus can jump to a
  // dish instead of scrolling. Matches dish title/description, or shows the
  // whole category when its name matches.
  const query = search.trim().toLowerCase();
  const visibleCategories = query
    ? categories
        .map((category) => {
          const categoryMatches = category.title.toLowerCase().includes(query);
          const items = categoryMatches
            ? category.items
            : category.items.filter(
                (item) =>
                  item.title.toLowerCase().includes(query) ||
                  (item.description || "").toLowerCase().includes(query),
              );
          return { ...category, items };
        })
        .filter((category) => category.items.length > 0)
    : categories;
  const foundCount = visibleCategories.reduce((sum, category) => sum + category.items.length, 0);

  return (
    <div className="grid-layout two-columns menu-manager">
      <section className="panel menu-category-panel">
        <h2>Категории</h2>
        <form className="category-create-form" onSubmit={submitCategory}>
          <input name="title" placeholder="Например, закуски" required />
          <button
            className="button icon-text menu-add-category-button"
            type="submit"
            disabled={pending === "category"}
          >
            <Plus size={18} aria-hidden />
            Добавить
          </button>
        </form>
        <div className="stack-list">
          {categories.map((category) => (
            <div className="list-row" key={category.id}>
              <span>{category.title}</span>
              <button
                className="icon-button"
                type="button"
                onClick={() => hide(`/api/menu-categories/${category.id}`, `категорию «${category.title}»`)}
                aria-label={`Скрыть категорию ${category.title}`}
                title="Скрыть категорию"
              >
                <Trash2 size={16} aria-hidden />
              </button>
            </div>
          ))}
        </div>
      </section>

      <section className="panel">
        <h2>Добавить блюдо</h2>
        <form className="stack-form" onSubmit={submitItem}>
          <label>
            <span>Категория</span>
            <select name="categoryId" required>
              <option value="">Выберите категорию</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.title}
                </option>
              ))}
            </select>
          </label>

          <label>
            <span>Название</span>
            <input name="title" required />
          </label>

          <label>
            <span>Описание</span>
            <textarea name="description" rows={3} />
          </label>

          <div className="form-grid two">
            <label>
              <span>Цена</span>
              <input name="price" type="text" inputMode="decimal" min="0" onInput={keepNumericInput} required />
            </label>
            <label>
              <span>Порция / вес</span>
              <div className="weight-field">
                <input
                  name="weightValue"
                  type="text"
                  inputMode="decimal"
                  placeholder="250"
                  onInput={keepNumericInput}
                  aria-label="Порция или вес блюда числом"
                />
                <select name="weightUnit" defaultValue="г" aria-label="Единица измерения">
                  {WEIGHT_UNITS.map((unit) => (
                    <option key={unit} value={unit}>
                      {unit}
                    </option>
                  ))}
                </select>
              </div>
            </label>
          </div>

          <ImageUploadField key={itemFormKey} restaurantId={restaurantId} name="photoUrl" label="Фото блюда" compact />

          <input type="hidden" name="isAvailable" value="on" />

          <button className="button icon-text" type="submit" disabled={pending === "item"}>
            <Plus size={17} aria-hidden />
            Добавить блюдо
          </button>
        </form>
      </section>

      <section className="panel full-span menu-site-panel">
        <div className="section-heading compact-heading">
          <div>
            <h2>Меню на сайте</h2>
            <p>Блюда сгруппированы по категориям и отображаются гостям на странице ресторана.</p>
          </div>
          {hasMenuItems ? (
            <div className="menu-search">
              <Search size={16} aria-hidden />
              <input
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Поиск по блюдам"
                aria-label="Поиск по блюдам"
              />
              {search ? (
                <button
                  type="button"
                  className="menu-search-clear"
                  onClick={() => setSearch("")}
                  aria-label="Очистить поиск"
                  title="Очистить"
                >
                  <X size={15} aria-hidden />
                </button>
              ) : null}
            </div>
          ) : null}
        </div>
        {query ? (
          <p className="menu-search-count">
            {foundCount > 0 ? `Найдено: ${foundCount}` : "Ничего не найдено"}
          </p>
        ) : null}
        {error ? <p className="form-error">{error}</p> : null}
        {message ? <p className="form-success">{message}</p> : null}

        {!hasMenuItems ? (
          <div className="empty-state menu-empty-state">
            <h3>Меню пока не добавлено</h3>
            <p>Добавьте первые позиции, чтобы гости могли посмотреть блюда ресторана.</p>
          </div>
        ) : visibleCategories.length === 0 ? (
          <div className="empty-state menu-search-empty">
            <h3>Ничего не найдено</h3>
            <p>По запросу «{search.trim()}» блюд не найдено. Попробуйте другое название.</p>
          </div>
        ) : (
          <div className="menu-preview">
            {visibleCategories.map((category) => (
              <section className="owner-menu-category" key={category.id}>
                <h3>{category.title}</h3>
                {category.items.length === 0 ? (
                  <p className="menu-category-empty">В этой категории пока нет блюд.</p>
                ) : (
                  <div className="owner-menu-items">
                    {category.items.map((item) => {
                      const avail = getAvail(item);
                      return (
                      <article className={`menu-item-row owner-menu-item-row ${!avail ? "menu-item-stopped" : ""}`} key={item.id}>
                        <div className="menu-item-image-wrap">
                          {item.photoUrl ? (
                            <img className="menu-item-thumb" src={item.photoUrl} alt={`Фото блюда ${item.title}`} />
                          ) : (
                            <div className="menu-item-thumb menu-item-placeholder" aria-hidden>
                              <ImageIcon size={22} />
                            </div>
                          )}
                        </div>
                        <div className="menu-item-content">
                          <strong className="menu-item-title">{item.title}</strong>
                          {item.description ? <p className="menu-item-description">{item.description}</p> : null}
                          {item.weight ? <small className="menu-item-portion">{item.weight}</small> : null}
                        </div>
                        <strong className="menu-item-price">{formatMoney(item.price)}</strong>
                        <div className="menu-item-actions">
                          <button
                            className={`icon-button ${avail ? "stop-list-on" : "stop-list-off"}`}
                            type="button"
                            onClick={() => toggleAvailability(item)}
                            aria-label={avail ? "Убрать в стоп-лист" : "Вернуть в меню"}
                            title={avail ? "Убрать в стоп-лист" : "Вернуть в меню"}
                          >
                            {avail ? <Eye size={16} aria-hidden /> : <EyeOff size={16} aria-hidden />}
                          </button>
                          <button
                            className="icon-button"
                            type="button"
                            onClick={() => setEditingItem(item)}
                            aria-label={`Редактировать блюдо ${item.title}`}
                            title="Редактировать блюдо"
                          >
                            <Pencil size={16} aria-hidden />
                          </button>
                          <button
                            className="icon-button danger"
                            type="button"
                            onClick={() => hide(`/api/menu-items/${item.id}`, `блюдо «${item.title}»`)}
                            disabled={pending === `/api/menu-items/${item.id}`}
                            aria-label={`Удалить блюдо ${item.title}`}
                            title="Удалить блюдо"
                          >
                            <Trash2 size={16} aria-hidden />
                          </button>
                        </div>
                      </article>
                      );
                    })}
                  </div>
                )}
              </section>
            ))}
          </div>
        )}
      </section>

      {editingItem ? (
        <div
          className="modal-backdrop"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setEditingItem(null);
          }}
        >
          <section className="menu-item-edit-modal" role="dialog" aria-modal="true" aria-labelledby="menu-item-edit-title">
            <div className="modal-head">
              <div>
                <p className="eyebrow">Меню ресторана</p>
                <h2 id="menu-item-edit-title">Редактирование блюда</h2>
              </div>
              <button className="modal-close" type="button" onClick={() => setEditingItem(null)} aria-label="Закрыть">
                <X size={18} aria-hidden />
              </button>
            </div>

            <form className="stack-form" onSubmit={submitEditItem}>
              <label>
                <span>Категория</span>
                <select name="categoryId" defaultValue={editingItem.categoryId || ""} required>
                  <option value="">Выберите категорию</option>
                  {categories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.title}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                <span>Название</span>
                <input name="title" defaultValue={editingItem.title} required />
              </label>

              <label>
                <span>Описание</span>
                <textarea name="description" rows={4} defaultValue={editingItem.description || ""} />
              </label>

              <div className="form-grid two">
                <label>
                  <span>Цена</span>
                  <input
                    name="price"
                    type="text"
                    inputMode="decimal"
                    min="0"
                    defaultValue={editingItem.price}
                    onInput={keepNumericInput}
                    required
                  />
                </label>
                <label>
                  <span>Порция / вес</span>
                  <div className="weight-field">
                    <input
                      name="weightValue"
                      type="text"
                      inputMode="decimal"
                      placeholder="250"
                      defaultValue={parseWeight(editingItem.weight).value}
                      onInput={keepNumericInput}
                      aria-label="Порция или вес блюда числом"
                    />
                    <select name="weightUnit" defaultValue={parseWeight(editingItem.weight).unit} aria-label="Единица измерения">
                      {WEIGHT_UNITS.map((unit) => (
                        <option key={unit} value={unit}>
                          {unit}
                        </option>
                      ))}
                    </select>
                  </div>
                </label>
              </div>

              <label>
                <span>Порядок отображения</span>
                <input
                  name="sortOrder"
                  type="text"
                  inputMode="numeric"
                  defaultValue={editingItem.sortOrder ?? 0}
                  onInput={keepNumericInput}
                />
              </label>

              <ImageUploadField
                key={editingItem.id}
                restaurantId={restaurantId}
                name="photoUrl"
                label="Фото блюда"
                value={editingItem.photoUrl}
                compact
              />

              <label className="check-row menu-availability-row">
                <input name="isAvailable" type="checkbox" defaultChecked={editingItem.isAvailable} />
                Активно на сайте
              </label>

              {error ? <p className="form-error">{error}</p> : null}
              <div className="modal-actions">
                <button className="secondary-button" type="button" onClick={() => setEditingItem(null)}>
                  Отмена
                </button>
                <button className="button" type="submit" disabled={pending === `edit-${editingItem.id}`}>
                  Сохранить
                </button>
              </div>
            </form>
          </section>
        </div>
      ) : null}
    </div>
  );
}
