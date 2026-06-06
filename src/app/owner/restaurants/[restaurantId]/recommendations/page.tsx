import { redirect } from "next/navigation";

type Props = { params: Promise<{ restaurantId: string }> };

export default async function RecommendationsRedirectPage({ params }: Props) {
  const { restaurantId } = await params;
  redirect(`/owner/restaurants/${restaurantId}/analytics`);
}
