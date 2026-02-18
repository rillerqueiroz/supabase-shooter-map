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
    const zapsignApiKey = Deno.env.get('ZAPSIGN_API_KEY');
    const zapsignApiUrl = 'https://api.zapsign.com.br/api/v1';
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { contrato_id } = await req.json();

    if (!contrato_id) {
      return new Response(
        JSON.stringify({ error: 'contrato_id é obrigatório' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[gerar-contrato-zapsign] Iniciando para contrato: ${contrato_id}`);

    // Atualizar status para "enviando"
    await supabase
      .from('gestao_splits_contratos')
      .update({ contrato_status: 'enviando' })
      .eq('id', contrato_id);

    // Buscar dados do contrato com modelo
    const { data: contrato, error: contratoError } = await supabase
      .from('gestao_splits_contratos')
      .select(`
        *,
        modelo_contrato:gestao_splits_modelos_contrato!modelo_contrato_id(*)
      `)
      .eq('id', contrato_id)
      .single();

    if (contratoError || !contrato) {
      console.error('[gerar-contrato-zapsign] Erro ao buscar contrato:', contratoError);
      await supabase
        .from('gestao_splits_contratos')
        .update({ 
          contrato_status: 'erro',
          contrato_erro_mensagem: 'Contrato não encontrado'
        })
        .eq('id', contrato_id);
        
      return new Response(
        JSON.stringify({ error: 'Contrato não encontrado' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!contrato.modelo_contrato_id) {
      await supabase
        .from('gestao_splits_contratos')
        .update({ 
          contrato_status: 'erro',
          contrato_erro_mensagem: 'Contrato sem modelo definido'
        })
        .eq('id', contrato_id);
        
      return new Response(
        JSON.stringify({ error: 'Contrato sem modelo definido' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Buscar valores dos campos personalizados
    const { data: camposValores } = await supabase
      .from('gestao_splits_contratos_campos_valores')
      .select('campo_nome, valor')
      .eq('contrato_id', contrato_id);

    // Montar payload para ZapSign
    const signers = [
      {
        name: contrato.contratante_nome,
        email: contrato.contratante_email,
        phone_country: '55',
        phone_number: contrato.contratante_telefone?.replace(/\D/g, ''),
        auth_mode: 'assinaturaTela',
        send_automatic_email: true,
        send_automatic_whatsapp: false,
      }
    ];

    // Montar variáveis do documento
    const variables: Record<string, string> = {
      nome_contratante: contrato.contratante_nome,
      cpf_cnpj: contrato.contratante_cpf_cnpj || '',
      email: contrato.contratante_email || '',
      telefone: contrato.contratante_telefone || '',
      endereco: contrato.contratante_endereco || '',
      bairro: contrato.contratante_bairro || '',
      cidade: contrato.contratante_cidade || '',
      estado: contrato.contratante_estado || '',
      cep: contrato.contratante_cep || '',
      valor_total: contrato.valor_total?.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) || 'R$ 0,00',
      quantidade_parcelas: String(contrato.quantidade_parcelas || 1),
      identificador: contrato.identificador_externo,
    };

    // Adicionar campos personalizados às variáveis
    camposValores?.forEach(campo => {
      variables[campo.campo_nome.toLowerCase().replace(/\s/g, '_')] = campo.valor || '';
    });

    const payload = {
      template_id: contrato.modelo_contrato?.zapsign_template_id || null,
      signer_name: contrato.contratante_nome,
      external_id: contrato.identificador_externo,
      signers,
      // Se não usar template, pode usar base64_pdf
      // base64_pdf: "...",
      name: `Contrato ${contrato.identificador_externo} - ${contrato.contratante_nome}`,
      lang: 'pt-br',
      send_automatic_email: true,
      // Variables para substituir no template
      data: variables,
    };

    console.log('[gerar-contrato-zapsign] Payload montado:', JSON.stringify(payload));

    // Verificar se temos API key configurada
    if (!zapsignApiKey) {
      console.warn('[gerar-contrato-zapsign] ZAPSIGN_API_KEY não configurada, salvando payload apenas');
      
      // Salvar payload sem enviar (modo de teste)
      await supabase
        .from('gestao_splits_contratos')
        .update({
          contrato_status: 'sucesso',
          contrato_gerado: true,
          contrato_gerado_em: new Date().toISOString(),
          contrato_webhook_payload: payload,
          contrato_webhook_response: { message: 'ZAPSIGN_API_KEY não configurada - modo simulação' },
          contrato_url: `https://app.zapsign.com.br/simulacao/${contrato.identificador_externo}`
        })
        .eq('id', contrato_id);

      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'Contrato simulado (ZAPSIGN_API_KEY não configurada)',
          payload 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Enviar para API do ZapSign
    const zapsignResponse = await fetch(`${zapsignApiUrl}/docs`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${zapsignApiKey}`,
      },
      body: JSON.stringify(payload),
    });

    const responseData = await zapsignResponse.json();
    console.log('[gerar-contrato-zapsign] Resposta ZapSign:', JSON.stringify(responseData));

    if (!zapsignResponse.ok) {
      // Erro na API do ZapSign
      await supabase
        .from('gestao_splits_contratos')
        .update({
          contrato_status: 'erro',
          contrato_erro_mensagem: responseData.error || responseData.message || 'Erro ao criar documento no ZapSign',
          contrato_webhook_payload: payload,
          contrato_webhook_response: responseData
        })
        .eq('id', contrato_id);

      return new Response(
        JSON.stringify({ error: 'Erro ao criar documento no ZapSign', details: responseData }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Sucesso
    await supabase
      .from('gestao_splits_contratos')
      .update({
        contrato_status: 'sucesso',
        contrato_gerado: true,
        contrato_gerado_em: new Date().toISOString(),
        contrato_id_externo: responseData.token || responseData.id,
        contrato_url: responseData.original_file || responseData.signed_file || null,
        contrato_webhook_payload: payload,
        contrato_webhook_response: responseData,
        contrato_erro_mensagem: null
      })
      .eq('id', contrato_id);

    console.log('[gerar-contrato-zapsign] Documento criado com sucesso:', responseData.token);

    return new Response(
      JSON.stringify({ success: true, data: responseData }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[gerar-contrato-zapsign] Erro:', error);
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
