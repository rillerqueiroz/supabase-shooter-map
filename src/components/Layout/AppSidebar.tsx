import { 
  BarChart3, 
  Calendar, 
  FileText, 
  Home, 
  Users, 
  UserCheck,
  AlertTriangle,
  Settings,
  LogOut,
  Building2,
  DollarSign,
  ArrowRightLeft,
  Receipt,
  FileSignature,
  FilePlus,
  FileCode,
  FolderKanban,
  UserCog,
  ShoppingBag
} from "lucide-react"
import { NavLink, useLocation, useNavigate } from "react-router-dom"
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
  SidebarTrigger,
  useSidebar,
  SidebarHeader,
  SidebarFooter,
} from "@/components/ui/sidebar"
import logoSuperavit from "@/assets/logo-superavit.png"

const navigationItems = [
  { title: "Dashboard", url: "/dashboard", icon: Home },
  { title: "Calendário", url: "/calendario", icon: Calendar },
  { title: "Relatório por Cliente", url: "/relatorio-cliente", icon: Users },
  { title: "Relatório por Devedor", url: "/relatorio-devedor", icon: UserCheck },
  { title: "Gestão Setor Sul", url: "/gestao-setor-sul", icon: Building2 },
  { title: "Valores Recebidos", url: "/relatorio-valores-recebidos", icon: DollarSign },
  { title: "Todas as Cobranças", url: "/todas-cobrancas", icon: Receipt },
  { title: "Gestão de Splits", url: "/gestao-splits", icon: ArrowRightLeft },
  { title: "Extrato Bancário", url: "/extrato", icon: FileText },
  { title: "Gestão de Pós Acordo", url: "/gestao-pos-acordo", icon: FileSignature },
  
  { title: "Gestão de Projetos", url: "/gestao-projetos", icon: FolderKanban },
  { title: "Beneficiários de Splits", url: "/beneficiarios-splits", icon: UserCog },
  { title: "Modelos de Contrato", url: "/modelos-contrato", icon: FileCode },
  { title: "Gestão de Contratos", url: "/gestao-contratos", icon: FileSignature },
  { title: "Etapas de Contratos", url: "/gestao-contratos-etapas", icon: BarChart3 },
  { title: "Títulos Tudo Belo", url: "/gestao-titulos-tudobelo", icon: Receipt },
  { title: "Negativados Tudo Belo", url: "/gestao-negativados-tudobelo", icon: AlertTriangle },
  { title: "Gestão de Vendedores", url: "/gestao-vendedores", icon: ShoppingBag },
  
  { title: "Configurações", url: "/configuracoes", icon: Settings },
]

export function AppSidebar() {
  const sidebar = useSidebar()
  const location = useLocation()
  const navigate = useNavigate()
  const { signOut } = useAuth()
  const currentPath = location.pathname
  const collapsed = sidebar.state === "collapsed"

  const isActive = (path: string) => currentPath === path
  const getNavCls = ({ isActive }: { isActive: boolean }) =>
    isActive ? "bg-primary/10 text-primary font-medium border-r-2 border-primary" : "hover:bg-muted/50"

  const handleLogout = async () => {
    await signOut();
    // Não precisa navegar - App.tsx detecta automaticamente quando não está autenticado
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
              <span className="text-xs text-muted-foreground">Gestão WhatsApp</span>
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
