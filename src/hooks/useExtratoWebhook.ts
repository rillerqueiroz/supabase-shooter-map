import { useQuery } from "@tanstack/react-query";
import { z } from "zod";
import { TransacaoFinanceira } from "./useExtratosBancarios";

// Zod schema for webhook parameters validation
const webhookParamsSchema = z.object({
  walletId: z.string().trim().min(1, "WalletId é obrigatório").max(100, "WalletId muito longo"),
  credorCedrus: z.string().trim().max(255).nullable().optional(),
  credorCedrusCode: z.string().trim().max(100).nullable().optional(),
  dataInicio: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Data início inválida (formato: YYYY-MM-DD)").nullable().optional(),
  dataFim: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Data fim inválida (formato: YYYY-MM-DD)").nullable().optional(),
  offset: z.number().int().min(0).max(10000, "Offset excede o limite máximo de 10000")
});

type WebhookParams = z.infer<typeof webhookParamsSchema>;

async function fetchPage(
  walletId: string,
  credorCedrus: string | null,
  credorCedrusCode: string | null,
  dataInicio: string | null,
  dataFim: string | null,
  offset: number = 0
) {
  // Validate inputs before sending to webhook
  const params: WebhookParams = {
    walletId,
    credorCedrus: credorCedrus || null,
    credorCedrusCode: credorCedrusCode || null,
    dataInicio: dataInicio || null,
    dataFim: dataFim || null,
    offset
  };

  const validationResult = webhookParamsSchema.safeParse(params);
  
  if (!validationResult.success) {
    const errorMessages = validationResult.error.errors.map(e => e.message).join(", ");
    console.error("❌ Erro de validação:", errorMessages);
    throw new Error(`Parâmetros inválidos: ${errorMessages}`);
  }

  const validated = validationResult.data;

  const response = await fetch(
    "https://projeton8n-n8n.pjq1cs.easypanel.host/webhook/pega-extrato",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        walletId: validated.walletId,
        credorCedrus: validated.credorCedrus,
        credor_cedrus: validated.credorCedrusCode,
        dataInicio: validated.dataInicio,
        dataFim: validated.dataFim,
        offset: validated.offset,
      }),
    }
  );

  if (!response.ok) {
    console.error("❌ Erro HTTP do webhook:", response.status);
    throw new Error(`Erro ao buscar extrato: ${response.status}`);
  }

  return await response.json();
}

export function useExtratoWebhook(
  walletId: string | null,
  credorCedrus: string | null,
  credorCedrusCode: string | null,
  dataInicio?: string,
  dataFim?: string
) {
  return useQuery({
    queryKey: ["extrato-webhook", walletId, dataInicio, dataFim],
    queryFn: async () => {
      if (!walletId) {
        console.log("⚠️ WalletId não selecionado, pulando webhook");
        return [];
      }

      console.log("🌐 Buscando extrato paginado para:", {
        walletId,
        credorCedrus,
        credorCedrusCode,
        dataInicio,
        dataFim,
      });

      let allData: any[] = [];
      let offset = 0;
      let hasMore = true;
      let totalCount = 0;
      let pageNumber = 1;

      // Loop para buscar todas as páginas
      while (hasMore) {
        console.log(`📄 Buscando página ${pageNumber} com offset ${offset}...`);
        
        const pageResult = await fetchPage(
          walletId,
          credorCedrus,
          credorCedrusCode,
          dataInicio || null,
          dataFim || null,
          offset
        );

        // Extrair metadados de paginação
        const pageData = Array.isArray(pageResult) 
          ? pageResult[0] 
          : pageResult;

        hasMore = pageData.hasMore || false;
        totalCount = pageData.totalCount || 0;
        const limit = pageData.limit || 100;

        // Extrair dados da página atual
        let currentPageData: any[] = [];
        if (Array.isArray(pageData.data)) {
          currentPageData = Array.isArray(pageData.data[0]) 
            ? pageData.data[0] 
            : pageData.data;
        }

        allData = [...allData, ...currentPageData];
        offset += limit;
        pageNumber++;

        console.log(`✅ Página ${pageNumber - 1} carregada: ${currentPageData.length} itens. Total acumulado: ${allData.length}/${totalCount}`);

        // Proteção contra loop infinito
        if (offset > totalCount || offset > 10000) {
          console.warn("⚠️ Limite de segurança atingido");
          break;
        }
      }

      console.log(`🎉 Busca completa! Total de transações: ${allData.length}`);

      // Transformar os dados combinados
      const transformed = transformWebhookData(
        { data: allData }, 
        walletId, 
        credorCedrus || ""
      );
      
      console.log("📊 Primeiras 3 transações ordenadas:", 
        transformed.slice(0, 3).map(t => t.id)
      );
      
      return transformed;
    },
    enabled: !!walletId,
    retry: 1,
    staleTime: 60000,
  });
}

function transformWebhookData(
  webhookResponse: any,
  walletId: string,
  clienteNome: string
): TransacaoFinanceira[] {
  // Normalizar estrutura de dados que pode vir em diferentes formatos
  let dataArray: any[] = [];
  
  if (Array.isArray(webhookResponse)) {
    // Nova estrutura: [{ "data": [[{...}], []] }]
    if (webhookResponse[0]?.data && Array.isArray(webhookResponse[0].data)) {
      const nestedData = webhookResponse[0].data;
      // Pega o primeiro array (que contém as transações)
      dataArray = Array.isArray(nestedData[0]) ? nestedData[0] : nestedData;
    }
  } else if (webhookResponse?.data) {
    // Estrutura antiga: { "data": [{...}] }
    dataArray = Array.isArray(webhookResponse.data) 
      ? (Array.isArray(webhookResponse.data[0]) ? webhookResponse.data[0] : webhookResponse.data)
      : [];
  }

  console.log("📦 Estrutura extraída:", {
    isArray: Array.isArray(webhookResponse),
    dataLength: dataArray.length,
    firstItem: dataArray[0]
  });

  return dataArray
    .filter((item: any) => item.object === "financialTransaction")
    .map((item: any) => ({
    id: item.id,
    wallet_id: walletId,
    cliente_nome: clienteNome,
    value: item.value,
    balance: item.balance,
    type: item.type,
    date: item.date,
    description: item.description,
    payment_id: item.paymentId,
    external_reference: item.externalReference,
    split_id: item.splitId,
    transfer_id: item.transferId,
    anticipation_id: item.anticipationId,
    bill_id: item.billId,
    invoice_id: item.invoiceId,
    payment_dunning_id: item.paymentDunningId,
    credit_bureau_report_id: item.creditBureauReportId,
    pix_transaction_id: item.pixTransactionId || null,
  }))
    .sort((a, b) => {
      // Extrai a parte numérica do ID (ex: "ftn_001496894595" -> 1496894595)
      const numA = parseInt(a.id.replace(/^\D+/, ''), 10);
      const numB = parseInt(b.id.replace(/^\D+/, ''), 10);
      return numA - numB; // Ordem crescente (mais antigo primeiro)
    });
}
