
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
import Index from "./pages/Index";
import Calendario from "./pages/Calendario";
import RelatorioCliente from "./pages/RelatorioCliente";
import RelatorioDevedor from "./pages/RelatorioDevedor";
import DevedorDetalhes from "./pages/DevedorDetalhes";
import ClienteDetalhes from "./pages/ClienteDetalhes";
import Configuracoes from "./pages/Configuracoes";
import EditarUsuario from "./pages/EditarUsuario";
import GestaoUsuarios from "./pages/GestaoUsuarios";
import GestaoSetorSul from "./pages/GestaoSetorSul";
import RelatorioValoresRecebidos from "./pages/RelatorioValoresRecebidos";
import RelatorioValoresRecebidosCliente from "./pages/RelatorioValoresRecebidosCliente";
import TodasCobrancas from "./pages/TodasCobrancas";
import GestaoSplits from "./pages/GestaoSplits";
import Extrato from "./pages/Extrato";
import GestaoPosAcordo from "./pages/GestaoPosAcordo";
import LogsZapsign from "./pages/LogsZapsign";

import ModelosContrato from "./pages/ModelosContrato";
import GestaoProjetos from "./pages/GestaoProjetos";
import EditarProjeto from "./pages/EditarProjeto";
import BeneficiariosSplits from "./pages/BeneficiariosSplits";
import GestaoContratos from "./pages/GestaoContratos";
import NovoContrato from "./pages/NovoContrato";
import GestaoContratosEtapas from "./pages/GestaoContratosEtapas";
import GestaoTitulosTudoBelo from "./pages/GestaoTitulosTudoBelo";
import GestaoNegativadosTudoBelo from "./pages/GestaoNegativadosTudoBelo";
import GestaoVendedores from "./pages/GestaoVendedores";

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
              <Route path="/dashboard" element={<ProtectedRoute><ProtectedScreen screenSlug={getScreenSlugFromRoute('/dashboard')!}><Index /></ProtectedScreen></ProtectedRoute>} />
              <Route path="/calendario" element={<ProtectedRoute><ProtectedScreen screenSlug={getScreenSlugFromRoute('/calendario')!}><Calendario /></ProtectedScreen></ProtectedRoute>} />
              <Route path="/relatorio-cliente" element={<ProtectedRoute><ProtectedScreen screenSlug={getScreenSlugFromRoute('/relatorio-cliente')!}><RelatorioCliente /></ProtectedScreen></ProtectedRoute>} />
              <Route path="/relatorio-cliente/:nome" element={<ProtectedRoute><ProtectedScreen screenSlug={getScreenSlugFromRoute('/relatorio-cliente')!}><RelatorioCliente /></ProtectedScreen></ProtectedRoute>} />
              <Route path="/relatorio-devedor" element={<ProtectedRoute><ProtectedScreen screenSlug={getScreenSlugFromRoute('/relatorio-devedor')!}><RelatorioDevedor /></ProtectedScreen></ProtectedRoute>} />
              <Route path="/devedor-detalhes/:nomeDevedor" element={<ProtectedRoute><ProtectedScreen screenSlug={getScreenSlugFromRoute('/relatorio-devedor')!}><DevedorDetalhes /></ProtectedScreen></ProtectedRoute>} />
              <Route path="/cliente-detalhes/:nomeCliente" element={<ProtectedRoute><ProtectedScreen screenSlug={getScreenSlugFromRoute('/relatorio-cliente')!}><ClienteDetalhes /></ProtectedScreen></ProtectedRoute>} />
              <Route path="/gestao-setor-sul" element={<ProtectedRoute><ProtectedScreen screenSlug={getScreenSlugFromRoute('/gestao-setor-sul')!}><GestaoSetorSul /></ProtectedScreen></ProtectedRoute>} />
              <Route path="/relatorio-valores-recebidos" element={<ProtectedRoute><ProtectedScreen screenSlug={getScreenSlugFromRoute('/relatorio-valores-recebidos')!}><RelatorioValoresRecebidos /></ProtectedScreen></ProtectedRoute>} />
              <Route path="/valores-recebidos-cliente" element={<ProtectedRoute><ProtectedScreen screenSlug={getScreenSlugFromRoute('/relatorio-valores-recebidos')!}><RelatorioValoresRecebidosCliente /></ProtectedScreen></ProtectedRoute>} />
              <Route path="/todas-cobrancas" element={<ProtectedRoute><ProtectedScreen screenSlug={getScreenSlugFromRoute('/todas-cobrancas')!}><TodasCobrancas /></ProtectedScreen></ProtectedRoute>} />
              <Route path="/gestao-splits" element={<ProtectedRoute><ProtectedScreen screenSlug={getScreenSlugFromRoute('/gestao-splits')!}><GestaoSplits /></ProtectedScreen></ProtectedRoute>} />
              <Route path="/extrato" element={<ProtectedRoute><ProtectedScreen screenSlug={getScreenSlugFromRoute('/extrato')!}><Extrato /></ProtectedScreen></ProtectedRoute>} />
              <Route path="/gestao-pos-acordo" element={<ProtectedRoute><ProtectedScreen screenSlug={getScreenSlugFromRoute('/gestao-pos-acordo')!}><GestaoPosAcordo /></ProtectedScreen></ProtectedRoute>} />
              <Route path="/logs-zapsign" element={<ProtectedRoute><LogsZapsign /></ProtectedRoute>} />
              
              <Route path="/modelos-contrato" element={<ProtectedRoute><ProtectedScreen screenSlug={getScreenSlugFromRoute('/modelos-contrato')!}><ModelosContrato /></ProtectedScreen></ProtectedRoute>} />
              <Route path="/gestao-projetos" element={<ProtectedRoute><ProtectedScreen screenSlug={getScreenSlugFromRoute('/gestao-projetos')!}><GestaoProjetos /></ProtectedScreen></ProtectedRoute>} />
              <Route path="/gestao-projetos/:projetoId" element={<ProtectedRoute><ProtectedScreen screenSlug={getScreenSlugFromRoute('/gestao-projetos')!}><EditarProjeto /></ProtectedScreen></ProtectedRoute>} />
              <Route path="/beneficiarios-splits" element={<ProtectedRoute><ProtectedScreen screenSlug={getScreenSlugFromRoute('/beneficiarios-splits')!}><BeneficiariosSplits /></ProtectedScreen></ProtectedRoute>} />
              <Route path="/gestao-contratos" element={<ProtectedRoute><ProtectedScreen screenSlug={getScreenSlugFromRoute('/gestao-contratos')!}><GestaoContratos /></ProtectedScreen></ProtectedRoute>} />
              <Route path="/novo-contrato" element={<ProtectedRoute><ProtectedScreen screenSlug={getScreenSlugFromRoute('/gestao-contratos')!}><NovoContrato /></ProtectedScreen></ProtectedRoute>} />
              <Route path="/novo-contrato/:id" element={<ProtectedRoute><ProtectedScreen screenSlug={getScreenSlugFromRoute('/gestao-contratos')!}><NovoContrato /></ProtectedScreen></ProtectedRoute>} />
              <Route path="/gestao-contratos-etapas" element={<ProtectedRoute><ProtectedScreen screenSlug={getScreenSlugFromRoute('/gestao-contratos-etapas')!}><GestaoContratosEtapas /></ProtectedScreen></ProtectedRoute>} />
              <Route path="/gestao-titulos-tudobelo" element={<ProtectedRoute><ProtectedScreen screenSlug={getScreenSlugFromRoute('/gestao-titulos-tudobelo')!}><GestaoTitulosTudoBelo /></ProtectedScreen></ProtectedRoute>} />
              <Route path="/gestao-negativados-tudobelo" element={<ProtectedRoute><ProtectedScreen screenSlug={getScreenSlugFromRoute('/gestao-negativados-tudobelo')!}><GestaoNegativadosTudoBelo /></ProtectedScreen></ProtectedRoute>} />
              <Route path="/gestao-vendedores" element={<ProtectedRoute><GestaoVendedores /></ProtectedRoute>} />
              
              <Route path="/configuracoes" element={<ProtectedRoute><ProtectedScreen screenSlug={getScreenSlugFromRoute('/configuracoes')!}><Configuracoes /></ProtectedScreen></ProtectedRoute>} />
              <Route path="/editar-usuario/:userId" element={<ProtectedRoute><ProtectedScreen screenSlug={getScreenSlugFromRoute('/gestao-usuarios')!}><EditarUsuario /></ProtectedScreen></ProtectedRoute>} />
              <Route path="/gestao-usuarios" element={<ProtectedRoute><ProtectedScreen screenSlug={getScreenSlugFromRoute('/gestao-usuarios')!}><GestaoUsuarios /></ProtectedScreen></ProtectedRoute>} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Layout>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
