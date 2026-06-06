import { RestaurantForm } from "@/components/RestaurantForm";
import { requireOwnerPageUser } from "@/lib/page-auth";
export default async function NewRestaurantPage() { await requireOwnerPageUser("/owner/restaurants/new"); return <div className="page"><div className="page-title"><p className="eyebrow">Новый ресторан</p><h1>Карточка ресторана</h1></div><RestaurantForm /></div>; }
