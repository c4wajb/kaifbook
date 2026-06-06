"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Trash2 } from "lucide-react";
import { ROLE_LABELS } from "@/lib/constants";

type StaffMember = {
  id: string;
  role: string;
  user: { id: string; fullName: string; email: string; phone: string | null; role: string };
};

export function StaffManager({ restaurantId, initialStaff }: { restaurantId: string; initialStaff: StaffMember[] }) {
  const router = useRouter();
  const [staff, setStaff] = useState(initialStaff);
  const [adding, setAdding] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({ email: "", fullName: "", phone: "", password: "", role: "waiter" });

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/owner/restaurants/${restaurantId}/staff`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "Ошибка"); return; }
      setForm({ email: "", fullName: "", phone: "", password: "", role: "waiter" });
      setAdding(false);
      router.refresh();
    } catch {
      setError("Ошибка сети");
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(staffId: string) {
    if (!confirm("Удалить сотрудника?")) return;
    try {
      const res = await fetch(`/api/owner/restaurants/${restaurantId}/staff/${staffId}`, { method: "DELETE" });
      if (res.ok) {
        setStaff((prev) => prev.filter((s) => s.id !== staffId));
        router.refresh();
      }
    } catch { /* ignore */ }
  }

  return (
    <section className="panel">
      <div className="section-heading">
        <h2>Управление</h2>
        {!adding && (
          <button className="button compact" type="button" onClick={() => setAdding(true)}>
            Добавить сотрудника
          </button>
        )}
      </div>

      {staff.length > 0 && (
        <div className="staff-list">
          {staff.map((s) => (
            <div className="staff-row" key={s.id}>
              <div className="staff-info">
                <strong>{s.user.fullName}</strong>
                <span>{s.user.email}</span>
              </div>
              <span className="badge">{ROLE_LABELS[s.role] || s.role}</span>
              <button className="small-button danger icon-text" type="button" onClick={() => handleDelete(s.id)}>
                <Trash2 size={14} aria-hidden /> Удалить
              </button>
            </div>
          ))}
        </div>
      )}

      {adding && (
        <form className="staff-add-form" onSubmit={handleAdd}>
          <h3>Новый сотрудник</h3>
          {error && <div className="form-error">{error}</div>}
          <label>
            <span>Имя</span>
            <input required value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} />
          </label>
          <label>
            <span>Email</span>
            <input type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          </label>
          <label>
            <span>Телефон</span>
            <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          </label>
          <label>
            <span>Пароль</span>
            <input type="password" required minLength={6} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
          </label>
          <label>
            <span>Роль</span>
            <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
              <option value="waiter">Официант</option>
              <option value="restaurant_manager">Менеджер</option>
            </select>
          </label>
          <div className="form-actions">
            <button className="button" type="submit" disabled={loading}>
              {loading ? "Добавление..." : "Добавить"}
            </button>
            <button className="button ghost" type="button" onClick={() => { setAdding(false); setError(null); }}>
              Отмена
            </button>
          </div>
        </form>
      )}
    </section>
  );
}
