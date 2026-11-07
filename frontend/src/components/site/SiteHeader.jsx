import { useState } from "react";
import { Link, NavLink, useLocation } from "react-router-dom";
import { Menu, Sparkles, Heart, GitCompare, User } from "lucide-react";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { openChat } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { useLocalList, KEYS } from "@/lib/local";
import { COMPANY } from "@/config/company";

const NAV = [
  { to: "/properties?listing_type=buy", label: "Buy" },
  { to: "/properties?listing_type=rent", label: "Rent" },
  { to: "/#sell", label: "Sell" },
  { to: "/#neighbourhoods", label: "Neighbourhoods" },
  { to: "/#advisory", label: "How it works" },
];

export const Logo = ({ light = false }) => (
  <Link to="/" className="flex items-center gap-2.5" data-testid="site-logo" aria-label="Faridabad Estates — home">
    <span className={`w-9 h-9 rounded-sm flex items-center justify-center font-serif text-lg ${light ? "bg-[#FAF9F6] text-[#111114]" : "bg-[#16161a] text-[#e3c77a]"}`}>F</span>
    <span className="leading-tight">
      <span className={`block font-serif text-lg ${light ? "text-white" : "text-[#111114]"}`}>{COMPANY.name}</span>
      <span className={`block text-[9px] uppercase tracking-[0.2em] ${light ? "text-white/60" : "text-[#8a8579]"}`}>{COMPANY.tagline}</span>
    </span>
  </Link>
);

export const SiteHeader = () => {
  const [open, setOpen] = useState(false);
  const { user, logout } = useAuth();
  const compare = useLocalList(KEYS.compare);
  const { pathname } = useLocation();
  const loginTo = `/login?next=${encodeURIComponent(pathname === "/login" || pathname === "/register" ? "/" : pathname)}`;
  const link = "text-sm text-[#2b2a27] hover:text-[#8a6d24] transition-colors";
  return (
    <header className="sticky top-0 z-40 bg-[#FAF9F6]/95 backdrop-blur border-b border-[#E5E1D8]" data-testid="site-header">
      <div className="max-w-7xl mx-auto px-4 sm:px-8 lg:px-12 h-16 flex items-center justify-between gap-6">
        <Logo />
        <nav className="hidden lg:flex items-center gap-7" aria-label="Main">
          {NAV.map((n) => <Link key={n.label} to={n.to} className={link} data-testid={`nav-${n.label.toLowerCase().replace(/\s/g, "-")}`}>{n.label}</Link>)}
        </nav>
        <div className="flex items-center gap-1 sm:gap-2">
          <NavLink to="/compare" className="relative w-10 h-10 flex items-center justify-center rounded-full hover:bg-[#F0ECE3]" aria-label="Compare properties" data-testid="nav-compare">
            <GitCompare className="w-[18px] h-[18px]" />
            {compare.length > 0 && <span className="absolute top-1 right-1 min-w-4 h-4 px-1 rounded-full bg-[#c9a54c] text-[10px] font-semibold flex items-center justify-center">{compare.length}</span>}
          </NavLink>
          <NavLink to="/saved" className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-[#F0ECE3]" aria-label="Saved properties" data-testid="nav-saved"><Heart className="w-[18px] h-[18px]" /></NavLink>
          {user ? (
            <button onClick={logout} className="hidden sm:flex items-center gap-1.5 text-sm px-3 h-10 rounded-full hover:bg-[#F0ECE3]" data-testid="nav-logout"><User className="w-4 h-4" />{user.name?.split(" ")[0] || "Account"} · Sign out</button>
          ) : (
            <Link to={loginTo} className="hidden sm:flex items-center gap-1.5 text-sm px-3 h-10 rounded-full hover:bg-[#F0ECE3]" data-testid="nav-login"><User className="w-4 h-4" />Sign in</Link>
          )}
          <button onClick={() => openChat()} className="hidden md:flex btn-dark rounded-full px-4 h-10 text-sm items-center gap-2" data-testid="nav-ask-ai-button"><Sparkles className="w-4 h-4 text-[#e3c77a]" />Ask Estate Mitra</button>
          <button className="lg:hidden w-10 h-10 flex items-center justify-center" onClick={() => setOpen(true)} aria-label="Open menu" data-testid="nav-mobile-toggle"><Menu /></button>
        </div>
      </div>
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="right" className="bg-[#FAF9F6] w-[300px]" data-testid="nav-mobile-menu">
          <SheetTitle className="font-serif text-xl">Menu</SheetTitle>
          <nav className="flex flex-col gap-1 mt-6" aria-label="Mobile">
            {[...NAV, { to: "/properties", label: "All properties" }, { to: "/saved", label: "Saved" }, { to: "/compare", label: "Compare" }].map((n) => (
              <Link key={n.label} to={n.to} onClick={() => setOpen(false)} className="py-3 border-b border-[#E5E1D8] text-[#111114]">{n.label}</Link>
            ))}
            {user ? <button onClick={() => { logout(); setOpen(false); }} className="py-3 text-left">Sign out</button>
              : <Link to={loginTo} onClick={() => setOpen(false)} className="py-3">Sign in / Create account</Link>}
            <button onClick={() => { setOpen(false); openChat(); }} className="btn-dark rounded-full h-11 mt-4 flex items-center justify-center gap-2"><Sparkles className="w-4 h-4" />Ask Estate Mitra</button>
          </nav>
        </SheetContent>
      </Sheet>
    </header>
  );
};
