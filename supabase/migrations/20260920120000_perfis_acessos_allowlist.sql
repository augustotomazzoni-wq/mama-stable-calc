-- Perfis de acesso, allowlist de e-mails e histórico de logins.
-- Seguro para rodar mais de uma vez.

-- ============================================================
-- 1. Papéis
-- ============================================================
do $$
begin
  create type public.app_role as enum ('admin', 'usuario');
exception
  when duplicate_object then null;
end $$;

create table if not exists public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.app_role not null default 'usuario',
  created_at timestamptz not null default now(),
  unique (user_id, role)
);

alter table public.user_roles enable row level security;

-- SECURITY DEFINER para a policy não consultar a própria tabela sob RLS
-- (isso causaria recursão infinita).
create or replace function public.has_role(_user_id uuid, _role public.app_role)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.user_roles
     where user_id = _user_id and role = _role
  );
$$;

-- Qualquer papel serve como "tem acesso ao sistema".
create or replace function public.tem_acesso(_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.user_roles where user_id = _user_id);
$$;

drop policy if exists "Usuario ve o proprio papel" on public.user_roles;
create policy "Usuario ve o proprio papel"
  on public.user_roles for select
  to authenticated
  using (user_id = auth.uid() or public.has_role(auth.uid(), 'admin'));

drop policy if exists "Admin gerencia papeis" on public.user_roles;
create policy "Admin gerencia papeis"
  on public.user_roles for all
  to authenticated
  using (public.has_role(auth.uid(), 'admin'))
  with check (public.has_role(auth.uid(), 'admin'));

-- ============================================================
-- 2. Allowlist: só quem o administrador liberar consegue criar acesso
-- ============================================================
create table if not exists public.usuarios_autorizados (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  nome text,
  papel public.app_role not null default 'usuario',
  ativo boolean not null default true,
  criado_por uuid references auth.users(id) on delete set null,
  criado_em timestamptz not null default now(),
  usado_em timestamptz
);

alter table public.usuarios_autorizados enable row level security;

drop policy if exists "Admin gerencia autorizados" on public.usuarios_autorizados;
create policy "Admin gerencia autorizados"
  on public.usuarios_autorizados for all
  to authenticated
  using (public.has_role(auth.uid(), 'admin'))
  with check (public.has_role(auth.uid(), 'admin'));

-- ============================================================
-- 3. Cadastro só para e-mail liberado, com o papel já aplicado
-- ============================================================
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  autorizado public.usuarios_autorizados%rowtype;
begin
  select * into autorizado
    from public.usuarios_autorizados
   where lower(email) = lower(new.email)
     and ativo;

  if not found then
    raise exception 'EMAIL_NAO_AUTORIZADO';
  end if;

  insert into public.user_roles (user_id, role)
  values (new.id, autorizado.papel)
  on conflict (user_id, role) do nothing;

  update public.usuarios_autorizados
     set usado_em = now()
   where id = autorizado.id;

  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============================================================
-- 4. Histórico de acesso
-- ============================================================
create table if not exists public.acessos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  email text,
  tipo text not null default 'login',
  ocorrido_em timestamptz not null default now(),
  user_agent text
);

create index if not exists idx_acessos_ocorrido_em on public.acessos (ocorrido_em desc);

alter table public.acessos enable row level security;

drop policy if exists "Registra o proprio acesso" on public.acessos;
create policy "Registra o proprio acesso"
  on public.acessos for insert
  to authenticated
  with check (user_id = auth.uid());

drop policy if exists "Admin ve os acessos" on public.acessos;
create policy "Admin ve os acessos"
  on public.acessos for select
  to authenticated
  using (public.has_role(auth.uid(), 'admin'));

-- ============================================================
-- 5. Cálculos: só para quem tem papel atribuído
--    (as policies antigas liberavam qualquer sessão autenticada)
-- ============================================================
drop policy if exists "Authenticated users can view consultas" on public.consultas_calculo;
drop policy if exists "Authenticated users can insert consultas" on public.consultas_calculo;
drop policy if exists "Authenticated users can update consultas" on public.consultas_calculo;
drop policy if exists "Authenticated users can delete consultas" on public.consultas_calculo;

create policy "Equipe ve consultas"
  on public.consultas_calculo for select
  to authenticated
  using (public.tem_acesso(auth.uid()));

create policy "Equipe insere consultas"
  on public.consultas_calculo for insert
  to authenticated
  with check (public.tem_acesso(auth.uid()));

create policy "Equipe atualiza consultas"
  on public.consultas_calculo for update
  to authenticated
  using (public.tem_acesso(auth.uid()))
  with check (public.tem_acesso(auth.uid()));

create policy "Equipe exclui consultas"
  on public.consultas_calculo for delete
  to authenticated
  using (public.tem_acesso(auth.uid()));

-- ============================================================
-- 6. Administrador inicial
-- ============================================================
insert into public.usuarios_autorizados (email, nome, papel)
values ('augusto.tomazzoni@gmail.com', 'Augusto Tomazzoni', 'admin')
on conflict (email) do update
  set papel = 'admin',
      ativo = true;

-- Se a conta já existir no Auth, garante o papel de administrador.
insert into public.user_roles (user_id, role)
select u.id, 'admin'::public.app_role
  from auth.users u
 where lower(u.email) = 'augusto.tomazzoni@gmail.com'
on conflict (user_id, role) do nothing;
