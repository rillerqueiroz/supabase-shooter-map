import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://supabase.superavit.app.br'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoiYW5vbiIsImlzcyI6InN1cGFiYXNlIiwiaWF0IjoxNjQxNzY5MjAwLCJleHAiOjE3OTk1MzU2MDB9.qLEgG6KvcLI_p0Cp9903FeeNbjjVaC3gdIKTFQnKP0Y'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

/**
 * Cria um cliente Supabase isolado (sem persistir sessão).
 * Usado para criar novos usuários via signUp sem sobrescrever a sessão do admin logado.
 */
export function createIsolatedClient() {
  return createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false
    }
  })
}

// Função para testar conexão e mapear a tabela gestao_disparos_whatsapp
export async function testConnection() {
  try {
    const { data, error } = await supabase
      .from('gestao_disparos_whatsapp')
      .select('*')
      .limit(1)
    
    if (error) {
      console.error('Erro ao conectar:', error)
      return { success: false, error }
    }
    
    console.log('Conexão bem-sucedida!', data)
    return { success: true, data }
  } catch (err) {
    console.error('Erro de conexão:', err)
    return { success: false, error: err }
  }
}

// DEPRECATED: This function references a legacy table that stores plaintext passwords
// and lacks RLS protection. Use Supabase Auth with gestao_profiles_todos_sistemas table instead.
// See: useGestaoSplitsUserManagement hook for the secure implementation.
/**
 * @deprecated Use Supabase Auth with gestao_profiles_todos_sistemas table instead.
 * This function is kept for reference but should not be used.
 */
export async function mapUsuariosTable() {
  console.warn('⚠️ mapUsuariosTable is deprecated. Use Supabase Auth with gestao_profiles_todos_sistemas instead.');
  return { success: false, error: new Error('This function is deprecated. Use Supabase Auth instead.') };
}

// Função para mapear estrutura da tabela setor_sul_parcelas_futuras
export async function mapSetorSulParcelasTable() {
  try {
    console.log('🔄 Mapeando estrutura da tabela setor_sul_parcelas_futuras...');
    
    const { data, error } = await supabase
      .from('setor_sul_parcelas_futuras')
      .select('*')
      .limit(3);
    
    if (error) {
      console.error('❌ Erro ao acessar tabela parcelas:', error);
      return { success: false, error };
    }
    
    console.log('✅ Estrutura da tabela parcelas mapeada:');
    console.log('📊 Total de registros encontrados:', data?.length || 0);
    
    if (data && data.length > 0) {
      console.log('📋 Campos disponíveis:', Object.keys(data[0]));
      console.log('🔍 Primeiros registros:', data);
    }
    
    return { success: true, data };
  } catch (err) {
    console.error('❌ Erro de conexão:', err);
    return { success: false, error: err };
  }
}

// Função para mapear estrutura da tabela clientes_setor_sul
export async function mapSetorSulClientesTable() {
  try {
    console.log('🔄 Mapeando estrutura da tabela clientes_setor_sul...');
    
    const { data, error } = await supabase
      .from('clientes_setor_sul')
      .select('*')
      .limit(3);
    
    if (error) {
      console.error('❌ Erro ao acessar tabela clientes:', error);
      return { success: false, error };
    }
    
    console.log('✅ Estrutura da tabela clientes mapeada:');
    console.log('📊 Total de registros encontrados:', data?.length || 0);
    
    if (data && data.length > 0) {
      console.log('📋 Campos disponíveis:', Object.keys(data[0]));
      console.log('🔍 Primeiros registros:', data);
    }
    
    return { success: true, data };
  } catch (err) {
    console.error('❌ Erro de conexão:', err);
    return { success: false, error: err };
  }
}

// Função para mapear estrutura da tabela clientes_setor_sul
export const mapClientesSetorSulTable = mapSetorSulClientesTable;
export const mapParcelasSetorSulTable = mapSetorSulParcelasTable;

// Função para obter estrutura da tabela gestao_disparos_whatsapp
export async function getTableStructure() {
  try {
    const { data, error } = await supabase
      .rpc('get_table_structure', { table_name: 'gestao_disparos_whatsapp' })
    
    if (error) {
      // Fallback: tentar buscar dados para inferir estrutura
      const { data: sampleData, error: sampleError } = await supabase
        .from('gestao_disparos_whatsapp')
        .select('*')
        .limit(1)
      
      if (sampleError) {
        console.error('Erro ao obter estrutura:', sampleError)
        return { success: false, error: sampleError }
      }
      
      return { success: true, data: sampleData }
    }
    
    return { success: true, data }
  } catch (err) {
    console.error('Erro ao obter estrutura:', err)
    return { success: false, error: err }
  }
}