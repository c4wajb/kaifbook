"use client";

import { Copy, ExternalLink, Loader2, MessageCircle, ShieldCheck, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { fetchJsonWithDiagnostics } from "@/lib/client-fetch";

type LinkSession = { id: string; publicCode: string; commandText: string; appUrl: string; confirmUrl: string };

export function RestaurantVkNotify({
  restaurantId,
  initialPeerId,
  initialName,
}: {
  restaurantId: string;
  initialPeerId: string | null;
  initialName: string | null;
}) {
  const router = useRouter();
  const [link, setLink] = useState<LinkSession | null>(null);
  const [status, setStatus] = useState<"idle" | "pending" | "expired">("idle");
  const [pending, setPending] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const linked = Boolean(initialPeerId);

  async function startLink() {
    setError(null);
    setPending(true);
    try {
      const data = await fetchJsonWithDiagnostics<LinkSession>(`/api/owner/restaurants/${restaurantId}/vk-notify/start`, {
        method: "POST",
        debugLabel: "vk-notify-start",
        userMessage: "Не удалось начать привязку VK. Попробуйте ещё раз.",
      });
      setLink(data);
      setStatus("pending");
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Не удалось начать привязку VK.");
    } finally {
      setPending(false);
    }
  }

  async function unlink() {
    if (!window.confirm("Отвязать VK от уведомлений о бронях?")) return;
    setPending(true);
    setError(null);
    try {
      await fetchJsonWithDiagnostics(`/api/owner/restaurants/${restaurantId}/vk-notify/unlink`, {
        method: "POST",
        debugLabel: "vk-notify-unlink",
        userMessage: "Не удалось отвязать VK.",
      });
      router.refresh();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Не удалось отвязать VK.");
    } finally {
      setPending(false);
    }
  }

  async function copyCommand() {
    if (!link) return;
    try {
      await navigator.clipboard.writeText(link.commandText);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  }

  // Poll the link session; the community confirms it code-free when the staff
  // member sends the command, and the page refreshes to show the linked state.
  useEffect(() => {
    if (status !== "pending" || !link) return;
    let active = true;
    const sessionId = link.id;
    const interval = window.setInterval(async () => {
      try {
        const response = await fetch(`/api/verifications/${sessionId}/status`, { cache: "no-store" });
        if (!response.ok || !active) return;
        const data = (await response.json()) as { status?: string };
        if (!active) return;
        if (data.status === "confirmed") {
          window.clearInterval(interval);
          router.refresh();
        } else if (data.status === "expired" || data.status === "failed") {
          window.clearInterval(interval);
          setStatus("expired");
          setError("Время привязки вышло. Начните заново.");
        }
      } catch {
        // ignore transient polling errors
      }
    }, 2500);
    return () => {
      active = false;
      window.clearInterval(interval);
    };
  }, [status, link, router]);

  return (
    <section className="panel">
      <div className="section-heading">
        <h2>Уведомления о бронях в VK</h2>
      </div>

      {linked ? (
        <div className="staff-row">
          <div className="staff-info">
            <strong>VK привязан{initialName ? `: ${initialName}` : ""}</strong>
            <span>Каждая новая бронь приходит сообщением в этот VK-аккаунт.</span>
          </div>
          <button className="small-button danger icon-text" type="button" disabled={pending} onClick={unlink}>
            <X size={14} aria-hidden /> Отвязать
          </button>
        </div>
      ) : status === "pending" && link ? (
        <div className="guest-code-flow">
          <div className="guest-code-flow-head">
            <strong>Привязка через VK-сообщество</strong>
            <button type="button" className="guest-code-change" onClick={() => { setStatus("idle"); setLink(null); }}>
              Отмена
            </button>
          </div>
          <ol className="guest-code-steps">
            <li className="guest-code-step">
              <span className="guest-step-num">1</span>
              <div className="guest-step-body">
                <p>Скопируйте команду</p>
                <div className="guest-code-command">
                  <code>{link.commandText}</code>
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
                <p>Откройте VK с того аккаунта, куда хотите получать уведомления, и отправьте команду сообществу</p>
                <a className="guest-open-app" href={link.appUrl || link.confirmUrl} target="_blank" rel="noopener noreferrer">
                  <ExternalLink size={16} aria-hidden />
                  Открыть VK
                </a>
              </div>
            </li>
            <li className="guest-code-step">
              <span className="guest-step-num">3</span>
              <div className="guest-step-body">
                <p>Готово — привязка завершится автоматически</p>
                <span className="guest-await">
                  <Loader2 className="spin" size={16} aria-hidden />
                  Ждём подтверждение из VK...
                </span>
              </div>
            </li>
          </ol>
        </div>
      ) : (
        <div className="guest-messenger-panel">
          <div className="guest-messenger-copy">
            <ShieldCheck size={18} aria-hidden />
            <div>
              <strong>Получайте новые брони в VK</strong>
              <span>Привяжите VK-аккаунт — и каждое новое бронирование будет приходить туда сообщением от сообщества.</span>
            </div>
          </div>
          <div className="guest-messenger-actions">
            <button className="verification-button" type="button" disabled={pending} onClick={startLink}>
              <MessageCircle size={16} aria-hidden />
              {pending ? "Готовим..." : "Привязать VK"}
            </button>
          </div>
        </div>
      )}

      {error ? <p className="form-error">{error}</p> : null}
    </section>
  );
}
