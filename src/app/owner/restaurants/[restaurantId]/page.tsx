import { redirect } from "next/navigation";

type Props = { params: Promise<{ restaurantId: string }> };

export default async function OwnerRestaurantPage({ params }: Props) {
  const { restaurantId } = await params;
  redirect(`/owner/restaurants/${restaurantId}/edit`);
}
