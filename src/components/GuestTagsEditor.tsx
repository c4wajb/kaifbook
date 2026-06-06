"use client";

import { Pencil, Plus, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";

const SUGGESTED_TAGS = [
  "VIP",
  "постоянный",
  "повторный",
  "no-show risk",
  "банкет",
  "день рождения",
  "деловая встреча",
  "любит окно",
  "аллергия",
  "проблемный гость",
  "предпочитает тихий стол",
  "предпочитает окно",
];

type Props = {
  restaurantId: string;
  guestId: string;
  guestName: string;
  guestPhone: string;
  initialTags: string[];
  compact?: boolean;
};

function uniqTags(tags: string[]) {
  const seen = new Set<string>();
  return tags
    .map((tag) => tag.trim())
    .filter(Boolean)
    .filter((tag) => {
      const key = tag.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
}

export function GuestTagsEditor({ restaurantId, guestId, guestName, guestPhone, initialTags, compact = false }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [tags, setTags] = useState(() => uniqTags(initialTags));
  const [customTag, setCustomTag] = useState("");
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();

  const allOptions = useMemo(() => uniqTags([...SUGGESTED_TAGS, ...tags]), [tags]);

  function toggleTag(tag: string) {
    setTags((current) => current.some((item) => item.toLowerCase() === tag.toLowerCase()) ? current.filter((item) => item.toLowerCase() !== tag.toLowerCase()) : [...current, tag]);
  }

  function addCustomTag() {
    const next = customTag.trim();
    if (!next) return;
    setTags((current) => uniqTags([...current, next]));
    setCustomTag("");
  }

  function save() {
    setError("");
    startTransition(() => {
      void (async () => {
        const response = await fetch(`/api/owner/restaurants/${restaurantId}/guests/${guestId}/tags`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ tags }),
        });
        if (!response.ok) {
          setError("Не удалось сохранить теги. Попробуйте еще раз.");
          return;
        }
        setOpen(false);
        router.refresh();
      })();
    });
  }

  return (
    <>
      <button className={compact ? "tag-edit-button compact" : "tag-edit-button"} type="button" onClick={() => setOpen(true)}>
        <Pencil size={14} aria-hidden />
        {compact ? "Теги" : "Изменить"}
      </button>

      {open ? (
        <div className="modal-backdrop" role="presentation" onMouseDown={(event) => {
          if (event.target === event.currentTarget) setOpen(false);
        }}>
          <section className="tag-editor-modal" role="dialog" aria-modal="true" aria-labelledby={`tag-editor-${guestId}`}>
            <div className="tag-editor-head">
              <div>
                <p className="eyebrow">Редактирование гостя</p>
                <h2 id={`tag-editor-${guestId}`}>{guestName}</h2>
                <p>{guestPhone}</p>
              </div>
              <button className="modal-close" type="button" onClick={() => setOpen(false)} aria-label="Закрыть">
                <X size={18} aria-hidden />
              </button>
            </div>

            <div className="tag-checkbox-grid">
              {allOptions.map((tag) => {
                const checked = tags.some((item) => item.toLowerCase() === tag.toLowerCase());
                return (
                  <label className="tag-checkbox" key={tag}>
                    <input type="checkbox" checked={checked} onChange={() => toggleTag(tag)} />
                    <span>{tag}</span>
                  </label>
                );
              })}
            </div>

            <div className="custom-tag-row">
              <input value={customTag} onChange={(event) => setCustomTag(event.target.value)} placeholder="Добавить свой тег" />
              <button className="small-button icon-text" type="button" onClick={addCustomTag}>
                <Plus size={14} aria-hidden />Добавить
              </button>
            </div>

            {error ? <p className="form-error">{error}</p> : null}

            <div className="modal-actions">
              <button className="button" type="button" onClick={save} disabled={pending}>
                {pending ? "Сохранение..." : "Сохранить"}
              </button>
              <button className="small-button" type="button" onClick={() => setOpen(false)}>
                Отмена
              </button>
            </div>
          </section>
        </div>
      ) : null}
    </>
  );
}
