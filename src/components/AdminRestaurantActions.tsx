"use client";

import { Check, EyeOff, Star, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

type Props = {
  restaurantId: string;
  isFeatured?: boolean;
};

export function AdminRestaurantActions({ restaurantId, isFeatured }: Props) {
  const router = useRouter();
  const [pending, setPending] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function patch(action: string, payload: Record<string, string | boolean | number | null>) {
    setPending(action);
    setError(null);
    const response = await fetch(`/api/admin/restaurants/${restaurantId}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      setError(data.error || "Не удалось сохранить изменения.");
      setPending(null);
      return;
    }
    setPending(null);
    router.refresh();
  }

  return (
    <div className="reservation-actions">
      <button className="small-button icon-text" type="button" disabled={pending !== null} onClick={() => patch("approve", { status: "approved", isActive: true })}>
        <Check size={15} aria-hidden />
        Одобрить
      </button>
      <button className="small-button icon-text" type="button" disabled={pending !== null} onClick={() => patch("feature", { isFeatured: !isFeatured })}>
        <Star size={15} aria-hidden />
        {isFeatured ? "Убрать из баннера" : "В баннер"}
      </button>
      <button className="small-button icon-text" type="button" disabled={pending !== null} onClick={() => patch("hide", { isActive: false })}>
        <EyeOff size={15} aria-hidden />
        Отключить
      </button>
      <button className="small-button icon-text" type="button" disabled={pending !== null} onClick={() => patch("reject", { status: "rejected", isActive: false })}>
        <X size={15} aria-hidden />
        Отклонить
      </button>
      {error ? <p className="form-error compact-error">{error}</p> : null}
    </div>
  );
}
