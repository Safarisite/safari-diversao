-- =========================================================
-- SAFÁRI DIVERSÃO — BACKEND DO SAC
-- Execute este arquivo UMA VEZ no SQL Editor do Supabase.
-- =========================================================

create schema if not exists extensions;
create extension if not exists pgcrypto with schema extensions;

create table if not exists public.sac_staff (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.sac_tickets (
  id uuid primary key default gen_random_uuid(),
  protocol text not null unique,
  access_hash text not null,
  rating smallint not null check (rating between 1 and 5),
  location text not null check (char_length(location) between 2 and 160),
  visit_date date,
  category text not null check (char_length(category) between 2 and 80),
  message text not null check (char_length(message) between 5 and 3000),
  customer_name text,
  customer_email text not null,
  wants_reply boolean not null default true,
  status text not null default 'recebido' check (status in ('recebido','em_analise','aguardando_cliente','respondido','encerrado')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.sac_messages (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid not null references public.sac_tickets(id) on delete cascade,
  sender_type text not null check (sender_type in ('customer','staff')),
  sender_name text,
  body text not null check (char_length(body) between 1 and 3000),
  created_at timestamptz not null default now()
);

create index if not exists sac_tickets_created_idx on public.sac_tickets(created_at desc);
create index if not exists sac_tickets_status_idx on public.sac_tickets(status);
create index if not exists sac_messages_ticket_idx on public.sac_messages(ticket_id, created_at);

create or replace function public.sac_touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists sac_tickets_touch_updated_at on public.sac_tickets;
create trigger sac_tickets_touch_updated_at
before update on public.sac_tickets
for each row execute function public.sac_touch_updated_at();

create or replace function public.sac_touch_ticket_from_message()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.sac_tickets set updated_at = now() where id = new.ticket_id;
  return new;
end;
$$;

drop trigger if exists sac_messages_touch_ticket on public.sac_messages;
create trigger sac_messages_touch_ticket
after insert on public.sac_messages
for each row execute function public.sac_touch_ticket_from_message();

alter table public.sac_staff enable row level security;
alter table public.sac_tickets enable row level security;
alter table public.sac_messages enable row level security;

create or replace function public.is_sac_staff()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.sac_staff s
    where s.user_id = auth.uid() and s.active = true
  );
$$;

revoke all on function public.is_sac_staff() from public;
grant execute on function public.is_sac_staff() to authenticated;

drop policy if exists sac_staff_self_select on public.sac_staff;
create policy sac_staff_self_select
on public.sac_staff for select
to authenticated
using (user_id = auth.uid() and active = true);

drop policy if exists sac_staff_read_tickets on public.sac_tickets;
create policy sac_staff_read_tickets
on public.sac_tickets for select
to authenticated
using (public.is_sac_staff());

drop policy if exists sac_staff_update_tickets on public.sac_tickets;
create policy sac_staff_update_tickets
on public.sac_tickets for update
to authenticated
using (public.is_sac_staff())
with check (public.is_sac_staff());

drop policy if exists sac_staff_read_messages on public.sac_messages;
create policy sac_staff_read_messages
on public.sac_messages for select
to authenticated
using (public.is_sac_staff());

drop policy if exists sac_staff_insert_messages on public.sac_messages;
create policy sac_staff_insert_messages
on public.sac_messages for insert
to authenticated
with check (public.is_sac_staff() and sender_type = 'staff');

-- Cria um chamado sem liberar SELECT público nas tabelas.
create or replace function public.create_sac_ticket(
  p_rating smallint,
  p_location text,
  p_visit_date date,
  p_category text,
  p_message text,
  p_customer_name text,
  p_customer_email text,
  p_wants_reply boolean
)
returns table(protocol text, access_code text)
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_protocol text;
  v_access_code text;
begin
  if p_rating < 1 or p_rating > 5 then
    raise exception 'Avaliação inválida';
  end if;
  if char_length(trim(coalesce(p_location,''))) < 2 then
    raise exception 'Local inválido';
  end if;
  if char_length(trim(coalesce(p_category,''))) < 2 then
    raise exception 'Categoria inválida';
  end if;
  if char_length(trim(coalesce(p_message,''))) < 5 then
    raise exception 'Mensagem inválida';
  end if;
  if trim(coalesce(p_customer_email,'')) !~* '^[A-Z0-9._%+-]+@[A-Z0-9.-]+\\.[A-Z]{2,}$' then
    raise exception 'E-mail inválido';
  end if;

  v_protocol := 'SAF-' || to_char(now(), 'YYYYMMDD') || '-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 6));
  v_access_code := upper(substr(encode(extensions.gen_random_bytes(8), 'hex'), 1, 12));

  insert into public.sac_tickets (
    protocol, access_hash, rating, location, visit_date, category,
    message, customer_name, customer_email, wants_reply
  ) values (
    v_protocol,
    extensions.crypt(v_access_code, extensions.gen_salt('bf')),
    p_rating,
    left(trim(p_location),160),
    p_visit_date,
    left(trim(p_category),80),
    left(trim(p_message),3000),
    nullif(left(trim(coalesce(p_customer_name,'')),100),''),
    lower(left(trim(p_customer_email),180)),
    coalesce(p_wants_reply,true)
  );

  return query select v_protocol, v_access_code;
end;
$$;

revoke all on function public.create_sac_ticket(smallint,text,date,text,text,text,text,boolean) from public;
grant execute on function public.create_sac_ticket(smallint,text,date,text,text,text,text,boolean) to anon, authenticated;

-- Consulta segura usando protocolo + chave privada do cliente.
create or replace function public.get_sac_ticket(p_protocol text, p_access_code text)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_result jsonb;
begin
  select jsonb_build_object(
    'id', t.id,
    'protocol', t.protocol,
    'rating', t.rating,
    'location', t.location,
    'visit_date', t.visit_date,
    'category', t.category,
    'message', t.message,
    'customer_name', t.customer_name,
    'status', t.status,
    'created_at', t.created_at,
    'updated_at', t.updated_at,
    'messages', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'sender_type', m.sender_type,
          'sender_name', m.sender_name,
          'body', m.body,
          'created_at', m.created_at
        ) order by m.created_at
      )
      from public.sac_messages m
      where m.ticket_id = t.id
    ), '[]'::jsonb)
  ) into v_result
  from public.sac_tickets t
  where t.protocol = upper(trim(p_protocol))
    and t.access_hash = extensions.crypt(upper(trim(p_access_code)), t.access_hash);

  return v_result;
end;
$$;

revoke all on function public.get_sac_ticket(text,text) from public;
grant execute on function public.get_sac_ticket(text,text) to anon, authenticated;

create or replace function public.customer_reply_sac_ticket(
  p_protocol text,
  p_access_code text,
  p_body text
)
returns boolean
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_ticket_id uuid;
  v_status text;
begin
  if char_length(trim(coalesce(p_body,''))) < 1 then
    return false;
  end if;

  select id, status into v_ticket_id, v_status
  from public.sac_tickets
  where protocol = upper(trim(p_protocol))
    and access_hash = extensions.crypt(upper(trim(p_access_code)), access_hash);

  if v_ticket_id is null or v_status = 'encerrado' then
    return false;
  end if;

  insert into public.sac_messages(ticket_id, sender_type, sender_name, body)
  values (v_ticket_id, 'customer', 'Cliente', left(trim(p_body),3000));

  update public.sac_tickets
  set status = case when status = 'aguardando_cliente' then 'em_analise' else status end
  where id = v_ticket_id;

  return true;
end;
$$;

revoke all on function public.customer_reply_sac_ticket(text,text,text) from public;
grant execute on function public.customer_reply_sac_ticket(text,text,text) to anon, authenticated;

-- =========================================================
-- DEPOIS DE CRIAR UM USUÁRIO EM AUTH > USERS, dê acesso ao
-- equipe interna executando (troque o e-mail):
--
-- insert into public.sac_staff(user_id, display_name)
-- select id, 'SAC Safári' from auth.users
-- where email = 'sac-interno@empresa.com'
-- on conflict (user_id) do update set active = true;
-- =========================================================
