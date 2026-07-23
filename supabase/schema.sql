-- ============================================================================
-- Prode Argentino — Migración de esquema (idempotente)
-- ============================================================================
-- Ejecutar UNA VEZ en Supabase → SQL Editor → New query → Run.
-- Se puede volver a ejecutar sin romper nada (usa IF NOT EXISTS / CREATE OR REPLACE).
--
-- Arregla el problema raíz: las tablas `predictions` y `matches` no tenían las
-- columnas que la app necesita (no se podían guardar pronósticos ni calcular
-- puntos). También crea el motor de puntuación estilo Mercado Pago, el ranking
-- global y las políticas de seguridad (RLS).
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1) Columnas faltantes
-- ---------------------------------------------------------------------------

-- matches: id, home_team, away_team, match_date, home_score, away_score, status
alter table public.matches add column if not exists api_id     bigint;
alter table public.matches add column if not exists round      text;
alter table public.matches add column if not exists home_logo  text;
alter table public.matches add column if not exists away_logo  text;
-- "Partido de la Fecha": vale doble.
alter table public.matches add column if not exists featured   boolean not null default false;

-- Evita duplicados al sincronizar por id de la API.
-- IMPORTANTE: índice único COMPLETO (no parcial): el upsert de Supabase
-- (ON CONFLICT api_id) no puede usar índices parciales. Los NULL no chocan
-- entre sí en un índice único, así que es seguro.
drop index if exists matches_api_id_key;
create unique index if not exists matches_api_id_key on public.matches (api_id);

-- Limpieza: borra los partidos de prueba viejos (sin id de la API) y sus
-- pronósticos asociados, para que solo queden los datos reales de ESPN.
delete from public.predictions
  where match_id in (select id from public.matches where api_id is null);
delete from public.matches where api_id is null;

-- predictions: le faltaban las columnas del marcador pronosticado (¡crítico!)
alter table public.predictions add column if not exists predicted_home_score int;
alter table public.predictions add column if not exists predicted_away_score int;
alter table public.predictions add column if not exists updated_at timestamptz not null default now();

-- Un solo pronóstico por usuario y partido (necesario para el upsert onConflict).
create unique index if not exists predictions_user_match_key
  on public.predictions (user_id, match_id);

-- ---------------------------------------------------------------------------
-- 2) Alta automática del perfil al registrarse
--    (antes: un usuario se registraba en auth pero nunca aparecía en public.users,
--     por eso el admin no podía verlo ni aprobarlo y quedaba trabado)
-- ---------------------------------------------------------------------------

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.users (id, email, display_name, is_approved, is_admin)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1)),
    false,
    false
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- 3) Helper de admin (SECURITY DEFINER para no recursar en las políticas RLS)
-- ---------------------------------------------------------------------------

create or replace function public.is_admin(uid uuid)
returns boolean
language sql
security definer set search_path = public
stable
as $$
  select coalesce((select is_admin from public.users where id = uid), false);
$$;

-- ---------------------------------------------------------------------------
-- 4) Motor de puntuación estilo Mercado Pago
--    6 pts = resultado exacto | 3 pts = acierta ganador/empate | 0 = falla
--    Recalcula TODOS los pronósticos de partidos finalizados.
-- ---------------------------------------------------------------------------

create or replace function public.recalculate_points()
returns void
language sql
security definer set search_path = public
as $$
  update public.predictions p
  set points_earned = (
      case
        when m.home_score = p.predicted_home_score
         and m.away_score = p.predicted_away_score then 6
        when sign(m.home_score - m.away_score)
           = sign(p.predicted_home_score - p.predicted_away_score) then 3
        else 0
      end
      -- Partido de la Fecha: los puntos valen doble.
      * case when m.featured then 2 else 1 end
    )
  from public.matches m
  where p.match_id = m.id
    and m.status = 'finished'
    and m.home_score is not null
    and m.away_score is not null
    and p.predicted_home_score is not null
    and p.predicted_away_score is not null;
$$;

-- ---------------------------------------------------------------------------
-- 5) Ranking global (suma de puntos por usuario, saltea RLS con SECURITY DEFINER)
-- ---------------------------------------------------------------------------

create or replace function public.get_leaderboard()
returns table (user_id uuid, display_name text, points bigint)
language sql
security definer set search_path = public
stable
as $$
  select u.id,
         coalesce(u.display_name, split_part(u.email, '@', 1)) as display_name,
         coalesce(sum(p.points_earned), 0) as points
  from public.users u
  left join public.predictions p on p.user_id = u.id
  where u.is_approved = true
  group by u.id, u.display_name, u.email
  order by points desc, display_name asc;
$$;

-- ---------------------------------------------------------------------------
-- 5b) Estadísticas del jugador (perfil estilo videojuego)
-- ---------------------------------------------------------------------------

create or replace function public.get_user_stats(uid uuid)
returns table (
  played        bigint,
  exact_count   bigint,
  correct_count bigint,
  zero_count    bigint,
  total_points  bigint,
  accuracy      numeric,
  best_streak   int,
  rank_position bigint
)
language plpgsql
security definer set search_path = public
stable
as $$
declare
  streak int := 0;
  best   int := 0;
  rec    record;
begin
  -- Mejor racha: aciertos (puntos > 0) consecutivos, en orden cronológico.
  for rec in
    select p.points_earned as pts
    from public.predictions p
    join public.matches m on m.id = p.match_id
    where p.user_id = uid and m.status = 'finished' and p.points_earned is not null
    order by m.match_date asc
  loop
    if rec.pts > 0 then
      streak := streak + 1;
      if streak > best then best := streak; end if;
    else
      streak := 0;
    end if;
  end loop;

  return query
  with mine as (
    select
      (m.home_score = p.predicted_home_score and m.away_score = p.predicted_away_score) as is_exact,
      (sign(m.home_score - m.away_score) = sign(p.predicted_home_score - p.predicted_away_score)) as is_outcome,
      p.points_earned as pts
    from public.predictions p
    join public.matches m on m.id = p.match_id
    where p.user_id = uid
      and m.status = 'finished'
      and p.predicted_home_score is not null
  ),
  agg as (
    select
      count(*)                                          as played,
      count(*) filter (where is_exact)                  as exact_count,
      count(*) filter (where is_outcome and not is_exact) as correct_count,
      count(*) filter (where not is_outcome)            as zero_count,
      coalesce(sum(pts), 0)                             as total_points
    from mine
  ),
  pos as (
    select r.rnk from (
      select l.user_id, rank() over (order by l.points desc) as rnk
      from public.get_leaderboard() l
    ) r where r.user_id = uid
  )
  select
    a.played, a.exact_count, a.correct_count, a.zero_count, a.total_points,
    case when a.played > 0
      then round(100.0 * (a.exact_count + a.correct_count) / a.played, 1)
      else 0 end,
    best,
    coalesce((select rnk from pos), 0)
  from agg a;
end;
$$;

-- ---------------------------------------------------------------------------
-- 6) Seguridad a nivel de fila (RLS)
-- ---------------------------------------------------------------------------

-- matches: todos los logueados leen; solo admins escriben.
alter table public.matches enable row level security;
drop policy if exists matches_select on public.matches;
create policy matches_select on public.matches
  for select to authenticated using (true);
drop policy if exists matches_admin_write on public.matches;
create policy matches_admin_write on public.matches
  for all to authenticated
  using (public.is_admin(auth.uid()))
  with check (public.is_admin(auth.uid()));

-- predictions: cada usuario gestiona las suyas.
alter table public.predictions enable row level security;
drop policy if exists predictions_select_own on public.predictions;
create policy predictions_select_own on public.predictions
  for select to authenticated using (auth.uid() = user_id);
drop policy if exists predictions_insert_own on public.predictions;
create policy predictions_insert_own on public.predictions
  for insert to authenticated with check (auth.uid() = user_id);
drop policy if exists predictions_update_own on public.predictions;
create policy predictions_update_own on public.predictions
  for update to authenticated using (auth.uid() = user_id);

-- users: cada uno lee su perfil; los admins ven y aprueban a todos.
alter table public.users enable row level security;
drop policy if exists users_select on public.users;
create policy users_select on public.users
  for select to authenticated
  using (auth.uid() = id or public.is_admin(auth.uid()));
drop policy if exists users_update_self on public.users;
create policy users_update_self on public.users
  for update to authenticated
  using (auth.uid() = id or public.is_admin(auth.uid()))
  with check (auth.uid() = id or public.is_admin(auth.uid()));

-- ---------------------------------------------------------------------------
-- 6b) Grupos privados (ranking entre amigos)
-- ---------------------------------------------------------------------------

create unique index if not exists groups_invite_code_key on public.groups (invite_code);
create unique index if not exists group_members_pk on public.group_members (group_id, user_id);

-- Fecha del torneo argentino desde la que puntúa el torneo (null = cuenta todo).
alter table public.groups add column if not exists start_round text;

-- Helper de membresía (SECURITY DEFINER para no recursar en las políticas).
create or replace function public.is_group_member(gid uuid, uid uuid)
returns boolean
language sql
security definer set search_path = public
stable
as $$
  select exists (
    select 1 from public.group_members where group_id = gid and user_id = uid
  );
$$;

-- Crear torneo: genera un código de invitación único, suma al creador y
-- permite elegir desde qué fecha del torneo argentino empieza a puntuar.
drop function if exists public.create_group(text);
create or replace function public.create_group(p_name text, p_start_round text default null)
returns table (id uuid, invite_code text)
language plpgsql
security definer set search_path = public
as $$
declare
  new_id uuid;
  code   text;
begin
  if auth.uid() is null then raise exception 'No autorizado'; end if;
  if coalesce(trim(p_name), '') = '' then raise exception 'El nombre es obligatorio'; end if;

  loop
    code := upper(substring(md5(random()::text) for 6));
    exit when not exists (select 1 from public.groups g where g.invite_code = code);
  end loop;

  insert into public.groups (name, owner_id, invite_code, start_round)
  values (trim(p_name), auth.uid(), code, nullif(trim(coalesce(p_start_round, '')), ''))
  returning groups.id into new_id;

  insert into public.group_members (group_id, user_id)
  values (new_id, auth.uid())
  on conflict do nothing;

  return query select new_id, code;
end;
$$;

-- Unirse a un grupo por código de invitación.
create or replace function public.join_group(p_code text)
returns uuid
language plpgsql
security definer set search_path = public
as $$
declare
  gid uuid;
begin
  if auth.uid() is null then raise exception 'No autorizado'; end if;

  select g.id into gid from public.groups g
  where g.invite_code = upper(trim(p_code));
  if gid is null then raise exception 'Código inválido'; end if;

  insert into public.group_members (group_id, user_id)
  values (gid, auth.uid())
  on conflict do nothing;

  return gid;
end;
$$;

-- Mis torneos, con cantidad de miembros, mis puntos en cada uno y su fecha de inicio.
drop function if exists public.my_groups();
create or replace function public.my_groups()
returns table (id uuid, name text, invite_code text, members bigint, my_points bigint, start_round text)
language sql
security definer set search_path = public
stable
as $$
  select g.id, g.name, g.invite_code,
         (select count(*) from public.group_members gm2 where gm2.group_id = g.id) as members,
         coalesce((
           select sum(p.points_earned)
           from public.predictions p
           join public.matches m on m.id = p.match_id
           where p.user_id = auth.uid()
             and (g.start_round is null or m.round >= g.start_round)
         ), 0) as my_points,
         g.start_round
  from public.groups g
  join public.group_members gm on gm.group_id = g.id and gm.user_id = auth.uid()
  order by g.created_at desc;
$$;

-- Ranking dentro de un torneo (solo miembros). Puntúa desde la fecha elegida.
create or replace function public.get_group_leaderboard(gid uuid)
returns table (user_id uuid, display_name text, points bigint)
language sql
security definer set search_path = public
stable
as $$
  select u.id,
         coalesce(u.display_name, split_part(u.email, '@', 1)) as display_name,
         coalesce(sum(p.points_earned) filter (
           where gr.start_round is null or m.round >= gr.start_round
         ), 0) as points
  from public.group_members gm
  join public.groups gr on gr.id = gm.group_id
  join public.users u on u.id = gm.user_id
  left join public.predictions p on p.user_id = u.id
  left join public.matches m on m.id = p.match_id
  where gm.group_id = gid
    and public.is_group_member(gid, auth.uid())  -- el que consulta debe ser miembro
  group by u.id, u.display_name, u.email
  order by points desc, display_name asc;
$$;

-- ---------------------------------------------------------------------------
-- 6c) Pronósticos de compañeros de torneo
--     Solo visibles cuando el partido YA EMPEZÓ (en vivo o finalizado):
--     antes de la hora de inicio nadie puede espiar ni copiarse.
-- ---------------------------------------------------------------------------

create or replace function public.get_match_predictions(mid uuid)
returns table (display_name text, predicted_home_score int, predicted_away_score int, points_earned int)
language sql
security definer set search_path = public
stable
as $$
  select coalesce(u.display_name, split_part(u.email, '@', 1)) as display_name,
         p.predicted_home_score,
         p.predicted_away_score,
         p.points_earned
  from public.predictions p
  join public.users u on u.id = p.user_id
  join public.matches m on m.id = p.match_id
  where p.match_id = mid
    -- el partido tiene que haber empezado (por estado o por hora)
    and (m.status <> 'pending' or m.match_date <= now())
    -- se ven los propios y los de quienes comparten al menos un torneo
    and (
      p.user_id = auth.uid()
      or exists (
        select 1
        from public.group_members a
        join public.group_members b on b.group_id = a.group_id
        where a.user_id = auth.uid()
          and b.user_id = p.user_id
      )
    )
  order by p.points_earned desc nulls last, display_name asc;
$$;

-- RLS: lectura para miembros; la escritura pasa por las RPC de arriba.
alter table public.groups enable row level security;
drop policy if exists groups_select on public.groups;
create policy groups_select on public.groups
  for select to authenticated
  using (owner_id = auth.uid() or public.is_group_member(id, auth.uid()));

alter table public.group_members enable row level security;
drop policy if exists group_members_select on public.group_members;
create policy group_members_select on public.group_members
  for select to authenticated
  using (user_id = auth.uid() or public.is_group_member(group_id, auth.uid()));

-- ---------------------------------------------------------------------------
-- 7) Bootstrap del primer admin
--    Registrate primero en la app con este email, luego corré este UPDATE.
-- ---------------------------------------------------------------------------
update public.users
  set is_admin = true, is_approved = true
  where email = 'javieramado91@gmail.com';

-- Listo. Después de esto, entrá a /admin y usá "Sincronizar Partidos".
