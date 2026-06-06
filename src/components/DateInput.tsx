"use client";

import { CalendarDays } from "lucide-react";
import { useEffect, useRef, useState } from "react";

const WEEKDAYS = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"];

function toInputValue(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function parseInput(value: string) {
  if (!value) return null;
  const [y, m, d] = value.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function formatRu(value: string) {
  if (!value) return "";
  const [y, m, d] = value.split("-");
  return `${d}.${m}.${y}`;
}

function startOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function monthTitle(date: Date) {
  return new Intl.DateTimeFormat("ru-RU", { month: "long", year: "numeric" }).format(date);
}

function calendarDays(month: Date) {
  const first = startOfMonth(month);
  const offset = (first.getDay() + 6) % 7;
  const start = new Date(first);
  start.setDate(first.getDate() - offset);
  return Array.from({ length: 42 }, (_, i) => {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    return d;
  });
}

export function DateInput({ name, label, defaultValue = "", placeholder = "дд.мм.гггг" }: { name: string; label?: string; defaultValue?: string; placeholder?: string }) {
  const [value, setValue] = useState(defaultValue);
  const [open, setOpen] = useState(false);
  const [month, setMonth] = useState(() => {
    const parsed = parseInput(defaultValue);
    return startOfMonth(parsed || new Date());
  });
  const rootRef = useRef<HTMLLabelElement>(null);
  const days = calendarDays(month);

  useEffect(() => {
    function close(e: MouseEvent) {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  const prevMonth = new Date(month.getFullYear(), month.getMonth() - 1, 1);
  const nextMonth = new Date(month.getFullYear(), month.getMonth() + 1, 1);

  return (
    <label className="date-picker-field" ref={rootRef}>
      {label ? <span>{label}</span> : null}
      <input name={name} value={value} readOnly hidden />
      <button className="date-picker-trigger" type="button" onClick={() => setOpen((c) => !c)}>
        <strong>{value ? formatRu(value) : <span className="date-input-placeholder">{placeholder}</span>}</strong>
        <CalendarDays size={18} aria-hidden />
      </button>
      {open ? (
        <div className="date-picker-popover">
          <div className="date-picker-header">
            <button type="button" aria-label="Предыдущий месяц" onClick={() => setMonth(prevMonth)}>&#8249;</button>
            <strong>{monthTitle(month)}</strong>
            <button type="button" aria-label="Следующий месяц" onClick={() => setMonth(nextMonth)}>&#8250;</button>
          </div>
          <div className="date-picker-weekdays" aria-hidden>
            {WEEKDAYS.map((w) => <span key={w}>{w}</span>)}
          </div>
          <div className="date-picker-grid">
            {days.map((day) => {
              const iv = toInputValue(day);
              const current = day.getMonth() === month.getMonth() && day.getFullYear() === month.getFullYear();
              const selected = iv === value;
              return (
                <button
                  className={`${selected ? "selected" : ""} ${current ? "" : "muted"}`}
                  disabled={!current}
                  key={iv}
                  type="button"
                  onClick={() => { setValue(iv); setOpen(false); }}
                >
                  {day.getDate()}
                </button>
              );
            })}
          </div>
          <div className="date-picker-footer">
            {value ? (
              <button type="button" onClick={() => { setValue(""); setOpen(false); }}>Сбросить</button>
            ) : null}
            <button type="button" onClick={() => { setValue(toInputValue(new Date())); setOpen(false); }}>Сегодня</button>
          </div>
        </div>
      ) : null}
    </label>
  );
}
