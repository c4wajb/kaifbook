"use client";

import { CheckCircle2, Send } from "lucide-react";
import { FormEvent, useState } from "react";

export function RestaurantLeadForm() {
  const [message, setMessage] = useState<string | null>(null);
  const [details, setDetails] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);
    setMessage(null);
    setDetails(null);
    const formElement = event.currentTarget;
    const form = new FormData(formElement);

    const response = await fetch("/api/public/restaurant-leads", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        restaurantName: String(form.get("restaurantName") || ""),
        contactName: String(form.get("contactName") || ""),
        phone: String(form.get("phone") || ""),
        email: String(form.get("email") || ""),
        city: String(form.get("city") || ""),
        address: String(form.get("address") || ""),
        comment: String(form.get("comment") || ""),
      }),
    });
    const data = await response.json().catch(() => ({}));
    setPending(false);

    if (!response.ok) {
      setError(data.error || "Не удалось отправить заявку. Проверьте данные и попробуйте ещё раз.");
      return;
    }

    formElement.reset();
    setMessage("Заявка отправлена");
    setDetails(
      "Мы передали вашу заявку администратору Kaifbook. После проверки с вами свяжутся и создадут доступ к личному кабинету ресторана.",
    );
  }

  return (
    <form className="panel stack-form" onSubmit={submit}>
      <h2>Подключить ресторан</h2>
      <label>
        <span>Название ресторана</span>
        <input name="restaurantName" required />
      </label>
      <div className="form-grid two">
        <label>
          <span>Контактное лицо</span>
          <input name="contactName" autoComplete="name" required />
        </label>
        <label>
          <span>Телефон</span>
          <input name="phone" autoComplete="tel" inputMode="tel" required />
        </label>
      </div>
      <label>
        <span>Email для связи</span>
        <input name="email" type="email" autoComplete="email" required />
      </label>
      <div className="form-grid two">
        <label>
          <span>Город</span>
          <input name="city" defaultValue="Курск" required />
        </label>
        <label>
          <span>Адрес ресторана</span>
          <input name="address" />
        </label>
      </div>
      <label>
        <span>Комментарий</span>
        <textarea name="comment" rows={3} placeholder="Расскажите коротко о заведении и удобном времени для связи" />
      </label>
      {error ? <p className="form-error">{error}</p> : null}
      {message ? (
        <div className="form-success lead-success">
          <CheckCircle2 size={18} aria-hidden />
          <div>
            <strong>{message}</strong>
            <span>{details}</span>
            <small>После одобрения вы сможете заполнить информацию о ресторане, добавить меню, фотографии, схему зала и настроить бронирования.</small>
          </div>
        </div>
      ) : null}
      <button className="button icon-text full" type="submit" disabled={pending}>
        <Send size={16} aria-hidden />
        {pending ? "Отправляем..." : "Оставить заявку"}
      </button>
    </form>
  );
}
