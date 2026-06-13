"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Pencil, Trash2 } from "lucide-react";
import { ROLE_LABELS } from "@/lib/constants";

type StaffMember = {
  id: string;
  role: string;
  user: { id: string; fullName: string; email: string; phone: string | null; role: string };
};

const EMPTY_ADD = { email: "", fullName: "", phone: "", password: "", role: "waiter" };

export function StaffManager({ restaurantId, initialStaff }: { restaurantId: string; initialStaff: StaffMember[] }) {
  const router = useRouter();
  const [staff, setStaff] = useState(initialStaff);
  const [adding, setAdding] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY_ADD);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ fullName: "", phone: "", password: "", role: "waiter" });
  const [editError, setEditError] = useState<string | null>(null);
  const [editLoading, setEditLoading] = useState(false);

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
      setForm(EMPTY_ADD);
      setAdding(false);
      router.refresh();
    } catch {
      setError("Ошибка сети");
    } finally {
      setLoading(false);
    }
  }

  function startEdit(s: StaffMember) {
    setEditingId(s.id);
    setEditError(null);
    setEditForm({ fullName: s.user.fullName, phone: s.user.phone || "", password: "", role: s.role });
  }

  async function handleEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editingId) return;
    setEditLoading(true);
    setEditError(null);
    try {
      const res = await fetch(`/api/owner/restaurants/${restaurantId}/staff/${editingId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editForm),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { setEditError(data.error || "Ошибка"); return; }
      setStaff((prev) => prev.map((s) => (s.id === editingId
        ? { ...s, role: editForm.role, user: { ...s.user, fullName: editForm.fullName.trim() || s.user.fullName, phone: editForm.phone.trim() || null } }
        : s)));
      setEditingId(null);
      router.refresh();
    } catch {
      setEditError("Ошибка сети");
    } finally {
      setEditLoading(false);
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
            editingId === s.id ? (
              <form className="staff-add-form" key={s.id} onSubmit={handleEdit}>
                <h3>Редактировать сотрудника</h3>
                {editError && <div className="form-error">{editError}</div>}
                <label>
                  <span>Имя</span>
                  <input required value={editForm.fullName} onChange={(e) => setEditForm({ ...editForm, fullName: e.target.value })} />
                </label>
                <label>
                  <span>Email</span>
                  <input type="email" value={s.user.email} disabled />
                </label>
                <label>
                  <span>Телефон</span>
                  <input value={editForm.phone} onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })} />
                </label>
                <label>
                  <span>Новый пароль</span>
                  <input type="password" minLength={6} placeholder="Оставьте пустым, чтобы не менять" value={editForm.password} onChange={(e) => setEditForm({ ...editForm, password: e.target.value })} />
                </label>
                <label>
                  <span>Роль</span>
                  <select value={editForm.role} onChange={(e) => setEditForm({ ...editForm, role: e.target.value })}>
                    <option value="waiter">Официант</option>
                    <option value="restaurant_manager">Менеджер</option>
                  </select>
                </label>
                <div className="form-actions">
                  <button className="button" type="submit" disabled={editLoading}>
                    {editLoading ? "Сохранение..." : "Сохранить"}
                  </button>
                  <button className="button ghost" type="button" onClick={() => { setEditingId(null); setEditError(null); }}>
                    Отмена
                  </button>
                </div>
              </form>
            ) : (
              <div className="staff-row" key={s.id}>
                <div className="staff-info">
                  <strong>{s.user.fullName}</strong>
                  <span>{s.user.email}</span>
                  {s.user.phone && <span>{s.user.phone}</span>}
                </div>
                <span className="badge">{ROLE_LABELS[s.role] || s.role}</span>
                <button className="small-button icon-text" type="button" onClick={() => startEdit(s)}>
                  <Pencil size={14} aria-hidden /> Изменить
                </button>
                <button className="small-button danger icon-text" type="button" onClick={() => handleDelete(s.id)}>
                  <Trash2 size={14} aria-hidden /> Удалить
                </button>
              </div>
            )
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
