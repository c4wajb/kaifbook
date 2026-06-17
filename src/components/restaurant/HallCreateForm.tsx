"use client";
import { Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
export function HallCreateForm({ restaurantId }: { restaurantId: string }) {
  const router = useRouter(); const [pending, setPending] = useState(false); const [error, setError] = useState<string | null>(null);
  async function submit(event: FormEvent<HTMLFormElement>) { event.preventDefault(); setPending(true); setError(null); const formElement = event.currentTarget; const form = new FormData(formElement); const response = await fetch(`/api/restaurants/${restaurantId}/halls`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ title: String(form.get("title") || "Основной зал"), width: Number(form.get("width") || 900), height: Number(form.get("height") || 520), sortOrder: 0, isActive: true }) }); if (!response.ok) { const data = await response.json().catch(() => ({})); setError(data.error || "Не удалось создать зал"); setPending(false); return; } formElement.reset(); setPending(false); router.refresh(); }
  return <form className="panel hall-create-form" onSubmit={submit}><input name="title" placeholder="Название зала" defaultValue="Основной зал" required /><input name="width" type="number" min="320" defaultValue="900" aria-label="Ширина" /><input name="height" type="number" min="240" defaultValue="520" aria-label="Высота" /><button className="button icon-text" disabled={pending} type="submit"><Plus size={17} aria-hidden />Добавить зал</button>{error ? <p className="form-error compact-error">{error}</p> : null}</form>;
}
