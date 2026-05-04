-- Добавление поля donor_name в таблицу donations
-- Это поле хранит имя донора, которое используется в API для отображения

ALTER TABLE donations 
ADD COLUMN IF NOT EXISTS donor_name text;

-- Обновляем существующие записи, используя track_artist как donor_name
-- (если track_artist не null, используем его, иначе пустая строка)
UPDATE donations 
SET donor_name = track_artist 
WHERE donor_name IS NULL AND track_artist IS NOT NULL;

-- Делаем поле не nullable по умолчанию
ALTER TABLE donations 
ALTER COLUMN donor_name SET DEFAULT '';

-- Добавляем RLS политику для нового поля (тот же доступ, что и для всей таблицы)
-- Политики уже настроены для таблицы donations, поэтому дополнительных изменений не требуется
