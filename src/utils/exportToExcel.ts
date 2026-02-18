import * as XLSX from 'xlsx';

export interface ExcelExportOptions {
  filename: string;
  sheetName?: string;
  data: any[];
  headers?: string[];
}

export function exportToExcel({ filename, sheetName = 'Dados', data, headers }: ExcelExportOptions) {
  try {
    // Criar workbook
    const wb = XLSX.utils.book_new();
    
    // Se não há dados, criar planilha vazia
    if (!data || data.length === 0) {
      const ws = XLSX.utils.aoa_to_sheet([['Nenhum dado encontrado']]);
      XLSX.utils.book_append_sheet(wb, ws, sheetName);
    } else {
      let ws;
      
      // Se headers foram fornecidos, usar eles
      if (headers && headers.length > 0) {
        const formattedData = data.map(item => {
          const row: any = {};
          headers.forEach(header => {
            // Buscar valor no objeto, considerando que o header pode não corresponder exatamente à chave
            const key = Object.keys(item).find(k => 
              k.toLowerCase() === header.toLowerCase() || 
              k === header
            );
            row[header] = key ? item[key] : '';
          });
          return row;
        });
        ws = XLSX.utils.json_to_sheet(formattedData);
      } else {
        // Usar as chaves do primeiro objeto como headers
        ws = XLSX.utils.json_to_sheet(data);
      }
      
      // Definir largura das colunas
      const maxWidths: number[] = [];
      const range = XLSX.utils.decode_range(ws['!ref'] || 'A1');
      
      // Calcular largura baseada no conteúdo
      for (let C = range.s.c; C <= range.e.c; ++C) {
        let maxWidth = 10; // largura mínima
        
        for (let R = range.s.r; R <= range.e.r; ++R) {
          const cellAddress = XLSX.utils.encode_cell({ r: R, c: C });
          const cell = ws[cellAddress];
          
          if (cell && cell.v) {
            const cellLength = String(cell.v).length;
            maxWidth = Math.max(maxWidth, cellLength);
          }
        }
        
        maxWidths.push(Math.min(maxWidth + 2, 50)); // máximo 50 caracteres
      }
      
      ws['!cols'] = maxWidths.map(w => ({ width: w }));
      
      XLSX.utils.book_append_sheet(wb, ws, sheetName);
    }
    
    // Gerar e baixar arquivo
    const fileName = filename.endsWith('.xlsx') ? filename : `${filename}.xlsx`;
    XLSX.writeFile(wb, fileName);
    
    console.log(`✅ Arquivo Excel exportado: ${fileName}`);
    return { success: true, filename: fileName };
    
  } catch (error) {
    console.error('❌ Erro ao exportar Excel:', error);
    return { success: false, error };
  }
}

// Função específica para formatar dados das parcelas
export function exportParcelasToExcel(data: any[], filters?: any) {
  const headers = [
    'Cliente',
    'Telefone',
    'Documento',
    'Título',
    'Parcela',
    'Unidade Principal',
    'Valor Total',
    'Data de Vencimento',
    'Status',
    'Empresa'
  ];
  
  const formattedData = data.map(item => ({
    'Cliente': item.cliente || '',
    'Telefone': item.telefone_cliente || '',
    'Documento': item.documento || '',
    'Título': item.titulo || '',
    'Parcela': item.parc || '',
    'Unidade Principal': item.unid_princ || '',
    'Valor Total': item.total ? `R$ ${Number(item.total).toFixed(2)}` : (item.valor_original ? `R$ ${Number(item.valor_original).toFixed(2)}` : ''),
    'Data de Vencimento': item.data_vecto || item.data_vencimento || '',
    'Status': item.status || '',
    'Empresa': item.nome_empresa || ''
  }));
  
  const filename = `parcelas_setor_sul_${new Date().toISOString().split('T')[0]}`;
  
  return exportToExcel({
    filename,
    sheetName: 'Parcelas Setor Sul',
    data: formattedData,
    headers
  });
}

// Função para formatar telefones de JSON array para string com prefixo 55
function formatPhonesForExcel(phones: string | undefined): string {
  if (!phones) return '';
  try {
    const phoneArray = JSON.parse(phones);
    if (!Array.isArray(phoneArray)) return addPrefix55(phones);
    return phoneArray
      .filter(p => p && p.trim())
      .map(p => addPrefix55(p.trim()))
      .join(', ');
  } catch {
    return addPrefix55(phones);
  }
}

// Adiciona prefixo 55 se não existir
function addPrefix55(phone: string): string {
  if (!phone) return '';
  const cleaned = phone.replace(/\D/g, '');
  if (cleaned.startsWith('55')) return cleaned;
  return '55' + cleaned;
}

// Função específica para formatar dados dos clientes
export function exportClientesToExcel(data: any[], filters?: any) {
  const headers = [
    'ID',
    'Nome',
    'CPF',
    'Telefone',
    'Email',
    'Endereço',
    'Tipo Pessoa',
    'Lote',
    'Quadra',
    'Situação',
    'Observações'
  ];
  
  const formattedData = data.map(item => ({
    'ID': item.id || '',
    'Nome': item.name || item.nome || '',
    'CPF': item.cpf || '',
    'Telefone': formatPhonesForExcel(item.phones) || item.telefone || '',
    'Email': item.email || '',
    'Endereço': [
      item.address_street_name,
      item.address_number,
      item.address_complement,
      item.address_neighborhood,
      item.address_city,
      item.address_state,
      item.address_zip_code
    ].filter(Boolean).join(', ') || item.endereco || '',
    'Tipo Pessoa': item.person_type || '',
    'Lote': item.lote || '',
    'Quadra': item.quadra || '',
    'Situação': item.situacao || '',
    'Observações': item.observacoes || ''
  }));
  
  const filename = `clientes_setor_sul_${new Date().toISOString().split('T')[0]}`;
  
  return exportToExcel({
    filename,
    sheetName: 'Clientes Setor Sul',
    data: formattedData,
    headers
  });
}

// Função para calcular o valor com desconto de pontualidade
function calcularValorComDesconto(item: any): number {
  const valorBase = Number(item.valor) || 0;
  if (!item.desconto_pontualidade) return valorBase;
  
  try {
    const desconto = JSON.parse(item.desconto_pontualidade);
    if (desconto.type === 'FIXED') {
      return Math.max(0, valorBase - Number(desconto.value));
    } else if (desconto.type === 'PERCENTAGE') {
      return Math.max(0, valorBase * (1 - Number(desconto.value) / 100));
    }
    return valorBase;
  } catch {
    return valorBase;
  }
}

// Função específica para exportar cobranças com filtros aplicados
export function exportCobrancasToExcel(data: any[], filters?: any) {
  const headers = [
    'Nome',
    'Empresa',
    'Descrição',
    'Projeto',
    'Forma de Pagamento',
    'Telefone com 55',
    'Telefone sem 55',
    'Valor',
    'Valor com Desconto de Pontualidade',
    'Status',
    'Status Cedrus',
    'Data Criação',
    'Data Vencimento',
    'Data Crédito',
    'Identificador'
  ];
  
  const formatCurrency = (value: number | null) => {
    if (value === null || value === undefined) return 'R$ 0,00';
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const formatDateDDMMYYYY = (dateString: string | null) => {
    if (!dateString) return '';
    try {
      const cleanDate = dateString.includes('T') ? dateString.split('T')[0] : dateString;
      const [year, month, day] = cleanDate.split('-').map(n => parseInt(n));
      if (!year || !month || !day || isNaN(year) || isNaN(month) || isNaN(day)) return '';
      return `${String(day).padStart(2, '0')}/${String(month).padStart(2, '0')}/${year}`;
    } catch {
      return dateString;
    }
  };

  const getPhoneRaw = (item: any): string => {
    const phone = item.celular || item.fone || '';
    if (!phone) return '';
    return phone.replace(/\D/g, '');
  };

  const getPhoneCom55 = (item: any): string => {
    const cleaned = getPhoneRaw(item);
    if (!cleaned) return '';
    return cleaned.startsWith('55') ? cleaned : '55' + cleaned;
  };

  const getPhoneSem55 = (item: any): string => {
    const cleaned = getPhoneRaw(item);
    if (!cleaned) return '';
    return cleaned.startsWith('55') ? cleaned.substring(2) : cleaned;
  };

  const STATUS_LABELS: Record<string, string> = {
    'PENDING': 'Pendente',
    'RECEIVED': 'Recebido',
    'CONFIRMED': 'Confirmado',
    'OVERDUE': 'Vencido',
    'REFUNDED': 'Estornado',
    'RECEIVED_IN_CASH': 'Recebido em dinheiro',
    'REFUND_REQUESTED': 'Estorno solicitado',
    'REFUND_IN_PROGRESS': 'Estorno em andamento',
    'CHARGEBACK_REQUESTED': 'Chargeback solicitado',
    'CHARGEBACK_DISPUTE': 'Disputa de chargeback',
    'AWAITING_CHARGEBACK_REVERSAL': 'Aguardando reversão de chargeback',
    'DUNNING_REQUESTED': 'Cobrança solicitada',
    'DUNNING_RECEIVED': 'Cobrança recebida',
    'AWAITING_RISK_ANALYSIS': 'Aguardando análise de risco'
  };

  const STATUS_CEDRUS_LABELS: Record<string, string> = {
    'A': 'Aberto',
    'C': 'Cancelado',
    'N': 'Negociado'
  };

  const formattedData = data.map(item => ({
    'Nome': item.nome || '',
    'Empresa': item.unidade || '',
    'Descrição': item.descricao || '',
    'Projeto': item.projeto || '',
    'Forma de Pagamento': item.forma_pagamento || '',
    'Telefone com 55': getPhoneCom55(item),
    'Telefone sem 55': getPhoneSem55(item),
    'Valor': formatCurrency(item.valor),
    'Valor com Desconto de Pontualidade': formatCurrency(calcularValorComDesconto(item)),
    'Status': STATUS_LABELS[item.status] || item.status || '',
    'Status Cedrus': STATUS_CEDRUS_LABELS[item.status_cedrus] || item.status_cedrus || '',
    'Data Criação': formatDateDDMMYYYY(item.data_criacao),
    'Data Vencimento': formatDateDDMMYYYY(item.vencimento),
    'Data Crédito': formatDateDDMMYYYY(item.data_credito),
    'Identificador': item.Identificador || ''
  }));
  
  const filename = `cobrancas_${new Date().toISOString().split('T')[0]}`;
  
  return exportToExcel({
    filename,
    sheetName: 'Cobranças',
    data: formattedData,
    headers
  });
}