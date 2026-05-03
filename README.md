# 🎵 Music Donation MVP

Сервис для доната музыки с автоматическим воспроизведением треков.

## 🚀 БЫСТРЫЙ ЗАПУСК (БЕЗ SUPABASE)

### Шаг 1: Установите Node.js
Скачайте и установите Node.js: https://nodejs.org/

### Шаг 2: Запустите проект
```bash
cd music-donation
npm install
npm run dev
```

### Шаг 3: Откройте браузер
Перейдите на http://localhost:3000

### Шаг 4: Сделайте донат
1. Введите сумму (минимум 10 ₽)
2. Вставьте ссылку на YouTube/SoundCloud
3. Нажмите "Отправить донат"

Трек автоматически добавится в очередь и начнёт воспроизводиться!

---

## 📦 Деплой на Vercel

1. Подключите репозиторий к [Vercel](https://vercel.com)
2. Добавьте переменную `NEXT_PUBLIC_USE_MOCK=true` в Environment Variables
3. Нажмите "Deploy"

---

## 🛠️ Стек

- **Frontend**: Next.js 14 (App Router), React, TypeScript, TailwindCSS
- **Backend**: Next.js API Routes
- **Storage**: In-memory (mock) или Supabase (production)
- **Payments**: Mock (development) / YuKassa / CloudPayments

---

## 📝 Структура проекта

```
├── app/              # Next.js App Router
├── components/       # React компоненты
├── lib/             # Утилиты и клиенты
├── public/          # Статические файлы
└── types/           # TypeScript типы
```

---

## 🔧 Настройка Supabase (опционально)

Для production используйте Supabase вместо mock-режима:

1. Создайте проект на [supabase.com](https://supabase.com)
2. Скопируйте URL и анонимный ключ в `.env.local`
3. Запустите SQL схему из `lib/schema.sql` в SQL Editor
4. Удалите строку `NEXT_PUBLIC_USE_MOCK=true` из `.env.local`

---

## 💳 Настройка платежей

По умолчанию используется mock-режим. Для реальных платежей:

### ЮKassa
```
PAYMENT_PROVIDER=yukassa
YUKASSA_SHOP_ID=your-shop-id
YUKASSA_SECRET_KEY=your-secret-key
```

### CloudPayments
```
PAYMENT_PROVIDER=cloudpayments
CLOUDPAYMENTS_PUBLIC_ID=your-public-id
CLOUDPAYMENTS_SECRET_KEY=your-secret-key
```

---

## 📚 Документация

- [`deploy.md`](deploy.md) — подробная инструкция деплоя
- [`SECURITY.md`](SECURITY.md) — меры безопасности
