-- Включаем Realtime для таблиц
create extension if not exists "uuid-ossp";

-- Таблица донатов
create table if not exists donations (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users(id),
  amount numeric(10, 2) not null check (amount >= 10),
  track_url text not null,
  track_title text,
  track_artist text,
  provider text not null default 'mock',
  payment_id text,
  status text not null default 'pending' check (status in ('pending', 'processing', 'completed', 'failed')),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Таблица треков
create table if not exists tracks (
  id uuid default uuid_generate_v4() primary key,
  url text not null unique,
  provider text not null,
  title text,
  artist text,
  thumbnail_url text,
  duration integer,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Таблица очереди воспроизведения
create table if not exists queue (
  id uuid default uuid_generate_v4() primary key,
  track_id uuid references tracks(id) not null,
  donation_id uuid references donations(id) not null,
  position integer not null,
  status text not null default 'pending' check (status in ('pending', 'playing', 'played', 'skipped')),
  started_at timestamp with time zone,
  ended_at timestamp with time zone,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Индексы для производительности
create index if not exists idx_donations_status on donations(status);
create index if not exists idx_donations_created_at on donations(created_at);
create index if not exists idx_queue_position on queue(position);
create index if not exists idx_queue_status on queue(status);
create index if not exists idx_tracks_provider on tracks(provider);

-- RLS (Row Level Security)
alter table donations enable row level security;
alter table tracks enable row level security;
alter table queue enable row level security;

-- Политики для donations
create policy "Anyone can create donation"
  on donations for insert
  with check (true);

create policy "Users can view own donations"
  on donations for select
  using (auth.uid() = user_id);

create policy "Service can view all donations"
  on donations for select
  using (auth.role() = 'service_role');

-- Политики для tracks
create policy "Anyone can view tracks"
  on tracks for select
  using (true);

create policy "Service can manage tracks"
  on tracks for all
  using (auth.role() = 'service_role');

-- Политики для queue
create policy "Anyone can view queue"
  on queue for select
  using (true);

create policy "Service can manage queue"
  on queue for all
  using (auth.role() = 'service_role');

-- Функция для обновления updated_at
create or replace function update_updated_at_column()
returns trigger as $$
begin
  new.updated_at = timezone('utc'::text, now());
  return new;
end;
$$ language plpgsql;

-- Триггеры для updated_at
create trigger set_donations_updated_at
  before update on donations
  for each row
  execute function update_updated_at_column();

create trigger set_queue_updated_at
  before update on queue
  for each row
  execute function update_updated_at_column();

-- Функция для добавления трека в очередь
create or replace function add_track_to_queue()
returns trigger as $$
declare
  new_position integer;
  track_record tracks%rowtype;
begin
  -- Получаем текущую позицию
  select coalesce(max(position), 0) + 1 into new_position from queue where status = 'pending';
  
  -- Проверяем, существует ли трек
  select * into track_record from tracks where url = new.track_url;
  
  if track_record.id is null then
    -- Создаем новый трек
    insert into tracks (url, provider, title, artist, thumbnail_url)
    values (
      new.track_url,
      new.provider,
      new.track_title,
      new.track_artist,
      null
    )
    returning * into track_record;
  end if;
  
  -- Добавляем в очередь
  insert into queue (track_id, donation_id, position, status)
  values (track_record.id, new.id, new_position, 'pending');
  
  return new;
end;
$$ language plpgsql;

-- Триггер для добавления в очередь после создания доната
create trigger on_donation_created
  after insert on donations
  for each row
  execute function add_track_to_queue();

-- Таблица стримеров
create table if not exists streamers (
  id uuid default uuid_generate_v4() primary key,
  twitch_id text not null unique,
  username text not null unique,
  display_name text,
  profile_image_url text,
  broadcaster_type text check (broadcaster_type in ('affiliate', 'partner', 'none')),
  view_count integer default 0,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Индекс для username
create index if not exists idx_streamers_username on streamers(username);

-- RLS для streamers
alter table streamers enable row level security;

-- Политики для streamers
create policy "Anyone can view streamers"
  on streamers for select
  using (true);

create policy "Service can manage streamers"
  on streamers for all
  using (auth.role() = 'service_role');

-- Realtime publications
create publication supabase_realtime for table donations, queue, streamers;
