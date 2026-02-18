-- Tabela de vínculo many-to-many entre beneficiários e projetos
CREATE TABLE IF NOT EXISTS public.gestao_splits_beneficiarios_projetos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  beneficiario_id UUID NOT NULL REFERENCES public.gestao_splits_beneficiarios(id) ON DELETE CASCADE,
  projeto_id UUID NOT NULL REFERENCES public.gestao_splits_projetos(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(beneficiario_id, projeto_id)
);

-- Indices
CREATE INDEX IF NOT EXISTS idx_ben_proj_beneficiario ON public.gestao_splits_beneficiarios_projetos(beneficiario_id);
CREATE INDEX IF NOT EXISTS idx_ben_proj_projeto ON public.gestao_splits_beneficiarios_projetos(projeto_id);

-- RLS
ALTER TABLE public.gestao_splits_beneficiarios_projetos ENABLE ROW LEVEL SECURITY;

-- Política de leitura para usuários autenticados
CREATE POLICY "Authenticated users can view beneficiarios_projetos"
  ON public.gestao_splits_beneficiarios_projetos
  FOR SELECT
  TO authenticated
  USING (true);

-- Política de inserção para admins
CREATE POLICY "Admins can insert beneficiarios_projetos"
  ON public.gestao_splits_beneficiarios_projetos
  FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin());

-- Política de update para admins
CREATE POLICY "Admins can update beneficiarios_projetos"
  ON public.gestao_splits_beneficiarios_projetos
  FOR UPDATE
  TO authenticated
  USING (public.is_admin());

-- Política de delete para admins
CREATE POLICY "Admins can delete beneficiarios_projetos"
  ON public.gestao_splits_beneficiarios_projetos
  FOR DELETE
  TO authenticated
  USING (public.is_admin());

-- Política para usuários com permissão na tela beneficiarios-splits
CREATE POLICY "Users with screen permission can manage beneficiarios_projetos"
  ON public.gestao_splits_beneficiarios_projetos
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.gestao_splits_user_screen_permissions usp
      JOIN public.gestao_splits_screens s ON s.id = usp.screen_id
      WHERE usp.user_id = auth.uid()
        AND s.slug = 'beneficiarios-splits'
        AND usp.can_view = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.gestao_splits_user_screen_permissions usp
      JOIN public.gestao_splits_screens s ON s.id = usp.screen_id
      WHERE usp.user_id = auth.uid()
        AND s.slug = 'beneficiarios-splits'
        AND usp.can_edit = true
    )
  );

-- Grant
GRANT ALL ON public.gestao_splits_beneficiarios_projetos TO authenticated;
