import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { api, formatApiError } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";

export default function AuthCallback() {
  const location = useLocation();
  const navigate = useNavigate();
  const { setUser } = useAuth();
  const done = useRef(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (done.current) return;
    done.current = true;
    const sessionId = new URLSearchParams(location.hash.slice(1)).get("session_id");
    api.post("/auth/google/session", { session_id: sessionId })
      .then(({ data }) => {
        setUser(data);
        navigate("/admin", { replace: true, state: { user: data } });
      })
      .catch((e) => {
        setError(formatApiError(e));
        navigate("/admin/login", { replace: true, state: { error: formatApiError(e) } });
      });
  }, [location.hash, navigate, setUser]);

  return <div className="min-h-screen bg-[#0F0F12] text-zinc-400 flex items-center justify-center" data-testid="auth-callback">{error || "Signing you in…"}</div>;
}
