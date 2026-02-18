import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const asaasApiKey = Deno.env.get('ASAAS_API_KEY');
    const asaasApiUrl = Deno.env.get('ASAAS_API_URL') || 'https://sandbox.asaas.com/api/v3';
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { contrato_id } = await req.json();

    if (!contrato_id) {
      return new Response(
        JSON.stringify({ error: 'contrato_id é obrigatório' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[gerar-cobranca-asaas] Iniciando para contrato: ${contrato_id}`);

    // Atualizar status para "enviando"
    await supabase
      .from('gestao_splits_contratos')
      .update({ cobranca_status: 'enviando' })
      .eq('id', contrato_id);

    // Buscar dados do contrato
    const { data: contrato, error: contratoError } = await supabase
      .from('gestao_splits_contratos')
      .select(`
        *,
        projeto:gestao_splits_projetos!projeto_id(*)
      `)
      .eq('id', contrato_id)
      .single();

    if (contratoError || !contrato) {
      console.error('[gerar-cobranca-asaas] Erro ao buscar contrato:', contratoError);
      await supabase
        .from('gestao_splits_contratos')
        .update({ 
          cobranca_status: 'erro',
          cobranca_erro_mensagem: 'Contrato não encontrado'
        })
        .eq('id', contrato_id);
        
      return new Response(
        JSON.stringify({ error: 'Contrato não encontrado' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Montar payload para Asaas
    const payload = {
      customer: contrato.contratante_cpf_cnpj,
      billingType: 'BOLETO',
      value: contrato.valor_total,
      dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 7 dias
      description: `Cobrança referente ao contrato ${contrato.identificador_externo}`,
      externalReference: contrato.identificador_externo,
      installmentCount: contrato.quantidade_parcelas,
      // Adicionar mais campos conforme necessário
    };

    console.log('[gerar-cobranca-asaas] Payload montado:', JSON.stringify(payload));

    // Verificar se temos API key configurada
    if (!asaasApiKey) {
      console.warn('[gerar-cobranca-asaas] ASAAS_API_KEY não configurada, salvando payload apenas');
      
      // Salvar payload sem enviar (modo de teste)
      await supabase
        .from('gestao_splits_contratos')
        .update({
          cobranca_status: 'sucesso',
          cobranca_gerada: true,
          cobranca_gerada_em: new Date().toISOString(),
          cobranca_webhook_payload: payload,
          cobranca_webhook_response: { message: 'ASAAS_API_KEY não configurada - modo simulação' }
        })
        .eq('id', contrato_id);

      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'Cobrança simulada (ASAAS_API_KEY não configurada)',
          payload 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Enviar para API do Asaas
    const asaasResponse = await fetch(`${asaasApiUrl}/payments`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'access_token': asaasApiKey,
      },
      body: JSON.stringify(payload),
    });

    const responseData = await asaasResponse.json();
    console.log('[gerar-cobranca-asaas] Resposta Asaas:', JSON.stringify(responseData));

    if (!asaasResponse.ok) {
      // Erro na API do Asaas
      await supabase
        .from('gestao_splits_contratos')
        .update({
          cobranca_status: 'erro',
          cobranca_erro_mensagem: responseData.errors?.[0]?.description || 'Erro ao criar cobrança no Asaas',
          cobranca_webhook_payload: payload,
          cobranca_webhook_response: responseData
        })
        .eq('id', contrato_id);

      return new Response(
        JSON.stringify({ error: 'Erro ao criar cobrança no Asaas', details: responseData }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Sucesso
    await supabase
      .from('gestao_splits_contratos')
      .update({
        cobranca_status: 'sucesso',
        cobranca_gerada: true,
        cobranca_gerada_em: new Date().toISOString(),
        cobranca_id_externo: responseData.id,
        cobranca_webhook_payload: payload,
        cobranca_webhook_response: responseData,
        cobranca_erro_mensagem: null
      })
      .eq('id', contrato_id);

    console.log('[gerar-cobranca-asaas] Cobrança criada com sucesso:', responseData.id);

    return new Response(
      JSON.stringify({ success: true, data: responseData }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[gerar-cobranca-asaas] Erro:', error);
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
