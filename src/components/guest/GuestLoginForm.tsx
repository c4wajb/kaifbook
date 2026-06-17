"use client";

import { ArrowRight, Copy, ExternalLink, KeyRound, Loader2, MessageCircle, ShieldCheck, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { fetchJsonWithDiagnostics } from "@/lib/client-fetch";
import { formatRuPhoneInput, isValidRuPhone, normalizePhone } from "@/lib/phone";

type Props = {
  initialPhone?: string;
  nextPath?: string;
  initialError?: string | null;
  closePath?: string;
};

type Provider = "max" | "vk";
type LoginStatus = "idle" | "pending" | "confirmed" | "expired" | "failed";

type MessengerLoginState = {
  provider: Provider | null;
  status: LoginStatus;
  sessionId: string | null;
  confirmUrl: string | null;
  appUrl: string | null;
  commandText: string | null;
  message: string | null;
};

type VkIdStartResponse = {
  appId: number;
  redirectUrl: string;
  state: string;
  codeChallenge: string;
  scope: string;
  expiresAt: string;
};

const initialMessengerState: MessengerLoginState = {
  provider: null,
  status: "idle",
  sessionId: null,
  confirmUrl: null,
  appUrl: null,
  commandText: null,
  message: null,
};

function providerLabel(provider: Provider | null) {
  if (provider === "max") return "MAX";
  if (provider === "vk") return "VK";
  return "";
}

export function GuestLoginForm({ initialPhone = "", nextPath = "/guest/reservations", initialError = null, closePath = "/restaurants" }: Props) {
  const router = useRouter();
  const [phone, setPhone] = useState(formatRuPhoneInput(initialPhone));
  const [login, setLogin] = useState<MessengerLoginState>(initialMessengerState);
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(initialError);
  const [pending, setPending] = useState(false);
  const [vkIdPending, setVkIdPending] = useState(false);
  const [copied, setCopied] = useState(false);

  const normalizedPhone = useMemo(() => normalizePhone(phone), [phone]);

  const handlePhoneChange = useCallback((value: string) => {
    setPhone(formatRuPhoneInput(value));
    setError(null);
    setLogin(initialMessengerState);
    setCode("");
    setCopied(false);
  }, []);

  async function startVkIdLogin() {
    setError(null);
    if (!isValidRuPhone(phone)) {
      setError("Введите корректный номер телефона.");
      return;
    }

    setVkIdPending(true);
    try {
      const data = await fetchJsonWithDiagnostics<VkIdStartResponse>("/api/guest-auth/vkid/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: normalizedPhone, returnUrl: nextPath }),
        debugLabel: "guest-start-vkid-login",
        userMessage: "Не удалось начать вход через VK ID. Используйте MAX или VK-сообщество для получения кода.",
      });

      const VKID = await import("@vkid/sdk");
      VKID.Config.init({
        app: data.appId,
        redirectUrl: data.redirectUrl,
        state: data.state,
        codeChallenge: data.codeChallenge,
        scope: data.scope,
        mode: VKID.ConfigAuthMode.Redirect,
      });
      await VKID.Auth.login({ lang: VKID.Languages.RUS });
    } catch (vkError) {
      setVkIdPending(false);
      setError(vkError instanceof Error ? vkError.message : "Не удалось открыть VK ID. Используйте вход по коду.");
    }
  }

  async function finishMessengerLogin(sessionId: string) {
    const cleanCode = code.replace(/\D/g, "");
    if (cleanCode.length !== 6) {
      setError("Введите 6 цифр из сообщения.");
      return;
    }

    setPending(true);
    setError(null);
    try {
      await fetchJsonWithDiagnostics("/api/guest/auth/verify-messenger", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: normalizedPhone, verificationSessionId: sessionId, code: cleanCode }),
        debugLabel: "guest-verify-messenger",
        userMessage: "Не удалось открыть личный кабинет. Попробуйте подтвердить вход ещё раз.",
      });
      setLogin((current) => ({
        ...current,
        status: "confirmed",
        message: "Код принят. Открываем ваши брони...",
      }));
      router.push(nextPath);
      router.refresh();
    } catch (loginError) {
      setError(loginError instanceof Error ? loginError.message : "Код не подошёл. Проверьте сообщение и попробуйте ещё раз.");
    } finally {
      setPending(false);
    }
  }

  async function startMessengerLogin(provider: Provider) {
    setError(null);
    if (!isValidRuPhone(phone)) {
      setError("Введите корректный номер телефона.");
      return;
    }

    setPending(true);
    try {
      const data = await fetchJsonWithDiagnostics<{
        session: { id: string; provider: Provider; status: "pending"; expiresAt: string };
        confirmUrl: string;
        appUrl?: string | null;
        commandText: string;
        publicCode?: string | null;
      }>("/api/verifications/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider, phone: normalizedPhone, guestName: "Гость Kaifbook" }),
        debugLabel: "guest-start-messenger-login",
        userMessage: "Не удалось начать подтверждение. Проверьте номер и попробуйте ещё раз.",
      });

      setCode("");
      setCopied(false);
      // Don't auto-open a new tab — the instructions (and the code field) must
      // stay visible. The guest taps "Открыть" themselves when ready.
      setLogin({
        provider,
        status: "pending",
        sessionId: data.session.id,
        confirmUrl: data.confirmUrl,
        appUrl: data.appUrl || data.confirmUrl,
        commandText: data.commandText,
        message: null,
      });
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Не удалось начать подтверждение.");
    } finally {
      setPending(false);
    }
  }

  async function copyCommand() {
    if (!login.commandText) return;
    try {
      await navigator.clipboard.writeText(login.commandText);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  }

  function resetMessenger() {
    setLogin(initialMessengerState);
    setCode("");
    setCopied(false);
    setError(null);
  }

  // Code-free finish: the session is already confirmed (VK direct confirmation).
  const finishCodeFreeLogin = useCallback(
    async (sessionId: string) => {
      setPending(true);
      setError(null);
      try {
        await fetchJsonWithDiagnostics("/api/guest/auth/verify-messenger", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ phone: normalizedPhone, verificationSessionId: sessionId }),
          debugLabel: "guest-verify-messenger-codefree",
          userMessage: "Не удалось завершить вход. Попробуйте ещё раз.",
        });
        setLogin((current) => ({ ...current, status: "confirmed" }));
        router.push(nextPath);
        router.refresh();
      } catch (loginError) {
        setError(loginError instanceof Error ? loginError.message : "Не удалось завершить вход.");
        setPending(false);
      }
    },
    [normalizedPhone, nextPath, router],
  );

  // While waiting for a messenger login, poll the session. VK confirms directly
  // in the chat, so the guest is signed in automatically — no code to type.
  useEffect(() => {
    if (login.status !== "pending" || !login.sessionId) return;
    let active = true;
    const sessionId = login.sessionId;
    const interval = window.setInterval(async () => {
      try {
        const response = await fetch(`/api/verifications/${sessionId}/status`, { cache: "no-store" });
        if (!response.ok || !active) return;
        const data = (await response.json()) as { status?: string };
        if (!active) return;
        if (data.status === "confirmed") {
          window.clearInterval(interval);
          await finishCodeFreeLogin(sessionId);
        } else if (data.status === "expired" || data.status === "failed") {
          window.clearInterval(interval);
          setLogin((current) => ({ ...current, status: data.status as LoginStatus }));
          setError("Время вышло. Начните вход заново.");
        }
      } catch {
        // ignore transient polling errors
      }
    }, 2500);
    return () => {
      active = false;
      window.clearInterval(interval);
    };
  }, [login.status, login.sessionId, finishCodeFreeLogin]);

  return (
    <section className="guest-login-card">
      <button className="page-close-button guest-login-close" type="button" aria-label="Вернуться к ресторанам" onClick={() => router.push(closePath)}>
        <X size={20} aria-hidden />
      </button>
      <div className="guest-login-icon">
        <ShieldCheck size={24} aria-hidden />
      </div>
      <p className="eyebrow">Личный кабинет гостя</p>
      <h1>Вход в мои брони</h1>
      <p>Укажите телефон, который оставляли при бронировании. VK ID подтвердит вход, и мы покажем ваши заявки.</p>

      <div className="guest-login-form">
        <label>
          <span>Телефон</span>
          <input autoComplete="tel" inputMode="tel" maxLength={18} placeholder="+7 (999) 123-45-67" value={phone} onChange={(event) => handlePhoneChange(event.target.value)} />
        </label>

        <div className="guest-vkid-panel">
          <div>
            <strong>Быстрый вход через VK ID</strong>
            <span>Подтвердим вход через VK — быстро и без лишних шагов.</span>
          </div>
          <button className="button icon-text full" type="button" disabled={vkIdPending || pending} onClick={startVkIdLogin}>
            {vkIdPending ? "Открываем VK ID..." : "Войти через VK ID"}
            <ArrowRight size={17} aria-hidden />
          </button>
        </div>

        <div className={`guest-messenger-panel guest-messenger-${login.status}`}>
          {login.status !== "pending" ? (
            <>
              <div className="guest-messenger-copy">
                <KeyRound size={18} aria-hidden />
                <div>
                  <strong>Вход через сообщество</strong>
                  <span>Если VK ID недоступен — подтвердите вход в чате. Через VK-сообщество код вводить не нужно.</span>
                </div>
              </div>
              <div className="guest-messenger-actions">
                <button className="verification-button" type="button" disabled={pending} onClick={() => startMessengerLogin("vk")}>
                  <MessageCircle size={16} aria-hidden />
                  VK-сообщество
                </button>
                <button className="verification-button" type="button" disabled={pending} onClick={() => startMessengerLogin("max")}>
                  <MessageCircle size={16} aria-hidden />
                  MAX
                </button>
              </div>
            </>
          ) : (
            <div className="guest-code-flow">
              <div className="guest-code-flow-head">
                <strong>Вход через {login.provider === "vk" ? "VK-сообщество" : "MAX"}</strong>
                <button type="button" className="guest-code-change" onClick={resetMessenger}>
                  Другой способ
                </button>
              </div>

              <ol className="guest-code-steps">
                <li className="guest-code-step">
                  <span className="guest-step-num">1</span>
                  <div className="guest-step-body">
                    <p>Скопируйте команду</p>
                    <div className="guest-code-command">
                      <code>{login.commandText}</code>
                      <button type="button" onClick={copyCommand}>
                        <Copy size={14} aria-hidden />
                        {copied ? "Скопировано" : "Копировать"}
                      </button>
                    </div>
                  </div>
                </li>

                <li className="guest-code-step">
                  <span className="guest-step-num">2</span>
                  <div className="guest-step-body">
                    <p>Откройте {providerLabel(login.provider)} и отправьте её сообществу</p>
                    <a className="guest-open-app" href={login.appUrl || login.confirmUrl || "#"} target="_blank" rel="noopener noreferrer">
                      <ExternalLink size={16} aria-hidden />
                      Открыть {providerLabel(login.provider)}
                    </a>
                  </div>
                </li>

                <li className="guest-code-step">
                  <span className="guest-step-num">3</span>
                  <div className="guest-step-body">
                    {login.provider === "vk" ? (
                      <>
                        <p>Готово — вход подтвердится автоматически</p>
                        <span className="guest-await">
                          <Loader2 className="spin" size={16} aria-hidden />
                          {pending ? "Входим..." : "Ждём подтверждение из VK..."}
                        </span>
                      </>
                    ) : (
                      <>
                        <p>Введите 6-значный код из ответа сообщества</p>
                        <input
                          className="guest-code-input"
                          autoComplete="one-time-code"
                          inputMode="numeric"
                          maxLength={6}
                          placeholder="000000"
                          value={code}
                          onChange={(event) => {
                            setCode(event.target.value.replace(/\D/g, "").slice(0, 6));
                            setError(null);
                          }}
                        />
                        <button
                          className="button icon-text full"
                          type="button"
                          disabled={!login.sessionId || code.length !== 6 || pending}
                          onClick={() => login.sessionId && finishMessengerLogin(login.sessionId)}
                        >
                          {pending ? "Проверяем код..." : "Войти по коду"}
                          <ArrowRight size={17} aria-hidden />
                        </button>
                      </>
                    )}
                  </div>
                </li>
              </ol>
            </div>
          )}
        </div>
      </div>

      {error ? <p className="form-error">{error}</p> : null}
    </section>
  );
}
