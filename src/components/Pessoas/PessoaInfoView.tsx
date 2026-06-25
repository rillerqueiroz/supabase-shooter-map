import type { Person } from '@/types/people';
import { formatDocument } from '@/utils/normalize-phone';
import { format } from 'date-fns';
import { IdCard, MapPin } from 'lucide-react';
import { usePersonCreditors } from '@/hooks/usePersonDetail';

interface Props {
  person: Person;
}

const Field = ({ label, value }: { label: string; value: string | null | undefined }) => (
  <div className="min-w-0">
    <div className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">{label}</div>
    <div className="text-sm font-semibold truncate" title={value || ''}>{value || '—'}</div>
  </div>
);

const SectionCard = ({
  icon,
  title,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
}) => (
  <div className="rounded-lg border bg-card overflow-hidden">
    <div className="flex items-center gap-2 px-4 py-2.5 bg-muted/40 border-b">
      <span className="text-muted-foreground">{icon}</span>
      <h3 className="text-sm font-semibold">{title}</h3>
    </div>
    <div className="px-4 py-3">{children}</div>
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
  const { data: creditors } = usePersonCreditors(person.id);
  const firstCreditor = creditors?.[0];

  const endereco = [
    [person.address_street_name, person.address_number].filter(Boolean).join(', '),
    person.address_complement,
    person.address_neighborhood,
    [person.address_city, person.address_state].filter(Boolean).join(' / '),
    person.address_zip_code ? `CEP ${person.address_zip_code}` : null,
  ]
    .filter(Boolean)
    .join(' • ');

  return (
    <div className="space-y-3">
      <SectionCard icon={<IdCard className="h-4 w-4" />} title="Dados gerais">
        <div className="grid grid-cols-2 md:grid-cols-3 gap-x-6 gap-y-3">
          <Field label="CPF/CNPJ" value={formatDocument(person.cpf)} />
          <Field
            label="Tipo"
            value={
              person.person_type === 'F'
                ? 'Física'
                : person.person_type === 'J'
                ? 'Jurídica'
                : null
            }
          />
          <Field label="Credor" value={firstCreditor?.creditor_code} />
          <Field
            label="Cod. Devedor"
            value={firstCreditor?.debtor_code_at_creditor || person.debtor_code}
          />
          <Field label="ID Devedor Cedrus" value={person.cedrus_debtor_id} />
          <Field label="Email" value={person.email} />
          <Field label="RG" value={person.rg} />
          <Field label="Nascimento" value={fmtDate(person.nascimento)} />
          {(person.spouse_name || person.spouse_cpf) && (
            <>
              <Field label="Cônjuge" value={person.spouse_name} />
              <Field label="CPF Cônjuge" value={formatDocument(person.spouse_cpf)} />
            </>
          )}
        </div>
      </SectionCard>

      <SectionCard icon={<MapPin className="h-4 w-4" />} title="Endereço">
        <div className="text-sm">{endereco || <span className="text-muted-foreground">Sem endereço cadastrado</span>}</div>
      </SectionCard>
    </div>
  );
}
