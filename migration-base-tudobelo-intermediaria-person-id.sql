-- Add person_id link from base_tudobelo_intermediaria to people (data lake)
-- This allows binding each título to a specific devedor (Person),
-- independent of the cnpj_cpf string match.

ALTER TABLE public.base_tudobelo_intermediaria
  ADD COLUMN IF NOT EXISTS person_id uuid NULL
    REFERENCES public.people(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_base_tudobelo_intermediaria_person_id
  ON public.base_tudobelo_intermediaria(person_id);

COMMENT ON COLUMN public.base_tudobelo_intermediaria.person_id
  IS 'FK -> people.id. Vínculo direto do título com o devedor (Person) no data lake.';
