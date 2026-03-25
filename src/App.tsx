
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Layout } from "@/components/Layout/Layout";
import { ProtectedRoute } from "@/components/Auth/ProtectedRoute";
import { ProtectedScreen } from "@/components/Auth/ProtectedScreen";
import { getScreenSlugFromRoute } from "@/utils/screenMapping";
import { useAuth } from "@/hooks/useAuth";
import PaginaInicial from "./pages/PaginaInicial";
import Configuracoes from "./pages/Configuracoes";
import EditarUsuario from "./pages/EditarUsuario";
import GestaoUsuarios from "./pages/GestaoUsuarios";
import GestaoTitulosTudoBelo from "./pages/GestaoTitulosTudoBelo";
import AnalyticsTitulosTudoBelo from "./pages/AnalyticsTitulosTudoBelo";
import GestaoNegativadosTudoBelo from "./pages/GestaoNegativadosTudoBelo";
import GestaoAcessoSistemas from "./pages/GestaoAcessoSistemas";
import UploadArquivos from "./pages/UploadArquivos";
import GestaoTitulosParaTestes from "./pages/GestaoTitulosParaTestes";
import UploadArquivosOficial from "./pages/UploadArquivosOficial";

import Login from "./pages/Login";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => {
  const { loading, isAuthenticated } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              <Route path="*" element={<Login />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </QueryClientProvider>
    );
  }

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Layout>
            <Routes>
              <Route path="/" element={<ProtectedRoute><PaginaInicial /></ProtectedRoute>} />
              <Route path="/gestao-titulos-tudobelo" element={<ProtectedRoute><ProtectedScreen screenSlug={getScreenSlugFromRoute('/gestao-titulos-tudobelo')!}><GestaoTitulosTudoBelo /></ProtectedScreen></ProtectedRoute>} />
              <Route path="/analytics-titulos-tudobelo" element={<ProtectedRoute><ProtectedScreen screenSlug={getScreenSlugFromRoute('/gestao-titulos-tudobelo')!}><AnalyticsTitulosTudoBelo /></ProtectedScreen></ProtectedRoute>} />
              <Route path="/gestao-negativados-tudobelo" element={<ProtectedRoute><ProtectedScreen screenSlug={getScreenSlugFromRoute('/gestao-negativados-tudobelo')!}><GestaoNegativadosTudoBelo /></ProtectedScreen></ProtectedRoute>} />
              <Route path="/configuracoes" element={<ProtectedRoute><ProtectedScreen screenSlug={getScreenSlugFromRoute('/configuracoes')!}><Configuracoes /></ProtectedScreen></ProtectedRoute>} />
              <Route path="/editar-usuario/:userId" element={<ProtectedRoute><ProtectedScreen screenSlug={getScreenSlugFromRoute('/gestao-usuarios')!}><EditarUsuario /></ProtectedScreen></ProtectedRoute>} />
              <Route path="/gestao-usuarios" element={<ProtectedRoute><ProtectedScreen screenSlug={getScreenSlugFromRoute('/gestao-usuarios')!}><GestaoUsuarios /></ProtectedScreen></ProtectedRoute>} />
              <Route path="/upload-arquivos" element={<ProtectedRoute><ProtectedScreen screenSlug={getScreenSlugFromRoute('/upload-arquivos')!}><UploadArquivos /></ProtectedScreen></ProtectedRoute>} />
              <Route path="/upload-arquivos-oficial" element={<ProtectedRoute><ProtectedScreen screenSlug={getScreenSlugFromRoute('/upload-arquivos-oficial')!}><UploadArquivosOficial /></ProtectedScreen></ProtectedRoute>} />
              <Route path="/gestao-titulos-testes" element={<ProtectedRoute><ProtectedScreen screenSlug={getScreenSlugFromRoute('/gestao-titulos-testes')!}><GestaoTitulosParaTestes /></ProtectedScreen></ProtectedRoute>} />
              <Route path="/gestao-acesso-sistemas" element={<ProtectedRoute><ProtectedScreen screenSlug={getScreenSlugFromRoute('/gestao-acesso-sistemas')!}><GestaoAcessoSistemas /></ProtectedScreen></ProtectedRoute>} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Layout>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
