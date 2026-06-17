"use client";

import { Save } from "lucide-react";
import { useRouter } from "next/navigation";
import { FormEvent, useMemo, useState } from "react";
import { DAY_LABELS } from "@/lib/constants";

type WorkingHour = {
  dayOfWeek: number;
  openTime: string;
  closeTime: string;
  isClosed: boolean;
};

const ORDER = [1, 2, 3, 4, 5, 6, 0];
const DEFAULT_OPEN = "10:00";
const DEFAULT_CLOSE = "23:00";

function hourForDay(workingHours: WorkingHour[], dayOfWeek: number): WorkingHour {
  return workingHours.find((item) => item.dayOfWeek === dayOfWeek) ?? { dayOfWeek, openTime: DEFAULT_OPEN, closeTime: DEFAULT_CLOSE, isClosed: false };
}

function toMinutes(value: string) {
  const [hours = "0", minutes = "0"] = value.split(":");
  return Number(hours) * 60 + Number(minutes);
}

function buildTimeOptions(extraValues: string[]) {
  const options = new Set<string>();

  for (let minutes = 0; minutes < 24 * 60; minutes += 15) {
    const hours = Math.floor(minutes / 60).toString().padStart(2, "0");
    const mins = (minutes % 60).toString().padStart(2, "0");
    options.add(`${hours}:${mins}`);
  }

  extraValues.filter(Boolean).forEach((value) => options.add(value));

  return Array.from(options).sort((a, b) => toMinutes(a) - toMinutes(b));
}

export function WorkingHoursForm({ restaurantId, workingHours }: { restaurantId: string; workingHours: WorkingHour[] }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const timeOptions = useMemo(() => buildTimeOptions(workingHours.flatMap((hour) => [hour.openTime, hour.closeTime])), [workingHours]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);
    setMessage(null);

    const form = new FormData(event.currentTarget);
    const payload = {
      workingHours: ORDER.map((dayOfWeek) => ({
        dayOfWeek,
        openTime: String(form.get(`openTime-${dayOfWeek}`) || DEFAULT_OPEN),
        closeTime: String(form.get(`closeTime-${dayOfWeek}`) || DEFAULT_CLOSE),
        isClosed: form.get(`isClosed-${dayOfWeek}`) === "on",
      })),
    };

    const response = await fetch(`/api/restaurants/${restaurantId}/working-hours`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      setError(data.error || "Не удалось сохранить расписание.");
      setPending(false);
      return;
    }

    setMessage("Расписание сохранено.");
    setPending(false);
    router.refresh();
  }

  return (
    <form className="panel wide-form working-hours-form" onSubmit={submit}>
      <div className="hours-list working-hours-list">
        {ORDER.map((dayOfWeek) => {
          const hour = hourForDay(workingHours, dayOfWeek);

          return (
            <div className="hours-row working-hours-row" key={dayOfWeek}>
              <strong className="working-hours-day">{DAY_LABELS[dayOfWeek]}</strong>

              <label className="office-time-field">
                <span>Открытие</span>
                <span className="office-time-select-wrap">
                  <select className="office-time-select" name={`openTime-${dayOfWeek}`} defaultValue={hour.openTime}>
                    {timeOptions.map((time) => (
                      <option key={`open-${dayOfWeek}-${time}`} value={time}>
                        {time}
                      </option>
                    ))}
                  </select>
                </span>
              </label>

              <label className="office-time-field">
                <span>Закрытие</span>
                <span className="office-time-select-wrap">
                  <select className="office-time-select" name={`closeTime-${dayOfWeek}`} defaultValue={hour.closeTime}>
                    {timeOptions.map((time) => (
                      <option key={`close-${dayOfWeek}-${time}`} value={time}>
                        {time}
                      </option>
                    ))}
                  </select>
                </span>
              </label>

              <label className="check-row working-hours-closed">
                <input name={`isClosed-${dayOfWeek}`} type="checkbox" defaultChecked={hour.isClosed} />
                Закрыто
              </label>
            </div>
          );
        })}
      </div>

      {error ? <p className="form-error">{error}</p> : null}
      {message ? <p className="form-success">{message}</p> : null}

      <button className="button icon-text" disabled={pending} type="submit">
        <Save size={17} aria-hidden />
        {pending ? "Сохранение..." : "Сохранить расписание"}
      </button>
    </form>
  );
}
