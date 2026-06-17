"use client";
import { LogOut } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
export function LogoutButton() {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  async function logout() { setPending(true); await fetch("/api/auth/logout", { method: "POST" }); router.push("/"); router.refresh(); }
  return <button className="icon-text ghost" onClick={logout} disabled={pending} type="button"><LogOut size={16} aria-hidden />{pending ? "Выход..." : "Выйти"}</button>;
}
