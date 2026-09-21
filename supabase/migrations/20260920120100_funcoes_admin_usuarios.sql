-- Funções usadas pela tela de usuários. Rodar depois da migration de perfis.
-- Todas são SECURITY DEFINER porque precisam enxergar auth.users, e todas
-- verificam o papel de administrador antes de qualquer alteração.

-- ============================================================
-- Lista de acessos com o status real de cada um
-- ============================================================
create or replace function public.listar_usuarios()
returns table (
  email text,
  nome text,
  papel public.app_role,
  ativo boolean,
  criado_em timestamptz,
  usado_em timestamptz,
  tem_conta boolean,
  ultimo_acesso timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  select
    ua.email,
    ua.nome,
    ua.papel,
    ua.ativo,
    ua.criado_em,
    ua.usado_em,
    exists (select 1 from auth.users u where lower(u.email) = lower(ua.email)) as tem_conta,
    (select max(a.ocorrido_em) from public.acessos a where lower(a.email) = lower(ua.email)) as ultimo_acesso
  from public.usuarios_autorizados ua
  where public.has_role(auth.uid(), 'admin')
  order by ua.criado_em desc;
$$;

-- ============================================================
-- Quantos administradores ativos existem hoje
-- ============================================================
create or replace function public.total_admins()
returns integer
language sql
stable
security definer
set search_path = public
as $$
  select count(*)::int from public.user_roles where role = 'admin';
$$;

-- ============================================================
-- Trocar o papel: atualiza a allowlist e, se a conta já existir,
-- o papel efetivo do usuário
-- ============================================================
create or replace function public.definir_papel(_email text, _papel public.app_role)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  _uid uuid;
begin
  if not public.has_role(auth.uid(), 'admin') then
    raise exception 'APENAS_ADMIN';
  end if;

  select id into _uid from auth.users where lower(email) = lower(_email);

  -- Não deixa o sistema ficar sem nenhum administrador.
  if _papel <> 'admin' and _uid is not null
     and public.has_role(_uid, 'admin')
     and public.total_admins() <= 1 then
    raise exception 'ULTIMO_ADMIN';
  end if;

  update public.usuarios_autorizados
     set papel = _papel
   where lower(email) = lower(_email);

  if _uid is not null then
    delete from public.user_roles where user_id = _uid;
    insert into public.user_roles (user_id, role)
    values (_uid, _papel)
    on conflict (user_id, role) do nothing;
  end if;
end $$;

-- ============================================================
-- Ativar ou revogar o acesso. Revogar tira o papel, então a pessoa
-- perde o acesso mesmo com a senha na mão.
-- ============================================================
create or replace function public.definir_ativo(_email text, _ativo boolean)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  _uid uuid;
  _papel public.app_role;
begin
  if not public.has_role(auth.uid(), 'admin') then
    raise exception 'APENAS_ADMIN';
  end if;

  select id into _uid from auth.users where lower(email) = lower(_email);

  if not _ativo and _uid is not null
     and public.has_role(_uid, 'admin')
     and public.total_admins() <= 1 then
    raise exception 'ULTIMO_ADMIN';
  end if;

  update public.usuarios_autorizados
     set ativo = _ativo
   where lower(email) = lower(_email)
  returning papel into _papel;

  if _uid is not null then
    if _ativo then
      insert into public.user_roles (user_id, role)
      values (_uid, coalesce(_papel, 'usuario'))
      on conflict (user_id, role) do nothing;
    else
      delete from public.user_roles where user_id = _uid;
    end if;
  end if;
end $$;

-- ============================================================
-- Remover o acesso por completo
-- ============================================================
create or replace function public.remover_autorizado(_email text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  _uid uuid;
begin
  if not public.has_role(auth.uid(), 'admin') then
    raise exception 'APENAS_ADMIN';
  end if;

  select id into _uid from auth.users where lower(email) = lower(_email);

  if _uid is not null and public.has_role(_uid, 'admin') and public.total_admins() <= 1 then
    raise exception 'ULTIMO_ADMIN';
  end if;

  delete from public.usuarios_autorizados where lower(email) = lower(_email);

  if _uid is not null then
    delete from public.user_roles where user_id = _uid;
  end if;
end $$;
