import Link from "next/link";
import { RestaurantLeadForm } from "@/components/RestaurantLeadForm";

export default function ForRestaurantsPage() {
  return (
    <div>
      <section className="page client-home-hero">
        <div className="client-home-copy">
          <p className="eyebrow">Для ресторанов</p>
          <h1>Система бронирования, которая помогает ресторану не терять гостей</h1>
          <p>Брони, схема зала, гости, меню и аналитика в одном кабинете. Гость бронирует без регистрации, ресторан получает заявку, телефон и историю визитов.</p>
          <div className="toolbar-actions">
            <Link className="button client-cta" href="#lead">Получить демо</Link>
            <Link className="ghost" href="/owner/login">Войти в кабинет</Link>
          </div>
        </div>
        <div className="panel">
          <p className="eyebrow">Что видит владелец</p>
          <div className="value-grid">
            <div><strong>32</strong><span>броней за неделю</span></div>
            <div><strong>71%</strong><span>конверсия в подтверждение</span></div>
            <div><strong>18:00</strong><span>пиковый слот</span></div>
            <div><strong>12</strong><span>повторных гостей</span></div>
          </div>
          <div className="form-note">Демо-цифры показывают формат dashboard. В рабочей базе показатели считаются из реальных броней.</div>
        </div>
      </section>

      <section className="page grid-layout two-columns">
        <div className="panel">
          <p className="eyebrow">Защита от no-show</p>
          <h2>Меньше пустых столов и неявок</h2>
          <p>Настраивайте разные правила бронирования для маленьких и больших столов. Для больших компаний можно включить депозит через легальную онлайн-оплату, а для обычных броней оставить бесплатное подтверждение по ссылке.</p>
        </div>
        <div className="panel">
          <div className="stack-list">
            {["Маленькие столы можно бронировать без депозита", "Для больших столов можно настроить депозит", "Гость подтверждает визит в один клик", "Менеджер видит рискованные брони", "Система запоминает гостей, которые не пришли", "Лист ожидания помогает быстро заменить отмененную бронь", "Оплата планируется через официальный платежный провайдер, а не переводом на карту"].map((item) => (
              <div className="insight-row" key={item}><strong>{item}</strong><span>Правило настраивается рестораном и показывается гостю до отправки заявки.</span></div>
            ))}
          </div>
        </div>
      </section>

      <section className="page grid-layout two-columns" id="lead">
        <div className="panel">
          <p className="eyebrow">Позиционирование</p>
          <h2>Готовая страница для броней, CRM гостей и аналитика загрузки зала</h2>
          <p>Вы видите, откуда приходят гости, какие дни проседают, кто возвращается, где теряются заявки и что нужно улучшить. Менеджеру проще контролировать посадку, а владелец видит картину по спросу.</p>
          <div className="stack-list">
            <div className="insight-row"><strong>Гость бронирует без звонка</strong><span>Короткая форма с телефоном снижает трение и не требует регистрации.</span></div>
            <div className="insight-row"><strong>Телефон сразу попадает в CRM</strong><span>Ресторан копит базу гостей и видит повторные визиты.</span></div>
            <div className="insight-row"><strong>Аналитика показывает точки роста</strong><span>Слабые дни, пики спроса, отмены и no-show видны в кабинете.</span></div>
          </div>
        </div>
        <RestaurantLeadForm />
      </section>
    </div>
  );
}
