# 🚀 Деплой на Vercel

## 1. Подготовка репозитория

```bash
cd music-donation
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/your-username/music-donation.git
git push -u origin main
```

## 2. Деплой на Vercel

1. Перейдите на [vercel.com](https://vercel.com)
2. Нажмите "Add New Project"
3. Импортируйте репозиторий GitHub
4. Vercel автоматически обнаружит Next.js

## 3. Переменные окружения

В Vercel Dashboard → Settings → Environment Variables добавьте:

```
NEXT_PUBLIC_SUPABASE_URL=your-supabase-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
SUPABASE_SERVICE_KEY=your-supabase-service-key
PAYMENT_PROVIDER=mock
NEXT_PUBLIC_APP_URL=https://your-app.vercel.app
```

## 4. Настройка Supabase

1. Создайте проект на [supabase.com](https://supabase.com)
2. Скопируйте URL и анонимный ключ в `.env.local`
3. Запустите SQL схему из `lib/schema.sql` в SQL Editor
4. Скопируйте service key для серверных операций

## 5. Настройка платежей (опционально)

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

## 6. Домен

Vercel автоматически выдаст поддомен `.vercel.app`. Можно подключить кастомный домен в Settings → Domains.

## 7. Realtime

Supabase Realtime включен по умолчанию для таблиц с publication. Убедитесь, что в SQL схеме есть:

```sql
create publication supabase_realtime for table donations, queue;
```

## 8. Мониторинг

- Логи: Vercel Dashboard → Functions → Logs
- Аналитика: Vercel Analytics (включить в Settings)
-uptime: UptimeRobot для мониторинга доступности
