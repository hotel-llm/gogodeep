import { createRoot } from "react-dom/client";
import { HelmetProvider } from "react-helmet-async";
import App from "./App.tsx";
import "./index.css";
import { applyColorMode, getStoredColorMode } from "./lib/theme";

// Apply saved color mode before first paint so there's no flash
applyColorMode(getStoredColorMode());

createRoot(document.getElementById("root")!).render(
  <HelmetProvider>
    <App />
  </HelmetProvider>
);
