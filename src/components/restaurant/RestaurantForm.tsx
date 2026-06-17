"use client";

import { Save } from "lucide-react";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

import { ImageGalleryUploadField, ImageUploadField } from "@/components/ui/ImageUploadField";
import { RESTAURANT_STATUSES } from "@/lib/constants";
import { listToText, parseStringList } from "@/lib/json-fields";

type RestaurantFormData = {
  id: string;
  title: string;
  slug: string;
  description: string;
  shortDescription: string;
  city: string;
  address: string;
  phone: string;
  email: string;
  website?: string | null;
  averageCheck: number;
  cuisineTypes: string;
  features: string;
  mainPhotoUrl: string | null;
  galleryPhotos: string;
  status?: string;
  isActive?: boolean;
};

function publicationValue(restaurant?: RestaurantFormData) {
  if (!restaurant) return "draft";
  if (!restaurant.isActive) return "hidden";
  return restaurant.status === RESTAURANT_STATUSES.APPROVED ? "published" : "draft";
}

function publicationToPayload(value: string) {
  if (value === "published") return { status: RESTAURANT_STATUSES.APPROVED, isActive: true };
  if (value === "hidden") return { status: RESTAURANT_STATUSES.APPROVED, isActive: false };
  return { status: RESTAURANT_STATUSES.PENDING, isActive: true };
}

export function RestaurantForm({ restaurant }: { restaurant?: RestaurantFormData }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const isEdit = Boolean(restaurant);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);
    setSuccess(null);

    const form = new FormData(event.currentTarget);
    const publication = publicationToPayload(String(form.get("publicationStatus") || "draft"));
    const payload = {
      title: String(form.get("title") || ""),
      slug: String(form.get("slug") || ""),
      shortDescription: String(form.get("shortDescription") || ""),
      description: String(form.get("description") || ""),
      city: String(form.get("city") || ""),
      address: String(form.get("address") || ""),
      phone: String(form.get("phone") || ""),
      email: String(form.get("email") || ""),
      website: String(form.get("website") || ""),
      averageCheck: Number(form.get("averageCheck") || 0),
      cuisineTypes: String(form.get("cuisineTypes") || ""),
      features: String(form.get("features") || ""),
      mainPhotoUrl: String(form.get("mainPhotoUrl") || ""),
      galleryPhotos: String(form.get("galleryPhotos") || ""),
      ...publication,
    };

    const response = await fetch(isEdit ? `/api/restaurants/${restaurant?.id}` : "/api/restaurants", {
      method: isEdit ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      setError(data.error || "Не удалось сохранить ресторан.");
      setPending(false);
      return;
    }

    setPending(false);
    setSuccess("Информация о ресторане сохранена.");
    router.replace(`/owner/restaurants/${data.restaurant.id}/edit`);
    router.refresh();
  }

  return (
    <form className="panel wide-form" onSubmit={submit}>
      <div className="section-heading">
        <div>
          <p className="eyebrow">Описание и публикация</p>
          <h2>Редактировать ресторан</h2>
        </div>
      </div>

      <div className="form-grid two">
        <label>
          <span>Название</span>
          <input name="title" defaultValue={restaurant?.title || ""} required />
        </label>
        <label>
          <span>Slug</span>
          <input name="slug" defaultValue={restaurant?.slug || ""} />
        </label>
        <label>
          <span>Город</span>
          <input name="city" defaultValue={restaurant?.city || "Курск"} required />
        </label>
        <label>
          <span>Адрес</span>
          <input name="address" defaultValue={restaurant?.address || ""} required />
        </label>
        <label>
          <span>Телефон</span>
          <input name="phone" defaultValue={restaurant?.phone || ""} required />
        </label>
        <label>
          <span>Email</span>
          <input name="email" type="email" defaultValue={restaurant?.email || ""} required />
        </label>
        <label>
          <span>Сайт</span>
          <input name="website" type="url" defaultValue={restaurant?.website || ""} />
        </label>
        <label>
          <span>Средний чек</span>
          <input name="averageCheck" type="number" min="1" defaultValue={restaurant?.averageCheck || 1800} required />
        </label>
        <label>
          <span>Статус публикации</span>
          <select name="publicationStatus" defaultValue={publicationValue(restaurant)}>
            <option value="draft">Черновик</option>
            <option value="published">Опубликован</option>
            <option value="hidden">Скрыт</option>
          </select>
        </label>
      </div>

      <ImageUploadField
        restaurantId={restaurant?.id}
        name="mainPhotoUrl"
        label="Главное фото ресторана"
        value={restaurant?.mainPhotoUrl || ""}
        hint="Загрузите файл с компьютера или оставьте ссылку на изображение."
      />

      <label>
        <span>Краткое описание</span>
        <input name="shortDescription" defaultValue={restaurant?.shortDescription || ""} required />
      </label>
      <label>
        <span>Описание</span>
        <textarea name="description" rows={5} defaultValue={restaurant?.description || ""} required />
      </label>
      <div className="form-grid two">
        <label>
          <span>Кухни через запятую</span>
          <input name="cuisineTypes" defaultValue={restaurant ? listToText(restaurant.cuisineTypes) : ""} />
        </label>
        <label>
          <span>Особенности через запятую</span>
          <input name="features" defaultValue={restaurant ? listToText(restaurant.features) : ""} />
        </label>
      </div>

      <ImageGalleryUploadField
        restaurantId={restaurant?.id}
        name="galleryPhotos"
        label="Галерея ресторана"
        values={restaurant ? parseStringList(restaurant.galleryPhotos) : []}
        hint="Добавьте ссылки вручную или загрузите несколько файлов сразу."
      />

      {error ? <p className="form-error">{error}</p> : null}
      {success ? <p className="form-success">{success}</p> : null}

      <button className="button icon-text" disabled={pending} type="submit">
        <Save size={17} aria-hidden />
        {pending ? "Сохраняем..." : "Сохранить ресторан"}
      </button>
      <p className="form-note">
        После сохранения изменения сразу обновятся в Kaifbook Office. Если ресторан опубликован, обновится и клиентская
        страница.
      </p>
    </form>
  );
}
