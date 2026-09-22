REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.total_admins() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.set_updated_at() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.tem_acesso(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.listar_usuarios() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.definir_papel(text, public.app_role) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.definir_ativo(text, boolean) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.remover_autorizado(text) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.tem_acesso(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.listar_usuarios() TO authenticated;
GRANT EXECUTE ON FUNCTION public.definir_papel(text, public.app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.definir_ativo(text, boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION public.remover_autorizado(text) TO authenticated;