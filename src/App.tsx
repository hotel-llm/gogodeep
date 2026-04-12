import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, useLocation } from "react-router-dom";
import { AnimatePresence } from "framer-motion";
import { useEffect } from "react";
import { TooltipProvider } from "@/components/ui/tooltip";
import AppNav from "@/components/AppNav";
import ProtectedRoute from "@/components/ProtectedRoute";
import WhaleAssistant from "@/components/WhaleAssistant";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import Index from "./pages/Index";
import DiagnosticLab from "./pages/DiagnosticLab";
import BlindSpotReport from "./pages/BlindSpotReport";
import Pricing from "./pages/Pricing";
import Contact from "./pages/Contact";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import NotFound from "./pages/NotFound";
import ResetPassword from "./pages/ResetPassword";

const queryClient = new QueryClient();

function AnimatedRoutes() {
  const location = useLocation();
  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        <Route path="/" element={<Index />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route
          path="/workspace"
          element={
            <ErrorBoundary>
              <DiagnosticLab />
            </ErrorBoundary>
          }
        />
        <Route
          path="/report"
          element={
            <ErrorBoundary>
              <BlindSpotReport />
            </ErrorBoundary>
          }
        />
        <Route path="/pricing" element={<Pricing />} />
        <Route path="/contact" element={<Contact />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </AnimatePresence>
  );
}

function HashCleaner() {
  useEffect(() => {
    if (window.location.hash === "#" || window.location.hash === "#/") {
      window.history.replaceState(null, "", window.location.pathname + window.location.search);
    }
  }, []);
  return null;
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <BrowserRouter>
        <HashCleaner />
        <div className="liquid-glass-bg" aria-hidden />
        <AppNav />
        <AnimatedRoutes />
        <WhaleAssistant />
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
