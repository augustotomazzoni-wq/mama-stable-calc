CREATE TABLE public.profiles (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  nome text,
  deve_trocar_senha boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuario ve o proprio perfil"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Usuario atualiza o proprio perfil"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE TRIGGER trg_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  autorizado public.usuarios_autorizados%rowtype;
BEGIN
  SELECT * INTO autorizado
    FROM public.usuarios_autorizados
   WHERE lower(email) = lower(new.email)
     AND ativo;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'EMAIL_NAO_AUTORIZADO';
  END IF;

  INSERT INTO public.user_roles (user_id, role)
  VALUES (new.id, autorizado.papel)
  ON CONFLICT (user_id, role) DO NOTHING;

  INSERT INTO public.profiles (user_id, nome, deve_trocar_senha)
  VALUES (new.id, autorizado.nome, true)
  ON CONFLICT (user_id) DO UPDATE
    SET nome = excluded.nome;

  UPDATE public.usuarios_autorizados
     SET usado_em = now()
   WHERE id = autorizado.id;

  RETURN new;
END $$;

INSERT INTO public.profiles (user_id, nome, deve_trocar_senha)
SELECT u.id, ua.nome, false
  FROM auth.users u
  LEFT JOIN public.usuarios_autorizados ua ON lower(ua.email) = lower(u.email)
ON CONFLICT (user_id) DO NOTHING;