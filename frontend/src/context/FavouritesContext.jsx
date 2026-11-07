import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { api, formatApiError } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";

const FavCtx = createContext(null);

export const FavouritesProvider = ({ children }) => {
  const { user } = useAuth();
  const [ids, setIds] = useState([]);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (!user) return setIds([]);
    api.get("/me/favourites").then((r) => setIds(r.data.ids)).catch(() => {});
  }, [user]);

  const toggle = useCallback(async (pid) => {
    if (!user) {
      toast("Sign in to save properties", { description: "Create a free account to keep your shortlist on any device." });
      return navigate(`/login?next=${encodeURIComponent(location.pathname + location.search)}`);
    }
    const saved = ids.includes(pid);
    setIds((l) => (saved ? l.filter((x) => x !== pid) : [pid, ...l]));
    try {
      if (saved) await api.delete(`/me/favourites/${pid}`);
      else await api.post(`/me/favourites/${pid}`);
      toast.success(saved ? "Removed from saved" : "Saved to your shortlist");
    } catch (e) {
      setIds((l) => (saved ? [pid, ...l] : l.filter((x) => x !== pid)));
      toast.error(formatApiError(e));
    }
  }, [user, ids, navigate, location]);

  return <FavCtx.Provider value={{ ids, toggle }}>{children}</FavCtx.Provider>;
};

export const useFavourites = () => useContext(FavCtx);
