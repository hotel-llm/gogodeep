import { createRoot } from "react-dom/client";
import { HelmetProvider } from "react-helmet-async";
import App from "./App.tsx";
import "./index.css";
import { applyTheme, getStoredTheme } from "./lib/theme";

// Apply saved color scheme before first paint so there's no flash
applyTheme(getStoredTheme());

createRoot(document.getElementById("root")!).render(
  <HelmetProvider>
    <App />
  </HelmetProvider>
);
