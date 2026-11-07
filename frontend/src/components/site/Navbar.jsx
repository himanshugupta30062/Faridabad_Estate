import { useState } from "react";
import { Link } from "react-router-dom";
import { Menu, X, Sparkles } from "lucide-react";
import { openChat } from "@/lib/api";

const LINKS = [
  { href: "#listings", label: "Properties" },
  { href: "#about", label: "About" },
  { href: "#testimonials", label: "Testimonials" },
  { href: "#contact", label: "Contact" },
];

export const Navbar = () => {
  const [open, setOpen] = useState(false);
  return (
    <header className="sticky top-0 z-50 backdrop-blur-md bg-[#0F0F12]/85 border-b border-white/10" data-testid="site-navbar">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-12 h-16 flex items-center justify-between">
        <a href="#top" className="flex items-center gap-3" data-testid="nav-logo">
          <span className="w-9 h-9 rounded-sm border border-[#D4AF37]/60 flex items-center justify-center font-serif text-[#D4AF37] text-lg">U</span>
          <span className="leading-tight">
            <span className="block font-serif text-white text-lg">PropMitra</span>
            <span className="block text-[10px] uppercase tracking-[0.25em] text-zinc-500">UrbanNest Properties</span>
          </span>
        </a>
        <nav className="hidden md:flex items-center gap-8">
          {LINKS.map((l) => (
            <a key={l.href} href={l.href} className="text-sm text-zinc-300 hover:text-[#D4AF37] transition-colors" data-testid={`nav-link-${l.label.toLowerCase()}`}>
              {l.label}
            </a>
          ))}
          <Link to="/admin" className="text-sm text-zinc-500 hover:text-white transition-colors" data-testid="nav-admin-link">Admin</Link>
          <button onClick={() => openChat()} className="btn-gold rounded-full px-5 py-2 text-sm font-medium flex items-center gap-2" data-testid="nav-ask-ai-button">
            <Sparkles className="w-4 h-4" /> Ask Property Mitra
          </button>
        </nav>
        <button className="md:hidden text-white" onClick={() => setOpen(!open)} data-testid="nav-mobile-toggle" aria-label="Menu">
          {open ? <X /> : <Menu />}
        </button>
      </div>
      {open && (
        <div className="md:hidden border-t border-white/10 px-4 py-4 space-y-3 bg-[#0F0F12]" data-testid="nav-mobile-menu">
          {LINKS.map((l) => (
            <a key={l.href} href={l.href} onClick={() => setOpen(false)} className="block text-zinc-300 py-1">{l.label}</a>
          ))}
          <Link to="/admin" className="block text-zinc-500 py-1">Admin</Link>
        </div>
      )}
    </header>
  );
};
