"use client";

import { LogIn, Store, UserPlus } from "lucide-react";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";

type AuthFormProps = {
  mode: "login" | "register";
  nextPath?: string;
};

function useStolix() {
  const [isStolix, setIsStolix] = useState(false);
  useEffect(() => { setIsStolix(window.location.hostname.includes("stolix")); }, []);
  return isStolix;
}

export function AuthForm({ mode, nextPath = "/owner/dashboard" }: AuthFormProps) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const isRegister = mode === "register";
  const isStolix = useStolix();

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);

    const form = new FormData(event.currentTarget);
    const payload: Record<string, string> = {};
    form.forEach((value, key) => {
      payload[key] = String(value);
    });

    const response = await fetch(`/api/auth/${mode}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      setError(data.error || "Не удалось выполнить действие");
      setPending(false);
      return;
    }

    router.push(nextPath);
    router.refresh();
  }

  return (
    <form className="panel auth-panel office-auth-panel" onSubmit={submit}>
      <div className="auth-intro">
        <p className="eyebrow">{isStolix ? "Stolix" : "Kaifbook Office"}</p>
        <h1>{isRegister ? "Подключить ресторан" : isStolix ? "Панель управления" : "Вход для ресторанов"}</h1>
        <p>
          {isRegister
            ? "Создайте служебный аккаунт владельца ресторана. Клиентам регистрация не нужна."
            : isStolix
              ? "Войдите для доступа к управлению платформой и ресторанами."
              : "Войдите в кабинет ресторана или администратора платформы."}
        </p>
      </div>

      {isRegister ? (
        <>
          <input type="hidden" name="role" value="restaurant_owner" />
          <label>
            <span>Имя владельца</span>
            <input name="fullName" autoComplete="name" required />
          </label>
          <label>
            <span>Телефон</span>
            <input name="phone" autoComplete="tel" inputMode="tel" required />
          </label>
        </>
      ) : null}

      <label>
        <span>Email</span>
        <input name="email" type="email" autoComplete="email" required />
      </label>
      <label>
        <span>Пароль</span>
        <input
          name="password"
          type="password"
          autoComplete={isRegister ? "new-password" : "current-password"}
          required
          minLength={6}
        />
      </label>

      {error ? <p className="form-error">{error}</p> : null}

      <button className="button icon-text full" disabled={pending} type="submit">
        {isRegister ? <UserPlus size={17} aria-hidden /> : <LogIn size={17} aria-hidden />}
        {pending ? "Подождите..." : isRegister ? "Создать кабинет" : "Войти в кабинет"}
      </button>

      {isRegister ? (
        <p className="form-note compact-note">
          <Store size={16} aria-hidden /> Клиентские брони создаются без пароля и привязываются к телефону гостя.
        </p>
      ) : null}
    </form>
  );
}
