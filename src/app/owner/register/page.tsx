import Link from "next/link";
import { AuthForm } from "@/components/guest/AuthForm";

type OwnerRegisterPageProps = { searchParams: Promise<{ next?: string }> };

export default async function OwnerRegisterPage({ searchParams }: OwnerRegisterPageProps) {
  const { next } = await searchParams;

  return (
    <div className="page narrow office-auth-page">
      <AuthForm mode="register" nextPath={next || "/owner/dashboard"} />
      <p className="muted">
        Уже есть кабинет? <Link href="/owner/login">Войти</Link>
      </p>
    </div>
  );
}
