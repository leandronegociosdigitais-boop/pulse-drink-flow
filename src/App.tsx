import { Suspense, lazy } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";

const Dashboard = lazy(() => import("./pages/Dashboard"));
const Vendas = lazy(() => import("./pages/Vendas"));
const NovaVenda = lazy(() => import("./pages/NovaVenda"));
const VendaDetalhe = lazy(() => import("./pages/VendaDetalhe"));
const EditarVenda = lazy(() => import("./pages/EditarVenda"));
const Estoque = lazy(() => import("./pages/Estoque"));
const NovoProduto = lazy(() => import("./pages/NovoProduto"));
const ProdutoDetalhe = lazy(() => import("./pages/ProdutoDetalhe"));
const Financeiro = lazy(() => import("./pages/Financeiro"));
const NovaConta = lazy(() => import("./pages/NovaConta"));
const NovaCompra = lazy(() => import("./pages/NovaCompra"));
const HistoricoEstoque = lazy(() => import("./pages/HistoricoEstoque"));
const Relatorios = lazy(() => import("./pages/Relatorios"));
const Backup = lazy(() => import("./pages/Backup"));
const Instalar = lazy(() => import("./pages/Instalar"));
const Login = lazy(() => import("./pages/Login"));
const NotFound = lazy(() => import("./pages/NotFound"));

function PageLoader() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
    </div>
  );
}

function ProtectedSuspense({ children }: { children: React.ReactNode }) {
  return (
    <ProtectedRoute>
      <Suspense fallback={<PageLoader />}>{children}</Suspense>
    </ProtectedRoute>
  );
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 2,
      refetchOnMount: "always",
      refetchOnReconnect: true,
    },
  },
});

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<Suspense fallback={<PageLoader />}><Login /></Suspense>} />
            <Route path="/" element={<ProtectedSuspense><Dashboard /></ProtectedSuspense>} />
            <Route path="/vendas" element={<ProtectedSuspense><Vendas /></ProtectedSuspense>} />
            <Route path="/vendas/nova" element={<ProtectedSuspense><NovaVenda /></ProtectedSuspense>} />
            <Route path="/vendas/:id" element={<ProtectedSuspense><VendaDetalhe /></ProtectedSuspense>} />
            <Route path="/vendas/:id/editar" element={<ProtectedSuspense><EditarVenda /></ProtectedSuspense>} />
            <Route path="/estoque" element={<ProtectedSuspense><Estoque /></ProtectedSuspense>} />
            <Route path="/estoque/novo" element={<ProtectedSuspense><NovoProduto /></ProtectedSuspense>} />
            <Route path="/estoque/:id" element={<ProtectedSuspense><ProdutoDetalhe /></ProtectedSuspense>} />
            <Route path="/estoque/compra" element={<ProtectedSuspense><NovaCompra /></ProtectedSuspense>} />
            <Route path="/estoque/historico" element={<ProtectedSuspense><HistoricoEstoque /></ProtectedSuspense>} />
            <Route path="/financeiro" element={<ProtectedSuspense><Financeiro /></ProtectedSuspense>} />
            <Route path="/financeiro/nova-conta" element={<ProtectedSuspense><NovaConta /></ProtectedSuspense>} />
            <Route path="/relatorios" element={<ProtectedSuspense><Relatorios /></ProtectedSuspense>} />
            <Route path="/backup" element={<ProtectedSuspense><Backup /></ProtectedSuspense>} />
            <Route path="/instalar" element={<ProtectedSuspense><Instalar /></ProtectedSuspense>} />
            <Route path="*" element={<Suspense fallback={<PageLoader />}><NotFound /></Suspense>} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
