-- Миграция для очистки старых треков с provider='yookassa' и title=NULL
-- Эти треки не имеют метаданных и не должны отображаться в очереди

-- Удаление треков без метаданных
DELETE FROM tracks 
WHERE title IS NULL AND provider = 'yookassa';

-- Удаление записей из queue, которые ссылаются на удаленные треки
DELETE FROM queue 
WHERE track_id NOT IN (SELECT id FROM tracks);
