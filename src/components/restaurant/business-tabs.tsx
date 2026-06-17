import Link from "next/link";

type BusinessTabsProps = {
  businessId: string;
};

export function BusinessTabs({ businessId }: BusinessTabsProps) {
  const items = [
    ["Обзор", `/businesses/${businessId}`],
    ["Клиенты", `/businesses/${businessId}/customers`],
    ["Заявки", `/businesses/${businessId}/leads`],
    ["Акции", `/businesses/${businessId}/promos`],
    ["AI-контент", `/businesses/${businessId}/ai-content`],
    ["Редактировать", `/businesses/${businessId}/edit`]
  ];

  return (
    <nav className="tabs" aria-label="Разделы бизнеса">
      {items.map(([label, href]) => (
        <Link className="tab" href={href} key={href}>
          {label}
        </Link>
      ))}
    </nav>
  );
}
