// Tipos exclusivos para o sistema Gestão Splits
export type GestaoSplitsRole = 'admin' | 'editor' | 'viewer' | 'colaborador' | 'cliente' | 'parceiro';

export type GestaoSplitsScreen = {
  id: string;
  slug: string;
  nome: string;
  descricao?: string;
  ordem: number;
  ativo: boolean;
};

export type GestaoSplitsScreenPermission = {
  screenId: string;
  screenSlug: string;
  screenName: string;
  canView: boolean;
  canCreate: boolean;
  canUpdate: boolean;
  canDelete: boolean;
};

export type GestaoSplitsClientPermission = {
  clienteId: number;
  clienteNome: string;
  credorCedrus: string; // Mantido para compatibilidade
  canView: boolean;
  canTransact: boolean;
};

// Tipo para cliente da tabela clientes_superavit
export type ClienteSuperavitBasico = {
  id: number;
  credor_cedrus: string;
  nome_credor: string | null;
};

// Tipo para vínculo cliente-credor
export type ClienteCredorVinculo = {
  id: number;
  cliente_principal_id: number;
  cliente_vinculado_id: number;
  cliente_principal?: ClienteSuperavitBasico;
  cliente_vinculado?: ClienteSuperavitBasico;
  created_at: string;
};

export type GestaoSplitsUserProfile = {
  id: string;
  nome: string;
  avatarUrl?: string;
  createdAt: string;
  updatedAt: string;
};

export type GestaoSplitsUserWithPermissions = {
  id: string;
  email: string;
  nome: string;
  roles: GestaoSplitsRole[];
  screenPermissions: GestaoSplitsScreenPermission[];
  clientPermissions: GestaoSplitsClientPermission[];
  createdAt: string;
};

export type GestaoSplitsCreateUserInput = {
  email: string;
  password: string;
  nome: string;
  roles: GestaoSplitsRole[];
  screenPermissions?: GestaoSplitsScreenPermission[];
  clientPermissions?: GestaoSplitsClientPermission[];
};

export type GestaoSplitsUpdateUserInput = {
  nome?: string;
  roles?: GestaoSplitsRole[];
  screenPermissions?: GestaoSplitsScreenPermission[];
  clientPermissions?: GestaoSplitsClientPermission[];
};
