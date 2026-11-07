import "@/App.css";
import { BrowserRouter, Navigate, Route, Routes, useLocation } from "react-router-dom";
import { Toaster } from "@/components/ui/sonner";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import { FavouritesProvider } from "@/context/FavouritesContext";
import SiteLayout from "@/components/site/SiteLayout";
import HomePage from "@/pages/HomePage";
import SearchPage from "@/pages/SearchPage";
import PropertyPage from "@/pages/PropertyPage";
import NeighbourhoodPage from "@/pages/NeighbourhoodPage";
import ComparePage from "@/pages/ComparePage";
import SavedPage from "@/pages/SavedPage";
import AccountAuth from "@/pages/AccountAuth";
import AdminLogin from "@/pages/AdminLogin";
import AdminDashboard from "@/pages/AdminDashboard";
import AuthCallback from "@/pages/AuthCallback";

const Protected = ({ children }) => {
  const { user } = useAuth();
  if (user === null)
    return (
      <div className="min-h-screen bg-[#0F0F12] flex items-center justify-center text-zinc-400" data-testid="auth-loading">
        Checking access…
      </div>
    );
  if (!user || user.role !== "admin") return <Navigate to="/admin/login" replace />;
  return children;
};

function AppRouter() {
  const location = useLocation();
  if (location.hash?.includes("session_id=")) return <AuthCallback />;
  return (
    <Routes>
      <Route element={<SiteLayout />}>
        <Route path="/" element={<HomePage />} />
        <Route path="/properties" element={<SearchPage />} />
        <Route path="/property/:slug" element={<PropertyPage />} />
        <Route path="/neighbourhoods/:slug" element={<NeighbourhoodPage />} />
        <Route path="/compare" element={<ComparePage />} />
        <Route path="/saved" element={<SavedPage />} />
        <Route path="/login" element={<AccountAuth mode="login" />} />
        <Route path="/register" element={<AccountAuth mode="register" />} />
      </Route>
      <Route path="/admin/login" element={<AdminLogin />} />
      <Route path="/admin" element={<Protected><AdminDashboard /></Protected>} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <FavouritesProvider>
          <AppRouter />
        </FavouritesProvider>
        <Toaster position="top-center" richColors />
      </AuthProvider>
    </BrowserRouter>
  );
}
