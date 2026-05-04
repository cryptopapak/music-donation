-- Добавление индекса для payment_id в таблицу donations
-- Ускоряет поиск донатов по payment_id при обработке webhook

create index if not exists idx_donations_payment_id on donations(payment_id);
