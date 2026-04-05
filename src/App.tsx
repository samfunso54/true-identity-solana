import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { WalletContextProvider } from "@/contexts/WalletContext";
import { VerificationProvider } from "@/contexts/VerificationContext";
import { Navbar } from "@/components/Navbar";
import Index from "./pages/Index";
import Verify from "./pages/Verify";
import Dashboard from "./pages/Dashboard";
import Developer from "./pages/Developer";
import Docs from "./pages/Docs";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <WalletContextProvider>
        <VerificationProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Navbar />
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/verify" element={<Verify />} />
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/developer" element={<Developer />} />
              <Route path="/docs" element={<Docs />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </VerificationProvider>
      </WalletContextProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
