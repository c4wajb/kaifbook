import type { Business } from "@prisma/client";
import { businessCategories } from "@/lib/constants";

type BusinessFormProps = {
  action: (formData: FormData) => void | Promise<void>;
  business?: Pick<
    Business,
    "name" | "category" | "city" | "address" | "phone" | "description"
  >;
  submitLabel: string;
};

export function BusinessForm({ action, business, submitLabel }: BusinessFormProps) {
  return (
    <form action={action} className="form-grid">
      <div className="grid grid-2">
        <div className="field">
          <label htmlFor="name">Название</label>
          <input id="name" name="name" defaultValue={business?.name} required />
        </div>
        <div className="field">
          <label htmlFor="category">Категория</label>
          <select id="category" name="category" defaultValue={business?.category} required>
            <option value="">Выберите категорию</option>
            {businessCategories.map((category) => (
              <option value={category} key={category}>
                {category}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div className="grid grid-3">
        <div className="field">
          <label htmlFor="city">Город</label>
          <input id="city" name="city" defaultValue={business?.city ?? "Курск"} required />
        </div>
        <div className="field">
          <label htmlFor="phone">Телефон</label>
          <input id="phone" name="phone" defaultValue={business?.phone ?? ""} />
        </div>
        <div className="field">
          <label htmlFor="address">Адрес</label>
          <input id="address" name="address" defaultValue={business?.address ?? ""} />
        </div>
      </div>
      <div className="field">
        <label htmlFor="description">Описание</label>
        <textarea
          id="description"
          name="description"
          defaultValue={business?.description ?? ""}
          placeholder="Коротко опишите услуги, атмосферу, преимущества"
        />
      </div>
      <button className="button" type="submit">
        {submitLabel}
      </button>
    </form>
  );
}
