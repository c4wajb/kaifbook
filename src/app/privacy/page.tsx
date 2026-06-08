import Link from "next/link";

export default function PrivacyPage() {
  return (
    <main className="page legal-page">
      <p className="eyebrow">Kaifbook</p>
      <h1>Политика конфиденциальности</h1>
      <p>Kaifbook хранит данные, которые нужны для оформления и сопровождения бронирования: имя, телефон, параметры визита и историю заявок.</p>
      <p>Данные передаются ресторану, в который гость отправляет заявку. Kaifbook не принимает платежи гостей и не хранит банковские карты.</p>
      <p>Для входа в личный кабинет могут использоваться VK ID, VK-сообщество или MAX. Эти сервисы передают только данные, необходимые для подтверждения заявки.</p>
      <p>По вопросам обработки данных напишите на <a href="mailto:admin@kaifbook.ru">admin@kaifbook.ru</a>.</p>
      <Link className="small-button" href="/restaurants">Вернуться к ресторанам</Link>
    </main>
  );
}
