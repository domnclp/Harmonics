import React from "react";
import ReactDOM from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { SpeedInsights } from "@vercel/speed-insights/react";
import { App } from "./app/App";
import { AuthProvider } from "./hooks/useAuth";
import "./index.css";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 2 * 60_000,
      gcTime: 10 * 60_000,
      retry: 1,
      refetchOnMount: false,
      refetchOnReconnect: false,
      refetchOnWindowFocus: false
    }
  }
});

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <App />
        <SpeedInsights />
      </AuthProvider>
    </QueryClientProvider>
  </React.StrictMode>
);
