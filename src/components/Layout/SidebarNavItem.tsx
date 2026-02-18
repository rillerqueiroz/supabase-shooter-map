import { NavLink } from "react-router-dom";
import { LucideIcon } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useGestaoSplitsScreenPermissions } from "@/hooks/useGestaoSplitsScreenPermissions";
import { useGestaoSplitsIsAdmin } from "@/hooks/useGestaoSplitsUserRoles";
import { getScreenSlugFromRoute } from "@/utils/screenMapping";
import { SidebarMenuButton, SidebarMenuItem } from "@/components/ui/sidebar";

interface SidebarNavItemProps {
  title: string;
  url: string;
  icon: LucideIcon;
  collapsed: boolean;
  getNavCls: ({ isActive }: { isActive: boolean }) => string;
}

export function SidebarNavItem({ title, url, icon: Icon, collapsed, getNavCls }: SidebarNavItemProps) {
  const { user } = useAuth();
  const { isAdmin, isLoading: isLoadingAdmin } = useGestaoSplitsIsAdmin(user?.id);
  const screenSlug = getScreenSlugFromRoute(url);
  const { data: permissions, isLoading: isLoadingPerms } = useGestaoSplitsScreenPermissions(user?.id, screenSlug);

  // Se não conseguiu mapear o slug da rota, não renderizar
  if (!screenSlug) {
    console.warn('⚠️ [SidebarNavItem] Slug não mapeado para rota:', url);
    return null;
  }

  // Admin vê tudo
  if (isAdmin) {
    return (
      <SidebarMenuItem>
        <SidebarMenuButton asChild>
          <NavLink to={url} end={url === "/"} className={getNavCls}>
            <Icon className="mr-2 h-4 w-4" />
            {!collapsed && <span>{title}</span>}
          </NavLink>
        </SidebarMenuButton>
      </SidebarMenuItem>
    );
  }

  // Enquanto carrega, não mostra
  if (isLoadingAdmin || isLoadingPerms) {
    return null;
  }

  // Se não tem permissão de view, não mostra
  if (!permissions?.canView) {
    return null;
  }

  return (
    <SidebarMenuItem>
      <SidebarMenuButton asChild>
        <NavLink to={url} end={url === "/"} className={getNavCls}>
          <Icon className="mr-2 h-4 w-4" />
          {!collapsed && <span>{title}</span>}
        </NavLink>
      </SidebarMenuButton>
    </SidebarMenuItem>
  );
}
