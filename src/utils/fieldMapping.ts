// Utility to infer actual column keys from Supabase data
export interface ClientesFieldMap {
  nomeKey?: string
  cpfKey?: string
  telefoneKey?: string
  emailKey?: string
  enderecoKey?: string
  loteKey?: string
  quadraKey?: string
  situacaoKey?: string
  observacoesKey?: string
}

export interface ParcelasFieldMap {
  clienteKey?: string
  loteKey?: string
  quadraKey?: string
  valorKey?: string
  vencimentoKey?: string
  statusKey?: string
  telefoneKey?: string
  observacoesKey?: string
}

function normalize(s: string) {
  return s.toLowerCase().replace(/[\s_-]+/g, '')
}

function findKey(keys: string[], candidates: string[]): string | undefined {
  const normKeys = keys.map(normalize)
  for (const cand of candidates) {
    const n = normalize(cand)
    const idx = normKeys.indexOf(n)
    if (idx !== -1) return keys[idx]
  }
  // also try partial includes (e.g., "telefoneasaas" contains "telefone")
  for (const cand of candidates) {
    const n = normalize(cand)
    const match = keys.find(k => normalize(k).includes(n))
    if (match) return match
  }
  return undefined
}

export function inferClientesFieldMap(data: any[]): ClientesFieldMap {
  const sample = data?.find(Boolean) || {}
  const keys = Object.keys(sample)

  const nomeKey = findKey(keys, ['nome', 'cliente', 'nomecliente'])
  const cpfKey = findKey(keys, ['cpf', 'cpfcnpj', 'documento', 'documentocpf'])
  const telefoneKey = findKey(keys, ['telefone', 'celular', 'whatsapp'])
  const emailKey = findKey(keys, ['email', 'e-mail'])
  const enderecoKey = findKey(keys, ['endereco', 'endereço', 'address'])
  const loteKey = findKey(keys, ['lote'])
  const quadraKey = findKey(keys, ['quadra'])
  const situacaoKey = findKey(keys, ['situacao', 'situação', 'status'])
  const observacoesKey = findKey(keys, ['observacoes', 'observação', 'observacao', 'obs'])

  return { nomeKey, cpfKey, telefoneKey, emailKey, enderecoKey, loteKey, quadraKey, situacaoKey, observacoesKey }
}

export function inferParcelasFieldMap(data: any[]): ParcelasFieldMap {
  const sample = data?.find(Boolean) || {}
  const keys = Object.keys(sample)

  const clienteKey = findKey(keys, ['cliente', 'nome', 'nomecliente', 'devedor'])
  const loteKey = findKey(keys, ['lote', 'unid_princ'])
  const quadraKey = findKey(keys, ['quadra', 'unid_princ'])
  const valorKey = findKey(keys, ['total', 'valor_original', 'valor_parcela', 'valor', 'valordaparcela', 'valorparcelas'])
  const vencimentoKey = findKey(keys, ['data_vecto', 'data_vencimento', 'vencimento', 'datavencimento', 'dtevencimento', 'vcto', 'datavenc'])
  const statusKey = findKey(keys, ['status', 'situacao', 'situação'])
  const telefoneKey = findKey(keys, ['telefone', 'celular', 'whatsapp'])
  const observacoesKey = findKey(keys, ['observacoes', 'observação', 'observacao', 'obs'])

  return { clienteKey, loteKey, quadraKey, valorKey, vencimentoKey, statusKey, telefoneKey, observacoesKey }
}
