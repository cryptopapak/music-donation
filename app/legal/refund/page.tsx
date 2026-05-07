'use client';

export default function RefundPage() {
  return (
    <div className="min-h-screen bg-slate-900 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-white mb-8 text-center">
          ПОЛИТИКА ВОЗВРАТА
        </h1>
        
        <div className="prose prose-invert max-w-none text-slate-300">
          <section className="mb-8">
            <h2 className="text-xl font-semibold text-white mb-4">1. Общие положения</h2>
            <p className="mb-4">
              Настоящая Политика возврата определяет условия возврата денежных средств, уплаченных за услуги 
              Сервиса Music Donation.
            </p>
            <p className="mb-4">
              Все вопросы, связанные с возвратом средств, регулируются условиями настоящей Политики.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-white mb-4">2. Общие правила возврата</h2>
            <p className="mb-4">
              2.1. Денежные средства, уплаченные за услуги Сервиса, подлежат возврату только в случаях, 
              предусмотренных настоящей Политикой.
            </p>
            <p className="mb-4">
              2.2. Возврат денежных средств возможен только по запросу самого плательщика или лица, 
              указавшего свои платежные данные при оплате.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-white mb-4">3. Услуга считается оказанной</h2>
            <p className="mb-4">
              3.1. Услуга по добавлению музыкального трека в очередь воспроизведения считается оказанной 
              с момента добавления трека в очередь.
            </p>
            <p className="mb-4">
              3.2. После оказания услуги возврат денежных средств <strong>не производится</strong>, за 
              исключением случаев технических ошибок.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-white mb-4">4. Случаи возврата</h2>
            <p className="mb-4">
              Возврат денежных средств возможен в следующих случаях:
            </p>
            <ul className="list-disc list-inside mb-4 space-y-2">
              <li><strong>Техническая ошибка:</strong> если трек не был добавлен в очередь из-за технической 
              ошибки Сервиса, возврат возможен по запросу пользователя.</li>
              <li><strong>Повторная оплата:</strong> если сумма была списана дважды по вине Сервиса, 
              возврат возможен по запросу пользователя.</li>
              <li><strong>Ошибочный платеж:</strong> если платеж был совершен по ошибке (неверная сумма, 
              неверный аккаунт), возврат возможен при предоставлении подтверждающих документов.</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-white mb-4">5. Случаи, когда возврат невозможен</h2>
            <p className="mb-4">
              Возврат денежных средств <strong>не производится</strong> в следующих случаях:
            </p>
            <ul className="list-disc list-inside mb-4 space-y-2">
              <li>Трек был успешно добавлен в очередь и воспроизведен.</li>
              <li>Пользователь передумал после оплаты (добровольный отказ от услуги).</li>
              <li>Трек не был добавлен по вине пользователя (некорректная ссылка, нарушение правил и т.д.).</li>
              <li>Прошло более 30 дней с момента оплаты.</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-white mb-4">6. Порядок возврата</h2>
            <p className="mb-4">
              6.1. Для запроса возврата денежных средств пользователь должен направить письмо на 
              электронную почту администратора с указанием:
            </p>
            <ul className="list-disc list-inside mb-4 space-y-2">
              <li>Номера платежа или транзакции</li>
              <li>Суммы платежа</li>
              <li>Дата платежа</li>
              <li>Причины возврата</li>
              <li>Контактные данные</li>
            </ul>
            <p className="mb-4">
              6.2. Администратор рассматривает запрос в течение 5-10 рабочих дней и информирует пользователя 
              о решении.
            </p>
            <p className="mb-4">
              6.3. Возврат осуществляется на тот же платежный счет, с которого был совершен платеж.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-white mb-4">7. Сроки возврата</h2>
            <p className="mb-4">
              Срок возврата денежных средств зависит от платежной системы и составляет от 3 до 30 рабочих дней 
              с момента принятия положительного решения.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-white mb-4">8. Контактная информация</h2>
          </section>
        </div>
      </div>
    </div>
  );
}
