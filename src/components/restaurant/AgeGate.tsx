"use client";

import { useEffect, useMemo, useState } from "react";
import { PrettySelect } from "@/components/ui/PrettySelect";

const STORAGE_KEY = "kaifbook_age_confirmed";
const MIN_AGE = 18;

const MONTHS = [
  "Января",
  "Февраля",
  "Марта",
  "Апреля",
  "Мая",
  "Июня",
  "Июля",
  "Августа",
  "Сентября",
  "Октября",
  "Ноября",
  "Декабря",
];

// Number of days in a given month (month is 1-based here).
function daysInMonth(year: number, month: number) {
  return new Date(year, month, 0).getDate();
}

// Full years elapsed since the given date of birth.
function calcAge(year: number, month: number, day: number) {
  const today = new Date();
  let age = today.getFullYear() - year;
  const monthDiff = today.getMonth() + 1 - month;
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < day)) {
    age -= 1;
  }
  return age;
}

export function AgeGate() {
  const [visible, setVisible] = useState(false);
  const [day, setDay] = useState("");
  const [month, setMonth] = useState("");
  const [year, setYear] = useState("");
  const [error, setError] = useState("");
  const [denied, setDenied] = useState(false);

  useEffect(() => {
    if (!localStorage.getItem(STORAGE_KEY)) {
      setVisible(true);
    }
  }, []);

  const monthOptions = useMemo(
    () => MONTHS.map((name, i) => ({ value: String(i + 1), label: name })),
    [],
  );
  const yearOptions = useMemo(() => {
    const current = new Date().getFullYear();
    const list: { value: string; label: string }[] = [];
    for (let y = current; y >= current - 100; y -= 1) {
      list.push({ value: String(y), label: String(y) });
    }
    return list;
  }, []);

  if (!visible) return null;

  const catalogHref =
    typeof window !== "undefined" && window.location.pathname.startsWith("/vk-mini")
      ? "/vk-mini"
      : "/restaurants";

  function confirm() {
    setError("");
    if (!day || !month || !year) {
      setError("Укажите дату рождения полностью.");
      return;
    }
    const d = Number(day);
    const m = Number(month);
    const y = Number(year);
    if (!Number.isInteger(d) || d < 1 || d > daysInMonth(y, m)) {
      setError("Проверьте дату — такого дня в этом месяце нет.");
      return;
    }
    if (calcAge(y, m, d) < MIN_AGE) {
      setDenied(true);
      return;
    }
    localStorage.setItem(STORAGE_KEY, "1");
    setVisible(false);
  }

  if (denied) {
    return (
      <div className="age-gate-overlay" role="dialog" aria-modal="true" aria-labelledby="age-gate-title">
        <div className="age-gate-modal">
          <h2 id="age-gate-title">Доступ ограничен</h2>
          <p>К сожалению, доступ к этому заведению только для лиц старше 18 лет.</p>
          <a className="button" href={catalogHref}>
            Вернуться в каталог
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="age-gate-overlay" role="dialog" aria-modal="true" aria-labelledby="age-gate-title">
      <div className="age-gate-modal">
        <h2 id="age-gate-title">Подтверждение возраста</h2>
        <p>
          Заведение предлагает табачную продукцию. Укажите дату рождения, чтобы подтвердить, что вам исполнилось 18 лет.
        </p>
        <div className="age-gate-fields">
          <input
            className="age-gate-day-input"
            type="text"
            inputMode="numeric"
            maxLength={2}
            placeholder="День"
            aria-label="День рождения"
            value={day}
            onChange={(event) => setDay(event.target.value.replace(/\D/g, "").slice(0, 2))}
          />
          <PrettySelect
            name="age-month"
            label="Месяц рождения"
            hideLabel
            placeholder="Месяц"
            options={monthOptions}
            value={month}
            onChange={setMonth}
          />
          <PrettySelect
            name="age-year"
            label="Год рождения"
            hideLabel
            placeholder="Год"
            options={yearOptions}
            value={year}
            onChange={setYear}
          />
        </div>
        {error ? <p className="age-gate-error">{error}</p> : null}
        <button className="button" type="button" onClick={confirm}>
          Подтвердить
        </button>
      </div>
    </div>
  );
}
