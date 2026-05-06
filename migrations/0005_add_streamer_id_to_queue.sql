-- Добавление поля streamer_id в таблицу queue
-- Это поле необходимо для связывания очереди с конкретным стримером

ALTER TABLE queue 
ADD COLUMN IF NOT EXISTS streamer_id uuid REFERENCES auth.users(id);

-- Обновляем существующие записи, добавляя streamer_id из соответствующего доната
UPDATE queue 
SET streamer_id = d.user_id
FROM donations d
WHERE queue.donation_id = d.id AND queue.streamer_id IS NULL;

-- Делаем поле не nullable для новых записей (если streamer_id обязателен)
-- ALTER TABLE queue 
-- ALTER COLUMN streamer_id SET NOT NULL;

-- Обновляем RLS политику для ограничения доступа к очереди по streamer_id
DROP POLICY IF EXISTS "Anyone can view queue" ON queue;
CREATE POLICY "Users can view own queue items"
  ON queue FOR SELECT
  USING (auth.uid() = streamer_id OR auth.role() = 'service_role');

CREATE POLICY "Service can manage queue"
  ON queue FOR ALL
  USING (auth.role() = 'service_role');

-- Создаем индекс для улучшения производительности поиска
CREATE INDEX IF NOT EXISTS idx_queue_streamer_id ON queue(streamer_id);