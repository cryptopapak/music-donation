'use client';

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-slate-900 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-white mb-8 text-center">
          ПОЛИТИКА КОНФИДЕНЦИАЛЬНОСТИ
        </h1>
        
        <div className="prose prose-invert max-w-none text-slate-300">
          <section className="mb-8">
            <h2 className="text-xl font-semibold text-white mb-4">1. Общие положения</h2>
            <p className="mb-4">
              Настоящая Политика конфиденциальности (далее — "Политика") определяет порядок сбора, хранения и 
              использования персональных данных пользователей Сервиса Music Donation.
            </p>
            <p className="mb-4">
              Администратор Сервиса обязуется соблюдать конфиденциальность персональных данных, полученных в 
              результате использования Сервиса.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-white mb-4">2. Сбор персональных данных</h2>
            <p className="mb-4">
              При использовании Сервиса могут собираться следующие персональные данные:
            </p>
            <ul className="list-disc list-inside mb-4 space-y-2">
              <li>Имя пользователя</li>
              <li>Адрес электронной почты (email)</li>
              <li>Идентификатор платежной системы (при оплате)</li>
              <li>IP-адрес (для обеспечения безопасности)</li>
            </ul>
            <p className="mb-4">
              Дополнительные данные могут собираться через технологии отслеживания (cookies, web storage) для 
              улучшения работы Сервиса.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-white mb-4">3. Цели обработки данных</h2>
            <p className="mb-4">
              Персональные данные используются исключительно для следующих целей:
            </p>
            <ul className="list-disc list-inside mb-4 space-y-2">
              <li>Оказание услуги добавления трека в очередь</li>
              <li>Обработка платежей через платежные системы</li>
              <li>Уведомление пользователя о статусе заказа</li>
              <li>Обеспечение безопасности и предотвращение мошенничества</li>
              <li>Улучшение качества Сервиса</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-white mb-4">4. Хранение данных</h2>
            <p className="mb-4">
              Персональные данные хранятся на защищенных серверах платежных систем и/или в базе данных Сервиса. 
              Данные хранятся в течение срока, необходимого для исполнения обязательств по договору и в соответствии 
              с действующим законодательством.
            </p>
            <p className="mb-4">
              Пользователь имеет право запросить удаление своих персональных данных, направив запрос на электронную 
              почту администратора.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-white mb-4">5. Передача данных третьим лицам</h2>
            <p className="mb-4">
              Персональные данные не передаются третьим лицам, за исключением случаев:
            </p>
            <ul className="list-disc list-inside mb-4 space-y-2">
              <li>Передача данных платежным системам для обработки платежей</li>
              <li>Передача данных по требованию законных органов власти</li>
              <li>Передача данных с согласия пользователя</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-white mb-4">6. Безопасность данных</h2>
            <p className="mb-4">
              Администратор принимает все разумные меры для защиты персональных данных от несанкционированного 
              доступа, утечки или уничтожения. Это включает шифрование данных, использование защищенных соединений 
              и соблюдение стандартов безопасности.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-white mb-4">7. Права пользователей</h2>
            <p className="mb-4">
              Пользователь имеет право:
            </p>
            <ul className="list-disc list-inside mb-4 space-y-2">
              <li>Получить информацию о своих персональных данных</li>
              <li>Требовать исправления неточных данных</li>
              <li>Требовать удаления персональных данных</li>
              <li>Отозвать согласие на обработку данных</li>
              <li>Подать жалобу в надзорный орган</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-white mb-4">8. Изменения в Политике</h2>
            <p className="mb-4">
              Администратор оставляет за собой право вносить изменения в Политику без предварительного уведомления. 
              Новая редакция Политики вступает в силу с момента ее размещения на сайте.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-white mb-4">9. Контактная информация</h2>
          </section>
        </div>
      </div>
    </div>
  );
}
