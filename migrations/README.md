# Установка Supabase CLI

## Вариант 1: Установка через npm (рекомендуется)

```bash
npm install -g supabase
```

После установки проверьте версию:
```bash
supabase --version
```

## Вариант 2: Установка через Chocolatey (Windows)

```bash
choco install supabase
```

## Вариант 3: Установка через winget (Windows)

```bash
winget install Supabase
```

## Настройка проекта

1. Инициализируйте проект Supabase:
```bash
supabase init
```

2. Подключитесь к вашему проекту Supabase:
```bash
supabase link --project-ref your-project-ref
```

3. Примените миграции:
```bash
supabase db push
```

## Альтернатива: Выполнение через Supabase Dashboard

Если CLI не установлен, выполните SQL-скрипт вручную:

1. Откройте [Supabase Dashboard](https://app.supabase.com/)
2. Перейдите в ваш проект
3. Откройте **SQL Editor**
4. Скопируйте содержимое файла `migrations/0001_initial_schema.sql`
5. Вставьте в редактор и нажмите **Run**

## Проверка миграций

После выполнения миграций проверьте наличие таблиц:
```sql
select * from information_schema.tables where table_schema = 'public';
```
