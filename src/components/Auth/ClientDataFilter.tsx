import { useAuth } from '@/hooks/useAuth';
import { useGestaoSplitsClientPermissions } from '@/hooks/useGestaoSplitsClientPermissions';
import { ReactNode } from 'react';

interface ClientDataFilterProps<T> {
  data: T[];
  getCredorCedrus: (item: T) => string;
  children: (filteredData: T[]) => ReactNode;
}

export function ClientDataFilter<T>({ 
  data, 
  getCredorCedrus, 
  children 
}: ClientDataFilterProps<T>) {
  const { user } = useAuth();
  const { data: permissions, isLoading } = useGestaoSplitsClientPermissions(user?.id);

  // Se ainda está carregando ou data está undefined, retornar lista vazia
  if (!data || isLoading) {
    return <>{children([])}</>;
  }

  // Admin = ver tudo
  if (permissions === null) {
    return <>{children(data)}</>;
  }

  // Sem permissões ou array vazio = não ver nada (bloqueio padrão)
  if (!permissions || permissions.length === 0) {
    return <>{children([])}</>;
  }

  // Filtrar apenas clientes permitidos
  const allowedCredores = new Set(permissions.map(p => p.credor_cedrus));
  const filteredData = data.filter(item => 
    allowedCredores.has(getCredorCedrus(item))
  );

  return <>{children(filteredData)}</>;
}
