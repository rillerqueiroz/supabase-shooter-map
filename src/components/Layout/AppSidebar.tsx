import { 
  AlertTriangle,
  Settings,
  LogOut,
  Receipt,
  BarChart3,
  ShieldCheck,
} from "lucide-react"
import { useLocation, useNavigate } from "react-router-dom"
import { useAuth } from "@/hooks/useAuth"
import { SidebarNavItem } from "./SidebarNavItem"
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
  useSidebar,
} from "@/components/ui/sidebar"
import logoSuperavit from "@/assets/logo-superavit.png"

const navigationItems = [
  { title: "Títulos Tudo Belo", url: "/gestao-titulos-tudobelo", icon: Receipt },
  { title: "Analytics Títulos", url: "/analytics-titulos-tudobelo", icon: BarChart3 },
  { title: "Negativados Tudo Belo", url: "/gestao-negativados-tudobelo", icon: AlertTriangle },
  { title: "Acesso Sistemas", url: "/gestao-acesso-sistemas", icon: ShieldCheck },
  { title: "Configurações", url: "/configuracoes", icon: Settings },
]

export function AppSidebar() {
  const sidebar = useSidebar()
  const location = useLocation()
  const navigate = useNavigate()
  const { signOut } = useAuth()
  const currentPath = location.pathname
  const collapsed = sidebar.state === "collapsed"

  const getNavCls = ({ isActive }: { isActive: boolean }) =>
    isActive ? "bg-primary/10 text-primary font-medium border-r-2 border-primary" : "hover:bg-muted/50"

  const handleLogout = async () => {
    await signOut();
  };

  return (
    <Sidebar className={collapsed ? "w-14" : "w-64"} collapsible="icon">
      <SidebarHeader className="border-b">
        <div className="flex items-center gap-2 px-4 py-2">
          <img 
            src={logoSuperavit} 
            alt="Superávit Serviços" 
            className={`transition-all ${collapsed ? "h-8 w-8" : "h-12 w-auto"}`}
          />
          {!collapsed && (
            <div className="flex flex-col">
              <span className="text-sm font-semibold text-foreground">Superávit</span>
              <span className="text-xs text-muted-foreground">Tudo Belo</span>
            </div>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Navegação</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navigationItems.map((item) => (
                <SidebarNavItem
                  key={item.title}
                  title={item.title}
                  url={item.url}
                  icon={item.icon}
                  collapsed={collapsed}
                  getNavCls={getNavCls}
                />
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton onClick={handleLogout}>
              <LogOut className="mr-2 h-4 w-4" />
              {!collapsed && <span>Sair</span>}
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  )
}
