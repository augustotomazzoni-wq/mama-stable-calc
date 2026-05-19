
CREATE TABLE public.consultas_calculo (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  nome_completo text NOT NULL,
  data_nascimento date,
  valor_total_indenizacao numeric NOT NULL DEFAULT 0,
  dados_informados jsonb NOT NULL DEFAULT '{}'::jsonb,
  resultado_resumido jsonb NOT NULL DEFAULT '{}'::jsonb,
  memoria_calculo_completa jsonb NOT NULL DEFAULT '{}'::jsonb,
  status_cliente text NOT NULL DEFAULT 'Pesquisa realizada'
    CHECK (status_cliente IN ('Pesquisa realizada','Cliente','Não contratou','Em análise')),
  excluido boolean NOT NULL DEFAULT false,
  deleted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_consultas_calculo_created_at ON public.consultas_calculo (created_at DESC);
CREATE INDEX idx_consultas_calculo_nome ON public.consultas_calculo (nome_completo);
CREATE INDEX idx_consultas_calculo_excluido ON public.consultas_calculo (excluido);

ALTER TABLE public.consultas_calculo ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view consultas"
  ON public.consultas_calculo FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert consultas"
  ON public.consultas_calculo FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update consultas"
  ON public.consultas_calculo FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete consultas"
  ON public.consultas_calculo FOR DELETE
  TO authenticated
  USING (true);

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_consultas_calculo_updated_at
BEFORE UPDATE ON public.consultas_calculo
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
