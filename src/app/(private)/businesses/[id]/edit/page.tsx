import Link from "next/link";
import { redirect } from "next/navigation";
import { updateBusinessAction } from "@/app/actions";
import { BusinessForm } from "@/components/restaurant/business-form";
import { BusinessTabs } from "@/components/restaurant/business-tabs";
import { FlashMessage } from "@/components/ui/flash-message";
import { PageHeader } from "@/components/layout/page-header";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";

type EditBusinessPageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{
    error?: string;
  }>;
};

export default async function EditBusinessPage({ params, searchParams }: EditBusinessPageProps) {
  const user = await requireUser();
  const { id } = await params;
  const query = await searchParams;
  const business = await prisma.business.findFirst({
    where: { id, userId: user.id }
  });

  if (!business) {
    redirect("/businesses?error=Бизнес не найден");
  }

  return (
    <>
      <PageHeader
        title="Редактирование бизнеса"
        description={business.name}
        actions={
          <Link className="secondary-button" href={`/businesses/${business.id}`}>
            Назад
          </Link>
        }
      />
      <FlashMessage error={query.error} />
      <BusinessTabs businessId={business.id} />
      <section className="form-card">
        <BusinessForm
          action={updateBusinessAction.bind(null, business.id)}
          business={business}
          submitLabel="Сохранить"
        />
      </section>
    </>
  );
}
