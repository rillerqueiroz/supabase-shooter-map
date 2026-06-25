export interface Person {
  id: string;
  legacy_id_interno: string | null;
  name: string | null;
  cpf: string | null;
  document_digits: string | null;
  person_type: string | null; // 'F' | 'J' | null
  email: string | null;
  rg: string | null;
  nascimento: string | null;
  address_street_name: string | null;
  address_number: string | null;
  address_complement: string | null;
  address_neighborhood: string | null;
  address_city: string | null;
  address_state: string | null;
  address_zip_code: string | null;
  spouse_name: string | null;
  spouse_cpf: string | null;
  spouse_rg: string | null;
  creditor_code: string | null;
  debtor_code: string | null;
  cedrus_debtor_id: string | null;
  asaas_customer_id: string | null;
  merged_into_id: string | null;
  created_at: string | null;
  updated_at: string | null;
  [key: string]: any;
}

export interface PersonPhone {
  id: string;
  person_id: string;
  phone: string;
  phone_type: string | null;
  source: string | null;
  validated: boolean | null;
  validated_at: string | null;
  is_whatsapp: boolean | null;
  is_valid: boolean | null;
  legacy_id_telefone: string | null;
  legacy_id_devedor: string | null;
  created_at: string | null;
  updated_at: string | null;
}

export interface PersonCreditor {
  id?: string;
  person_id: string;
  creditor_code: string;
  debtor_code_at_creditor: string | null;
  status: string | null;
  source: string | null;
  created_at?: string | null;
  updated_at?: string | null;
}

export interface PersonExternalId {
  id?: string;
  person_id: string;
  system: string;
  external_id: string;
  metadata: Record<string, any> | null;
  created_at?: string | null;
}

export interface DuplicateGroup {
  document_digits: string;
  count: number;
  ids: string[];
}

export const TUDOBELO_CREDITORS = ['TUDOBELO', 'TUDOBELO-FUNDOS'] as const;
