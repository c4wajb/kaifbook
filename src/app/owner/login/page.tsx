import { headers } from "next/headers";
import Link from "next/link";
import { AuthForm } from "@/components/AuthForm";

type OwnerLoginPageProps = { searchParams: Promise<{ next?: string }> };

export default async function OwnerLoginPage({ searchParams }: OwnerLoginPageProps) {
  const { next } = await searchParams;
  const host = (await headers()).get("host") || "";
  const isStolix = host.includes("stolix");

  return (
    <div className="page narrow office-auth-page">
      <AuthForm mode="login" nextPath={next || "/owner/dashboard"} />
      {!isStolix && (
        <p className="muted">
          Нет кабинета ресторана? <Link href="/owner/register">Подключить ресторан</Link>
        </p>
      )}
    </div>
  );
}
