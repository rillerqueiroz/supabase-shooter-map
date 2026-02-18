export interface TransacaoFinanceira {
  id: string;
  wallet_id: string;
  cliente_nome: string;
  value: number;
  balance: number;
  type: string;
  date: string;
  description: string | null;
  payment_id: string | null;
  external_reference: string | null;
  split_id: string | null;
  transfer_id: string | null;
  anticipation_id: string | null;
  bill_id: string | null;
  invoice_id: string | null;
  payment_dunning_id: string | null;
  credit_bureau_report_id: string | null;
  pix_transaction_id?: string | null;
  created_at?: string;
}

export interface ExtratoMetrics {
  totalCreditos: number;
  totalDebitos: number;
  saldoAtual: number;
  quantidadeTransacoes: number;
}

export function calculateMetrics(transacoes: TransacaoFinanceira[]): ExtratoMetrics {
  const totalCreditos = transacoes
    .filter((t) => t.value > 0)
    .reduce((sum, t) => sum + Number(t.value), 0);

  const totalDebitos = transacoes
    .filter((t) => t.value < 0)
    .reduce((sum, t) => sum + Math.abs(Number(t.value)), 0);

  const saldoAtual = transacoes.length > 0 ? Number(transacoes[transacoes.length - 1].balance) : 0;

  return {
    totalCreditos,
    totalDebitos,
    saldoAtual,
    quantidadeTransacoes: transacoes.length,
  };
}
