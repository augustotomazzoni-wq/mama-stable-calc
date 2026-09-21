import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import Consultas from "./pages/Consultas";
import ConsultaDetalhe from "./pages/ConsultaDetalhe";
import AnaliseEstatistica from "./pages/AnaliseEstatistica";
import Usuarios from "./pages/Usuarios";
import RotaProtegida from "./components/RotaProtegida";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          {/* Nenhuma tela com dados de cliente abre sem sessão. */}
          <Route path="/" element={<RotaProtegida><Index /></RotaProtegida>} />
          <Route path="/consultas" element={<RotaProtegida><Consultas /></RotaProtegida>} />
          <Route path="/consultas/:id" element={<RotaProtegida><ConsultaDetalhe /></RotaProtegida>} />
          <Route path="/analise" element={<RotaProtegida><AnaliseEstatistica /></RotaProtegida>} />
          <Route path="/usuarios" element={<RotaProtegida somenteAdmin><Usuarios /></RotaProtegida>} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
