import { HashRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./AuthContext";
import { LoginPage } from "./LoginPage";
import { Layout } from "./Layout";
import { Dashboard } from "./Dashboard";
import { ProductsList } from "./ProductsList";
import { ProductForm } from "./ProductForm";
import { Settings } from "./Settings";
import { Rendimiento } from "./Rendimiento";
import { Atributos } from "./Atributos";
import { VideoDropsManager } from "./VideoDropsManager";

const isDebugMode = () => new URLSearchParams(window.location.search).get("debug") === "true";

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { token, loading } = useAuth();
  if (loading && !isDebugMode()) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="size-6 border-2 border-hype/40 border-t-hype rounded-full animate-spin" />
      </div>
    );
  }
  if (!token && !isDebugMode()) return <Navigate to="/login" replace />;
  return <Layout>{children}</Layout>;
}

function AdminRoutes() {
  const { token, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="size-6 border-2 border-hype/40 border-t-hype rounded-full animate-spin" />
      </div>
    );
  }

  if (!token && !isDebugMode()) {
    return (
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    );
  }

  return (
    <Routes>
      <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
      <Route path="/products" element={<ProtectedRoute><ProductsList /></ProtectedRoute>} />
      <Route path="/products/new" element={<ProtectedRoute><ProductForm /></ProtectedRoute>} />
      <Route path="/products/:id" element={<ProtectedRoute><ProductForm /></ProtectedRoute>} />
      <Route path="/attributes" element={<ProtectedRoute><Atributos /></ProtectedRoute>} />
      <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
      <Route path="/rendimiento" element={<ProtectedRoute><Rendimiento /></ProtectedRoute>} />
      <Route path="/videodrops" element={<ProtectedRoute><VideoDropsManager /></ProtectedRoute>} />
      <Route path="/login" element={<Navigate to="/" replace />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export function AdminApp() {
  return (
    <AuthProvider>
      <HashRouter>
        <AdminRoutes />
      </HashRouter>
    </AuthProvider>
  );
}
