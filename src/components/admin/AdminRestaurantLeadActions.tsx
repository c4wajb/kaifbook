"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

type Props = {
  applicationId: string;
  defaultRestaurantName: string;
  defaultOwnerName: string;
  defaultOwnerEmail: string;
  defaultOwnerPhone: string;
  defaultCity: string;
  defaultAddress?: string | null;
  suggestedPassword: string;
  isApproved: boolean;
  createdRestaurantId?: string | null;
};

type Result = {
  restaurant?: { id: string };
  owner?: { email: string; fullName: string };
  temporaryPassword?: string | null;
  message?: string;
};

export function AdminRestaurantLeadActions({
  applicationId,
  defaultRestaurantName,
  defaultOwnerName,
  defaultOwnerEmail,
  defaultOwnerPhone,
  defaultCity,
  defaultAddress,
  suggestedPassword,
  isApproved,
  createdRestaurantId,
}: Props) {
  const router = useRouter();
  const [pendingAction, setPendingAction] = useState<"approve" | "reject" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<Result | null>(null);

  async function approve(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setPendingAction("approve");
    setError(null);
    setResult(null);

    const response = await fetch(`/api/admin/restaurant-applications/${applicationId}/approve`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        restaurantName: String(form.get("restaurantName") || ""),
        ownerName: String(form.get("ownerName") || ""),
        ownerEmail: String(form.get("ownerEmail") || ""),
        ownerPhone: String(form.get("ownerPhone") || ""),
        temporaryPassword: String(form.get("temporaryPassword") || ""),
        city: String(form.get("city") || ""),
        address: String(form.get("address") || ""),
        adminComment: String(form.get("adminComment") || ""),
      }),
    });
    const data = await response.json().catch(() => ({}));
    setPendingAction(null);

    if (!response.ok) {
      setError(data.error || "Не удалось одобрить заявку");
      return;
    }

    setResult(data);
    router.refresh();
  }

  async function reject(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setPendingAction("reject");
    setError(null);
    setResult(null);

    const response = await fetch(`/api/admin/restaurant-applications/${applicationId}/reject`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reason: String(form.get("reason") || "") }),
    });
    const data = await response.json().catch(() => ({}));
    setPendingAction(null);

    if (!response.ok) {
      setError(data.error || "Не удалось отклонить заявку");
      return;
    }

    setResult(data);
    router.refresh();
  }

  return (
    <section className="application-actions-grid">
      <form className="panel stack-form application-action-card" onSubmit={approve}>
        <div>
          <p className="eyebrow">Одобрение</p>
          <h2>Создать ресторан и учётку</h2>
        </div>
        <label>
          <span>Название ресторана</span>
          <input name="restaurantName" defaultValue={defaultRestaurantName} required disabled={isApproved} />
        </label>
        <div className="form-grid two">
          <label>
            <span>Имя владельца</span>
            <input name="ownerName" defaultValue={defaultOwnerName} required disabled={isApproved} />
          </label>
          <label>
            <span>Email для входа</span>
            <input name="ownerEmail" type="email" defaultValue={defaultOwnerEmail} required disabled={isApproved} />
          </label>
        </div>
        <div className="form-grid two">
          <label>
            <span>Телефон</span>
            <input name="ownerPhone" defaultValue={defaultOwnerPhone} required disabled={isApproved} />
          </label>
          <label>
            <span>Временный пароль</span>
            <input name="temporaryPassword" defaultValue={suggestedPassword} required minLength={6} disabled={isApproved} />
          </label>
        </div>
        <div className="form-grid two">
          <label>
            <span>Город</span>
            <input name="city" defaultValue={defaultCity || "Курск"} required disabled={isApproved} />
          </label>
          <label>
            <span>Адрес</span>
            <input name="address" defaultValue={defaultAddress || ""} disabled={isApproved} />
          </label>
        </div>
        <label>
          <span>Внутренний комментарий</span>
          <textarea name="adminComment" rows={3} disabled={isApproved} />
        </label>
        <button className="button full" type="submit" disabled={pendingAction !== null || isApproved}>
          {pendingAction === "approve" ? "Создаём..." : isApproved ? "Заявка уже одобрена" : "Создать ресторан и учётку"}
        </button>
      </form>

      <form className="panel stack-form application-action-card" onSubmit={reject}>
        <div>
          <p className="eyebrow">Отклонение</p>
          <h2>Отклонить заявку</h2>
        </div>
        <label>
          <span>Причина отклонения</span>
          <textarea name="reason" rows={5} placeholder="Например, не удалось связаться или данных недостаточно" />
        </label>
        <button className="secondary-button full" type="submit" disabled={pendingAction !== null || isApproved}>
          {pendingAction === "reject" ? "Отклоняем..." : "Отклонить заявку"}
        </button>
      </form>

      {error ? <p className="form-error application-result">{error}</p> : null}
      {result ? (
        <div className="form-success application-result">
          <strong>{result.message || "Действие выполнено"}</strong>
          {result.owner?.email && result.temporaryPassword ? (
            <span>
              Логин: {result.owner.email}. Временный пароль: {result.temporaryPassword}
            </span>
          ) : null}
          {result.restaurant?.id || createdRestaurantId ? (
            <Link className="small-button" href={`/owner/restaurants/${result.restaurant?.id || createdRestaurantId}/edit`}>
              Открыть ресторан
            </Link>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
