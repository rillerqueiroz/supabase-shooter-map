import { useEffect, useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Save } from 'lucide-react';
import type { Person } from '@/types/people';
import { useUpdatePerson } from '@/hooks/usePeopleMutations';

interface Props {
  person: Person;
}

const FIELDS: { key: keyof Person; label: string; type?: string }[] = [
  { key: 'name', label: 'Nome' },
  { key: 'cpf', label: 'CPF/CNPJ' },
  { key: 'email', label: 'Email' },
  { key: 'rg', label: 'RG' },
  { key: 'nascimento', label: 'Nascimento', type: 'date' },
  { key: 'address_street_name', label: 'Endereço' },
  { key: 'address_number', label: 'Número' },
  { key: 'address_complement', label: 'Complemento' },
  { key: 'address_neighborhood', label: 'Bairro' },
  { key: 'address_city', label: 'Cidade' },
  { key: 'address_state', label: 'UF' },
  { key: 'address_zip_code', label: 'CEP' },
  { key: 'spouse_name', label: 'Nome do cônjuge' },
  { key: 'spouse_cpf', label: 'CPF do cônjuge' },
];

export function PessoaInfoTab({ person }: Props) {
  const [form, setForm] = useState<Partial<Person>>(person);
  const mutation = useUpdatePerson();

  useEffect(() => setForm(person), [person]);

  const set = (k: keyof Person, v: any) => setForm((f) => ({ ...f, [k]: v }));

  return (
    <div className="space-y-4 py-4">
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <div className="space-y-1">
          <Label>Tipo</Label>
          <Select value={form.person_type ?? ''} onValueChange={(v) => set('person_type', v || null)}>
            <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="F">Pessoa Física</SelectItem>
              <SelectItem value="J">Pessoa Jurídica</SelectItem>
            </SelectContent>
          </Select>
        </div>
        {FIELDS.map((f) => {
          const raw = (form as any)[f.key];
          const value =
            f.type === 'date' && raw && typeof raw === 'string'
              ? raw.split('T')[0]
              : raw ?? '';
          return (
            <div key={String(f.key)} className="space-y-1">
              <Label>{f.label}</Label>
              <Input
                type={f.type ?? 'text'}
                value={value}
                onChange={(e) => set(f.key, e.target.value || null)}
              />
            </div>
          );
        })}
      </div>

      <div className="flex justify-end">
        <Button
          onClick={() => mutation.mutate({ id: person.id, patch: form })}
          disabled={mutation.isPending}
        >
          <Save className="mr-2 h-4 w-4" />
          {mutation.isPending ? 'Salvando...' : 'Salvar alterações'}
        </Button>
      </div>
    </div>
  );
}
