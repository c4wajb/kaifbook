import { redirect } from "next/navigation";

type LoginPageProps = { searchParams: Promise<{ next?: string }> };

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const { next } = await searchParams;
  redirect(`/owner/login${next ? `?next=${encodeURIComponent(next)}` : ""}`);
}
