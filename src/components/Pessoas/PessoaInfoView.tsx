import type { Person } from '@/types/people';
import { formatDocument } from '@/utils/normalize-phone';
import { format } from 'date-fns';

interface Props {
  person: Person;
}

const Row = ({ label, value }: { label: string; value: string | null | undefined }) => (
  <div className="flex justify-between py-1.5 border-b border-border/40 gap-4">
    <span className="text-muted-foreground text-xs">{label}</span>
    <span className="font-medium text-xs text-right truncate">{value || '—'}</span>
  </div>
);

function fmtDate(d?: string | null) {
  if (!d) return null;
  try {
    return format(new Date(d.split('T')[0]), 'dd/MM/yyyy');
  } catch {
    return d;
  }
}

export function PessoaInfoView({ person }: Props) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-x-6 gap-y-0">
      <Row label="Tipo" value={person.person_type === 'F' ? 'Pessoa Física' : person.person_type === 'J' ? 'Pessoa Jurídica' : null} />
      <Row label="CPF/CNPJ" value={formatDocument(person.cpf)} />
      <Row label="RG" value={person.rg} />
      <Row label="Email" value={person.email} />
      <Row label="Nascimento" value={fmtDate(person.nascimento)} />
      <Row label="Cônjuge" value={person.spouse_name} />
      <Row label="CPF Cônjuge" value={formatDocument(person.spouse_cpf)} />
      <Row label="CEP" value={person.address_zip_code} />
      <Row label="Cidade/UF" value={[person.address_city, person.address_state].filter(Boolean).join(' / ') || null} />
      <Row label="Bairro" value={person.address_neighborhood} />
      <Row label="Endereço" value={[person.address_street_name, person.address_number].filter(Boolean).join(', ') || null} />
      <Row label="Complemento" value={person.address_complement} />
    </div>
  );
}
