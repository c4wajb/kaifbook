"use client";

import { useEffect, useMemo, useState } from "react";

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

  const years = useMemo(() => {
    const current = new Date().getFullYear();
    const list: number[] = [];
    for (let y = current; y >= current - 100; y -= 1) {
      list.push(y);
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
    if (d > daysInMonth(y, m)) {
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
          <select aria-label="День рождения" value={day} onChange={(event) => setDay(event.target.value)}>
            <option value="">День</option>
            {Array.from({ length: 31 }, (_, i) => i + 1).map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </select>
          <select aria-label="Месяц рождения" value={month} onChange={(event) => setMonth(event.target.value)}>
            <option value="">Месяц</option>
            {MONTHS.map((name, i) => (
              <option key={name} value={i + 1}>
                {name}
              </option>
            ))}
          </select>
          <select aria-label="Год рождения" value={year} onChange={(event) => setYear(event.target.value)}>
            <option value="">Год</option>
            {years.map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </select>
        </div>
        {error ? <p className="age-gate-error">{error}</p> : null}
        <button className="button" type="button" onClick={confirm}>
          Подтвердить
        </button>
      </div>
    </div>
  );
}
