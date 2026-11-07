import { useState } from "react";
import { Link, Navigate, useSearchParams } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { api, formatApiError } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { Seo } from "@/components/site/Seo";

export default function AccountAuth({ mode }) {
  const { user, setUser } = useAuth();
  const [sp] = useSearchParams();
  const next = sp.get("next") || "/saved";
  const [f, setF] = useState({ name: "", email: "", password: "" });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  if (user) return <Navigate to={next.startsWith("/") ? next : "/"} replace />;
  const reg = mode === "register";
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    if (reg && f.name.trim().length < 2) return setError("Please enter your name");
    if (!/^\S+@\S+\.\S+$/.test(f.email)) return setError("Please enter a valid email");
    if (reg && f.password.length < 8) return setError("Password must be at least 8 characters");
    setBusy(true); setError("");
    try {
      const { data } = await api.post(reg ? "/auth/register" : "/auth/login", reg ? f : { email: f.email, password: f.password });
      setUser(data);
    } catch (err) {
      setError(formatApiError(err));
    } finally {
      setBusy(false);
    }
  };
  const field = "h-12 bg-white border-[#DDD7CB]";
  return (
    <div className="max-w-md mx-auto px-4 py-16 sm:py-24" data-testid={reg ? "register-page" : "login-page"}>
      <Seo title={`${reg ? "Create account" : "Sign in"} | Faridabad Estates`} description="Save homes and keep your shortlist across devices." />
      <p className="eyebrow">Your Faridabad Estates account</p>
      <h1 className="font-serif text-4xl mt-3">{reg ? "Create your account" : "Welcome back"}</h1>
      <p className="text-[#55524D] mt-2 text-sm">Save homes and pick up your shortlist on any device.</p>
      <form onSubmit={submit} noValidate className="space-y-3 mt-8">
        {reg && <Input aria-label="Full name" placeholder="Full name" value={f.name} onChange={set("name")} className={field} data-testid="register-name-input" />}
        <Input aria-label="Email" type="email" placeholder="Email" value={f.email} onChange={set("email")} className={field} data-testid={reg ? "register-email-input" : "visitor-login-email-input"} />
        <Input aria-label="Password" type="password" placeholder={reg ? "Password (min 8 characters)" : "Password"} value={f.password} onChange={set("password")} className={field} data-testid={reg ? "register-password-input" : "visitor-login-password-input"} />
        {error && <p className="text-red-600 text-sm" role="alert" data-testid="account-auth-error">{error}</p>}
        <button disabled={busy} className="btn-dark w-full h-12 rounded-md font-medium flex items-center justify-center gap-2 disabled:opacity-60" data-testid={reg ? "register-submit-button" : "visitor-login-submit-button"}>
          {busy && <Loader2 className="w-4 h-4 animate-spin" />}{reg ? "Create account" : "Sign in"}
        </button>
      </form>
      <p className="text-sm text-[#55524D] mt-6">
        {reg ? "Already have an account? " : "New to Faridabad Estates? "}
        <Link to={`${reg ? "/login" : "/register"}?next=${encodeURIComponent(next)}`} className="text-[#111114] underline" data-testid={reg ? "register-login-link" : "login-register-link"}>{reg ? "Sign in" : "Create an account"}</Link>
      </p>
    </div>
  );
}
