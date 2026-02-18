import { useAuth } from '@/hooks/useAuth';
import { useGestaoSplitsScreenPermissions } from '@/hooks/useGestaoSplitsScreenPermissions';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Shield } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

interface ProtectedScreenProps {
  screenSlug: string;
  requiredPermission?: 'view' | 'create' | 'update' | 'delete';
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export function ProtectedScreen({ 
  screenSlug, 
  requiredPermission = 'view',
  children,
  fallback
}: ProtectedScreenProps) {
  const { user } = useAuth();
  const { data: permissions, isLoading } = useGestaoSplitsScreenPermissions(user?.id, screenSlug);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-12 w-64" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  const hasPermission = () => {
    if (!permissions) return false;
    
    switch (requiredPermission) {
      case 'view': return permissions.canView;
      case 'create': return permissions.canCreate;
      case 'update': return permissions.canUpdate;
      case 'delete': return permissions.canDelete;
      default: return false;
    }
  };

  if (!hasPermission()) {
    if (fallback) return <>{fallback}</>;
    
    return (
      <Alert variant="destructive" className="max-w-2xl mx-auto mt-8">
        <Shield className="h-4 w-4" />
        <AlertDescription>
          Você não tem permissão para acessar esta funcionalidade. Entre em contato com o administrador do sistema.
        </AlertDescription>
      </Alert>
    );
  }

  return <>{children}</>;
}
