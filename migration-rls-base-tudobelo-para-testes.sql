-- Migration: Adicionar políticas RLS para base_tudobelo_para_testes

-- Habilitar RLS
ALTER TABLE public.base_tudobelo_para_testes ENABLE ROW LEVEL SECURITY;

-- Permitir SELECT para usuários autenticados
CREATE POLICY "Allow authenticated users to select from base_tudobelo_para_testes"
ON public.base_tudobelo_para_testes
FOR SELECT
TO authenticated
USING (true);

-- Permitir INSERT para usuários autenticados
CREATE POLICY "Allow authenticated users to insert into base_tudobelo_para_testes"
ON public.base_tudobelo_para_testes
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Permitir UPDATE para usuários autenticados
CREATE POLICY "Allow authenticated users to update base_tudobelo_para_testes"
ON public.base_tudobelo_para_testes
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

-- Permitir DELETE para usuários autenticados
CREATE POLICY "Allow authenticated users to delete from base_tudobelo_para_testes"
ON public.base_tudobelo_para_testes
FOR DELETE
TO authenticated
USING (true);
