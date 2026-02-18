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
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const webhookData = await req.json();
    console.log('[webhook-zapsign] Recebido:', JSON.stringify(webhookData));

    // Extrair dados do webhook
    const { 
      external_id,
      token,
      status,
      signed_file,
      signers,
      event_type
    } = webhookData;

    if (!external_id && !token) {
      console.log('[webhook-zapsign] Webhook sem identificador');
      return new Response(
        JSON.stringify({ received: true, message: 'Sem identificador' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Buscar contrato pelo identificador externo ou token do ZapSign
    let query = supabase
      .from('gestao_splits_contratos')
      .select('id, identificador_externo, contrato_id_externo');

    if (external_id) {
      query = query.eq('identificador_externo', external_id);
    } else if (token) {
      query = query.eq('contrato_id_externo', token);
    }

    const { data: contrato, error: contratoError } = await query.maybeSingle();

    if (contratoError) {
      console.error('[webhook-zapsign] Erro ao buscar contrato:', contratoError);
      return new Response(
        JSON.stringify({ error: 'Erro ao buscar contrato' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!contrato) {
      console.log('[webhook-zapsign] Contrato não encontrado para:', external_id || token);
      return new Response(
        JSON.stringify({ received: true, message: 'Contrato não encontrado' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('[webhook-zapsign] Contrato encontrado:', contrato.id);

    // Verificar se o documento foi assinado
    const isDocumentSigned = 
      status === 'signed' || 
      status === 'completed' ||
      event_type === 'doc_signed' ||
      event_type === 'all_signed' ||
      (signers && signers.every((s: any) => s.status === 'signed'));

    const updateData: Record<string, any> = {
      contrato_webhook_response: webhookData,
    };

    if (isDocumentSigned) {
      console.log('[webhook-zapsign] Documento assinado!');
      updateData.contrato_assinado = true;
      updateData.contrato_assinado_em = new Date().toISOString();
      
      if (signed_file) {
        updateData.contrato_url = signed_file;
      }
    }

    // Atualizar contrato
    const { error: updateError } = await supabase
      .from('gestao_splits_contratos')
      .update(updateData)
      .eq('id', contrato.id);

    if (updateError) {
      console.error('[webhook-zapsign] Erro ao atualizar contrato:', updateError);
      return new Response(
        JSON.stringify({ error: 'Erro ao atualizar contrato' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Registrar log
    await supabase
      .from('logs_zapsign')
      .insert({
        identificador_externo: contrato.identificador_externo,
        evento: event_type || status || 'webhook_received',
        payload: webhookData,
        processado: true
      });

    console.log('[webhook-zapsign] Webhook processado com sucesso');

    return new Response(
      JSON.stringify({ success: true, contrato_id: contrato.id, assinado: isDocumentSigned }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[webhook-zapsign] Erro:', error);
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
