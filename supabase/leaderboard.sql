-- Общий зал славы для «Стража Северной Цитадели».
-- Выполните файл в Supabase Dashboard → SQL Editor → New query.

create table if not exists public.leaderboard (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references auth.users(id) on delete cascade,
    display_name text not null check (char_length(display_name) between 1 and 24),
    days smallint not null check (days between 1 and 30),
    victory boolean not null default false,
    achieved_at timestamptz not null default now()
);

-- Совместимость с ранней версией таблицы, где user_id был первичным ключом.
-- Теперь один игрок может иметь несколько завершённых походов в рейтинге.
alter table public.leaderboard add column if not exists id uuid;
update public.leaderboard set id = gen_random_uuid() where id is null;
alter table public.leaderboard alter column id set default gen_random_uuid();
alter table public.leaderboard alter column id set not null;
do $$
declare primary_key_name text;
begin
    select conname into primary_key_name
    from pg_constraint
    where conrelid = 'public.leaderboard'::regclass and contype = 'p';
    if primary_key_name is not null then
        execute format('alter table public.leaderboard drop constraint %I', primary_key_name);
    end if;
end $$;
alter table public.leaderboard add primary key (id);

alter table public.leaderboard enable row level security;

-- Общий рейтинг должен читаться без входа, но записывать поход может только
-- авторизованный владелец строки.
revoke all on table public.leaderboard from anon, authenticated;
grant select on table public.leaderboard to anon, authenticated;
grant insert on table public.leaderboard to authenticated;

drop policy if exists "Anyone can read leaderboard" on public.leaderboard;
drop policy if exists "Authenticated players can read leaderboard" on public.leaderboard;
create policy "Anyone can read leaderboard"
on public.leaderboard for select
to anon, authenticated
using (true);

drop policy if exists "Players can add their own record" on public.leaderboard;
create policy "Players can add their own record"
on public.leaderboard for insert
to authenticated
with check ((select auth.uid()) = user_id);

drop policy if exists "Players can update their own record" on public.leaderboard;

create index if not exists leaderboard_ranking_idx
on public.leaderboard (days desc, victory desc, achieved_at asc);
