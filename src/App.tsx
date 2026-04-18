import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, useLocation, useNavigate } from "react-router-dom";
import { AnimatePresence } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Upload } from "lucide-react";
import { pendingFileStore } from "@/lib/pendingFile";
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
import Interact from "./pages/Interact";

const queryClient = new QueryClient();

const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/gif", "image/webp", "image/heic", "image/heif"];

// Listens for file drops anywhere on the page and navigates to workspace
function GlobalDropZone() {
  const navigate = useNavigate();
  const location = useLocation();
  const [dragging, setDragging] = useState(false);
  const dragCounterRef = useRef(0);

  useEffect(() => {
    const onEnter = (e: DragEvent) => { e.preventDefault(); dragCounterRef.current++; setDragging(true); };
    const onLeave = () => { dragCounterRef.current--; if (dragCounterRef.current === 0) setDragging(false); };
    const onOver = (e: DragEvent) => e.preventDefault();
    const onDrop = (e: DragEvent) => {
      e.preventDefault();
      dragCounterRef.current = 0;
      setDragging(false);
      // Let DiagnosticLab handle drops when already on /workspace
      if (location.pathname === "/workspace") return;
      const file = e.dataTransfer?.files[0];
      if (!file || !ALLOWED_IMAGE_TYPES.includes(file.type)) return;
      pendingFileStore.set(file);
      navigate("/workspace");
    };
    document.addEventListener("dragenter", onEnter);
    document.addEventListener("dragleave", onLeave);
    document.addEventListener("dragover", onOver);
    document.addEventListener("drop", onDrop);
    return () => {
      document.removeEventListener("dragenter", onEnter);
      document.removeEventListener("dragleave", onLeave);
      document.removeEventListener("dragover", onOver);
      document.removeEventListener("drop", onDrop);
    };
  }, [navigate]);

  if (!dragging || location.pathname === "/workspace") return null;
  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-background/90 backdrop-blur-sm pointer-events-none">
      <div className="flex flex-col items-center gap-4 rounded-2xl border-2 border-dashed border-primary bg-card/80 px-16 py-12 text-center shadow-2xl">
        <Upload className="h-14 w-14 text-primary" />
        <p className="text-2xl font-bold text-foreground">Drop it like it's hot</p>
      </div>
    </div>
  );
}

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
        <Route path="/interact" element={<Interact />} />
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
        <GlobalDropZone />
        <div className="liquid-glass-bg" aria-hidden />
        <AppNav />
        <AnimatedRoutes />
        <WhaleAssistant />
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
