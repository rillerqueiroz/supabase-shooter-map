import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { TituloTudoBelo } from "./useTitulosTudoBelo";

const WEBHOOK_URL = "https://n8n.superavit.app.br/webhook/inserir-titulo-tudobelo";

export const useInserirCedrusWebhook = () => {
  return useMutation({
    mutationFn: async (titulo: TituloTudoBelo) => {
      const response = await fetch(WEBHOOK_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(titulo),
      });

      if (!response.ok) {
        throw new Error(`Erro ao enviar para o Cedrus: ${response.status}`);
      }

      return response.json().catch(() => ({ success: true }));
    },
    onSuccess: () => {
      toast.success("Título enviado para inserção no Cedrus com sucesso!");
    },
    onError: (error: Error) => {
      toast.error(`Erro ao enviar para o Cedrus: ${error.message}`);
    },
  });
};
