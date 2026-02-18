import { useAuth } from '@/hooks/useAuth';
import { useGestaoSplitsIsAdmin } from '@/hooks/useGestaoSplitsUserRoles';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useNavigate } from 'react-router-dom';
import { 
  Receipt, 
  AlertTriangle,
  Settings,
  LayoutGrid
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

const screenConfig: Record<string, { icon: React.ElementType; route: string; description: string }> = {
  'gestao-titulos-tudobelo': { icon: Receipt, route: '/gestao-titulos-tudobelo', description: 'Gestão de títulos Tudo Belo' },
  'gestao-negativados-tudobelo': { icon: AlertTriangle, route: '/gestao-negativados-tudobelo', description: 'Gestão de negativados Tudo Belo' },
  'configuracoes': { icon: Settings, route: '/configuracoes', description: 'Configurações do sistema' },
};

export default function PaginaInicial() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { isAdmin, isLoading: isLoadingAdmin } = useGestaoSplitsIsAdmin(user?.id);

  const { data: allScreens = [], isLoading: isLoadingScreens } = useQuery({
    queryKey: ['gestao-splits-all-screens'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('gestao_splits_screens')
        .select('id, slug, nome')
        .order('ordem', { ascending: true });
      
      if (error) throw error;
      return data || [];
    }
  });

  const { data: userPermissions = [], isLoading: isLoadingPerms } = useQuery({
    queryKey: ['gestao-splits-user-screen-permissions', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      
      const { data, error } = await supabase
        .from('gestao_splits_screen_permissions')
        .select('screen_id, can_view')
        .eq('user_id', user.id)
        .eq('can_view', true);
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id && !isAdmin && !isLoadingAdmin
  });

  const isLoading = isLoadingAdmin || isLoadingScreens || (!isAdmin && isLoadingPerms);

  const visibleScreens = allScreens.filter(screen => {
    if (isAdmin) return true;
    return userPermissions.some(p => p.screen_id === screen.id);
  });

  const screensToShow = visibleScreens.filter(screen => screenConfig[screen.slug]);

  if (isLoading) {
    return (
      <div className="container mx-auto py-6 px-4">
        <div className="flex items-center gap-3 mb-8">
          <Skeleton className="h-8 w-8" />
          <Skeleton className="h-8 w-48" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-32 rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 px-4">
      <div className="flex items-center gap-3 mb-8">
        <LayoutGrid className="h-8 w-8 text-primary" />
        <div>
          <h1 className="text-2xl font-bold">Página Inicial</h1>
          <p className="text-muted-foreground text-sm">
            Acesse rapidamente as funcionalidades do sistema
          </p>
        </div>
      </div>

      {screensToShow.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <LayoutGrid className="h-16 w-16 mx-auto mb-4 opacity-20" />
          <p className="text-lg font-medium">Nenhuma tela disponível</p>
          <p className="text-sm">Entre em contato com o administrador para obter acesso.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {screensToShow.map(screen => {
            const config = screenConfig[screen.slug];
            if (!config) return null;
            const Icon = config.icon;
            return (
              <Card
                key={screen.id}
                className="group cursor-pointer transition-all duration-200 hover:shadow-lg hover:border-primary/50 hover:-translate-y-1"
                onClick={() => navigate(config.route)}
              >
                <CardContent className="p-6 flex flex-col items-center text-center gap-3">
                  <div className="p-4 rounded-full bg-primary/10 group-hover:bg-primary/20 transition-colors">
                    <Icon className="h-8 w-8 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors">
                      {screen.nome}
                    </h3>
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                      {config.description}
                    </p>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
