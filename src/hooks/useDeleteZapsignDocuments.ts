import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';

const WEBHOOK_URL = 'https://projeton8n-n8n.pjq1cs.easypanel.host/webhook/apaga-documento-zapsign';

interface DeleteResult {
  success: boolean;
  id: number;
  error?: string;
}

interface ZapsignDeleteResponse {
  deleted?: boolean;
  deleted_at?: string;
  status?: string;
  token?: string;
  name?: string;
  [key: string]: unknown;
}

export function useDeleteZapsignDocuments() {
  const [isDeleting, setIsDeleting] = useState(false);
  const queryClient = useQueryClient();

  const deleteDocuments = async (
    documents: Array<{ id: number; token: string; nome: string | null }>
  ): Promise<DeleteResult[]> => {
    setIsDeleting(true);
    const results: DeleteResult[] = [];

    try {
      const { data: { user } } = await supabase.auth.getUser();

      for (const doc of documents) {
        try {
          // 1. Get current document data for logging
          const { data: currentData } = await supabase
            .from('controle_zapsign_geral')
            .select('*')
            .eq('id', doc.id)
            .single();

          // 2. Send webhook to delete from ZapSign
          const webhookResponse = await fetch(WEBHOOK_URL, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              apagar: true,
              token: doc.token,
            }),
          });

          if (!webhookResponse.ok) {
            throw new Error(`Webhook retornou erro HTTP: ${webhookResponse.status}`);
          }

          // Parse response - webhook returns array
          let webhookData: ZapsignDeleteResponse | null = null;
          try {
            const responseData = await webhookResponse.json();
            // Webhook returns array, get first element
            webhookData = Array.isArray(responseData) ? responseData[0] : responseData;
          } catch {
            throw new Error('Resposta do webhook não é um JSON válido');
          }

          // Check if webhook indicates successful deletion (deleted: true)
          if (!webhookData || webhookData.deleted !== true) {
            throw new Error('ZapSign não confirmou a exclusão do documento');
          }

          console.log('✅ ZapSign confirmou exclusão:', webhookData);

          // 3. Update document status in database ONLY after confirmed deletion
          // Important: with RLS enabled, PostgREST can return 204 even when 0 rows were updated.
          // Using .select() lets us detect "0 rows affected" (usually permission/policy issue).
          const { data: updatedRows, error: updateError } = await supabase
            .from('controle_zapsign_geral')
            .update({ status_documento: 'apagado' })
            .eq('id', doc.id)
            .select('id,status_documento');

          if (updateError) {
            throw updateError;
          }

          if (!updatedRows || updatedRows.length === 0) {
            throw new Error(
              'Não foi possível atualizar o status no banco (provável política RLS sem permissão de UPDATE).'
            );
          }
          // 4. Log the action with full webhook response
          await supabase
            .from('controle_zapsign_log')
            .insert({
              registro_id: doc.id,
              acao: 'apagar',
              dados_anteriores: currentData,
              dados_novos: { 
                ...currentData, 
                status_documento: 'apagado',
                zapsign_response: webhookData 
              },
              usuario_id: user?.id,
            });

          results.push({ success: true, id: doc.id });
        } catch (error) {
          console.error(`Error deleting document ${doc.id}:`, error);
          
          // Log the failed attempt
          const { data: { user } } = await supabase.auth.getUser();
          await supabase
            .from('controle_zapsign_log')
            .insert({
              registro_id: doc.id,
              acao: 'apagar_falha',
              dados_anteriores: null,
              dados_novos: { 
                error: error instanceof Error ? error.message : 'Erro desconhecido',
                token: doc.token 
              },
              usuario_id: user?.id,
            });

          results.push({
            success: false,
            id: doc.id,
            error: error instanceof Error ? error.message : 'Erro desconhecido',
          });
        }
      }

      await queryClient.invalidateQueries({ queryKey: ['controle-zapsign-geral'] });

      const successCount = results.filter((r) => r.success).length;
      const failCount = results.filter((r) => !r.success).length;

      if (successCount > 0 && failCount === 0) {
        toast.success(`${successCount} documento(s) apagado(s) com sucesso`);
      } else if (successCount > 0 && failCount > 0) {
        toast.warning(`${successCount} sucesso(s), ${failCount} falha(s)`);
      } else {
        toast.error('Falha ao apagar documentos');
      }

      return results;
    } finally {
      setIsDeleting(false);
    }
  };

  return { deleteDocuments, isDeleting };
}
