import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "./AppSidebar";
interface LayoutProps {
  children: React.ReactNode;
}
export function Layout({
  children
}: LayoutProps) {
  return <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AppSidebar />
        
        <main className="flex-1 bg-background">
          <header className="h-14 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
            <div className="flex items-center h-full px-3 sm:px-4">
              <SidebarTrigger className="mr-2 sm:mr-4" />
              <div className="flex-1">
                <h1 className="text-sm sm:text-base md:text-lg font-semibold truncate">Gestão de cobranças Superavit

              </h1>
              </div>
            </div>
          </header>
          
          <div className="p-3 sm:p-4 md:p-6">
            {children}
          </div>
        </main>
      </div>
    </SidebarProvider>;
}