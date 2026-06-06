import Link from "next/link";
import { createBusinessAction } from "@/app/actions";
import { BusinessForm } from "@/components/business-form";
import { FlashMessage } from "@/components/flash-message";
import { PageHeader } from "@/components/page-header";

type NewBusinessPageProps = {
  searchParams: Promise<{
    error?: string;
  }>;
};

export default async function NewBusinessPage({ searchParams }: NewBusinessPageProps) {
  const params = await searchParams;

  return (
    <>
      <PageHeader
        title="Новый бизнес"
        description="Добавьте базовую информацию для кабинета и публичной страницы."
        actions={
          <Link className="secondary-button" href="/businesses">
            Назад
          </Link>
        }
      />
      <FlashMessage error={params.error} />
      <section className="form-card">
        <BusinessForm action={createBusinessAction} submitLabel="Создать бизнес" />
      </section>
    </>
  );
}
