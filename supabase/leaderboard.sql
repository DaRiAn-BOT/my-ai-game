-- Общий зал славы для «Стража Северной Цитадели».
-- Выполните файл в Supabase Dashboard → SQL Editor → New query.

create table if not exists public.leaderboard (
    user_id uuid primary key references auth.users(id) on delete cascade,
    display_name text not null check (char_length(display_name) between 1 and 24),
    days smallint not null check (days between 1 and 30),
    victory boolean not null default false,
    achieved_at timestamptz not null default now()
);

alter table public.leaderboard enable row level security;

-- Клиенту не нужны лишние права: только чтение общего рейтинга и запись своей строки.
revoke all on table public.leaderboard from anon, authenticated;
grant select, insert, update on table public.leaderboard to authenticated;

drop policy if exists "Authenticated players can read leaderboard" on public.leaderboard;
create policy "Authenticated players can read leaderboard"
on public.leaderboard for select
to authenticated
using (true);

drop policy if exists "Players can add their own record" on public.leaderboard;
create policy "Players can add their own record"
on public.leaderboard for insert
to authenticated
with check ((select auth.uid()) = user_id);

drop policy if exists "Players can update their own record" on public.leaderboard;
create policy "Players can update their own record"
on public.leaderboard for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create index if not exists leaderboard_ranking_idx
on public.leaderboard (victory desc, days desc, achieved_at asc);
