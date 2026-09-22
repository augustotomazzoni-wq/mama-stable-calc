-- A tela de usuários passa a mostrar quem ainda está com a senha inicial,
-- para o administrador acompanhar quem nunca fez o primeiro acesso.
-- O tipo de retorno muda, então a função precisa ser recriada.

drop function if exists public.listar_usuarios();

create function public.listar_usuarios()
returns table (
  email text,
  nome text,
  papel public.app_role,
  ativo boolean,
  criado_em timestamptz,
  usado_em timestamptz,
  tem_conta boolean,
  ultimo_acesso timestamptz,
  senha_inicial boolean
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
    (select max(a.ocorrido_em) from public.acessos a where lower(a.email) = lower(ua.email)) as ultimo_acesso,
    coalesce((
      select p.deve_trocar_senha
        from public.profiles p
        join auth.users u2 on u2.id = p.user_id
       where lower(u2.email) = lower(ua.email)
    ), false) as senha_inicial
  from public.usuarios_autorizados ua
  where public.has_role(auth.uid(), 'admin')
  order by ua.criado_em desc;
$$;

-- Recriar a função devolve o EXECUTE padrão a public; mantém-se o aperto anterior.
revoke all on function public.listar_usuarios() from public, anon;
grant execute on function public.listar_usuarios() to authenticated;
