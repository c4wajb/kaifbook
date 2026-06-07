"use client";

import { useEffect, useState } from "react";

const STORAGE_KEY = "kaifbook_age_confirmed";

export function AgeGate() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!localStorage.getItem(STORAGE_KEY)) {
      setVisible(true);
    }
  }, []);

  if (!visible) return null;

  function confirm() {
    localStorage.setItem(STORAGE_KEY, "1");
    setVisible(false);
  }

  function decline() {
    window.location.href = "https://ya.ru";
  }

  return (
    <div className="age-gate-overlay">
      <div className="age-gate-modal">
        <h2>Подтверждение возраста</h2>
        <p>На этом сайте представлена информация о заведениях, предлагающих табачную и алкогольную продукцию. Подтвердите, что вам исполнилось 18 лет.</p>
        <div className="age-gate-actions">
          <button className="button" type="button" onClick={confirm}>
            Мне есть 18 лет
          </button>
          <button className="button button-outline" type="button" onClick={decline}>
            Мне нет 18 лет
          </button>
        </div>
      </div>
    </div>
  );
}
