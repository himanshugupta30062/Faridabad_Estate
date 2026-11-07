import { useEffect, useState } from "react";
import { Link, Navigate, useLocation } from "react-router-dom";
import { Loader2, ArrowLeft } from "lucide-react";
import { Input } from "@/components/ui/input";
import { api, formatApiError } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";

export default function AdminLogin() {
  const { user, setUser } = useAuth();
  const location = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(location.state?.error || "");
  const [busy, setBusy] = useState(false);

  useEffect(() => { if (location.state?.error) window.history.replaceState({}, ""); }, [location.state]);
  if (user?.role === "admin") return <Navigate to="/admin" replace />;

  const submit = async (e) => {
    e.preventDefault();
    if (!email || !password) return setError("Please enter your email and password");
    setBusy(true);
    setError("");
    try {
      const { data } = await api.post("/auth/login", { email, password });
      if (data.role !== "admin") {
        await api.post("/auth/logout");
        throw new Error("This account does not have admin access.");
      }
      setUser(data);
    } catch (err) {
      setError(formatApiError(err));
    } finally {
      setBusy(false);
    }
  };

  const google = () => {
    // REMINDER: DO NOT HARDCODE THE URL, OR ADD ANY FALLBACKS OR REDIRECT URLS, THIS BREAKS THE AUTH
    const redirectUrl = window.location.origin + "/admin";
    window.location.href = `https://auth.emergentagent.com/?redirect=${encodeURIComponent(redirectUrl)}`;
  };

  return (
    <div className="min-h-screen bg-[#0F0F12] grid lg:grid-cols-2">
      <div className="hidden lg:block relative">
        <img src="https://images.unsplash.com/photo-1635108201018-94bbbfac4a79?crop=entropy&cs=srgb&fm=jpg&w=1400&q=80" alt="" className="absolute inset-0 w-full h-full object-cover" />
        <div className="absolute inset-0 bg-[#0F0F12]/60" />
        <div className="absolute bottom-12 left-12 right-12">
          <p className="font-serif text-4xl text-white">Faridabad Estates Admin</p>
          <p className="text-zinc-300 mt-3">Leads, insights and listings for Faridabad Estates.</p>
        </div>
      </div>
      <div className="flex items-center justify-center p-6">
        <div className="w-full max-w-sm">
          <Link to="/" className="text-sm text-zinc-500 hover:text-white flex items-center gap-1" data-testid="login-back-link"><ArrowLeft className="w-4 h-4" /> Back to website</Link>
          <h1 className="font-serif text-3xl text-white mt-8">Admin sign in</h1>
          <p className="text-zinc-500 text-sm mt-2">Authorised Faridabad Estates staff only.</p>
          <form onSubmit={submit} className="space-y-4 mt-8" noValidate>
            <Input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} className="bg-white/5 border-white/10 text-white h-11" data-testid="login-email-input" />
            <Input type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} className="bg-white/5 border-white/10 text-white h-11" data-testid="login-password-input" />
            {error && <p className="text-red-400 text-sm" data-testid="login-error">{error}</p>}
            <button disabled={busy} className="btn-gold w-full h-11 rounded-sm font-medium flex items-center justify-center gap-2 disabled:opacity-60" data-testid="login-submit-button">
              {busy && <Loader2 className="w-4 h-4 animate-spin" />} Sign in
            </button>
          </form>
          <div className="flex items-center gap-3 my-6 text-xs text-zinc-600"><span className="flex-1 h-px bg-white/10" />OR<span className="flex-1 h-px bg-white/10" /></div>
          <button onClick={google} className="w-full h-11 rounded-sm border border-white/15 text-white hover:border-[#D4AF37] flex items-center justify-center gap-2 text-sm" data-testid="login-google-button">
            <svg className="w-4 h-4" viewBox="0 0 48 48"><path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z"/><path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/><path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-7.9l-6.5 5C9.5 39.6 16.2 44 24 44z"/><path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z"/></svg>
            Continue with Google
          </button>
        </div>
      </div>
    </div>
  );
}
