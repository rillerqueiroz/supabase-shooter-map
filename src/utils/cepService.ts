export interface CepResult {
  logradouro: string;
  bairro: string;
  localidade: string;
  uf: string;
  complemento: string;
}

export const buscarCEP = async (cep: string): Promise<CepResult | null> => {
  const cleanCep = cep.replace(/\D/g, '');
  if (cleanCep.length !== 8) return null;

  try {
    const response = await fetch(`https://viacep.com.br/ws/${cleanCep}/json/`);
    const data = await response.json();
    
    if (data.erro) return null;
    
    return {
      logradouro: data.logradouro || '',
      bairro: data.bairro || '',
      localidade: data.localidade || '',
      uf: data.uf || '',
      complemento: data.complemento || '',
    };
  } catch {
    return null;
  }
};
