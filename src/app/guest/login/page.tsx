import { GuestLoginForm } from "@/components/GuestLoginForm";

type Props = {
  searchParams: Promise<{ phone?: string; next?: string; vkid_error?: string }>;
};

function safeNextPath(value?: string) {
  if (!value || !value.startsWith("/") || value.startsWith("//")) return "/guest/reservations";
  return value;
}

export default async function GuestLoginPage({ searchParams }: Props) {
  const params = await searchParams;
  return (
    <main className="guest-login-page">
      <GuestLoginForm initialPhone={params.phone || ""} nextPath={safeNextPath(params.next)} initialError={params.vkid_error || null} />
    </main>
  );
}
