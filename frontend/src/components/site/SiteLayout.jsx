import { Link, Outlet, useLocation } from "react-router-dom";
import { useEffect } from "react";
import { X, MessageCircle } from "lucide-react";
import { toast } from "sonner";
import { SiteHeader, Logo } from "./SiteHeader";
import { ChatWidget } from "./ChatWidget";
import { COMPANY, whatsappUrl } from "@/config/company";

export const openWhatsApp = (text) => {
  const url = whatsappUrl(text);
  if (!url) return toast.error("WhatsApp number not configured yet", { description: "Please call or use the enquiry form — the business will add its WhatsApp number soon." });
  window.open(url, "_blank", "noopener");
};

const WhatsAppFab = () => (
  <button onClick={() => openWhatsApp(`Hi ${COMPANY.name}, I'm looking for a property in Faridabad. Please help me.`)} aria-label="Chat on WhatsApp"
    className="fixed bottom-36 lg:bottom-24 right-4 sm:right-5 z-50 w-12 h-12 rounded-full bg-[#1f7a4d] text-white flex items-center justify-center shadow-xl hover:bg-[#186640] transition-colors" data-testid="whatsapp-fab">
    <MessageCircle className="w-5 h-5" />
  </button>
);
import { useLocalList, KEYS, clearCompare } from "@/lib/local";

const NEIGH = [["sector-10", "Sector 10"], ["sectors-14-17", "Sectors 14–17"], ["sectors-21c-21d", "Sectors 21C & 21D"], ["sainik-colony", "Sainik Colony"], ["charmwood-village", "Charmwood Village"], ["greater-faridabad", "Greater Faridabad"]];

const SiteFooter = () => (
  <footer className="bg-[#111114] text-white/70" data-testid="site-footer">
    <div className="max-w-7xl mx-auto px-4 sm:px-8 lg:px-12 py-14 grid gap-10 md:grid-cols-[1.4fr_1fr_1fr_1.2fr]">
      <div>
        <Logo light />
        <p className="text-sm mt-5 max-w-xs leading-relaxed">AI-assisted property advisory for buyers, tenants and sellers across Faridabad.</p>
        <p className="text-xs mt-5 text-white/40">{COMPANY.rera}<br />{COMPANY.registration}</p>
      </div>
      <div>
        <p className="eyebrow !text-[#e3c77a]">Explore</p>
        <ul className="mt-4 space-y-2 text-sm">
          <li><Link to="/properties?listing_type=buy" className="hover:text-white">Homes for sale</Link></li>
          <li><Link to="/properties?listing_type=rent" className="hover:text-white">Homes for rent</Link></li>
          <li><Link to="/#sell" className="hover:text-white">Sell with Faridabad Estates</Link></li>
          <li><Link to="/compare" className="hover:text-white">Compare</Link></li>
          <li><Link to="/saved" className="hover:text-white">Saved homes</Link></li>
        </ul>
      </div>
      <div>
        <p className="eyebrow !text-[#e3c77a]">Neighbourhoods</p>
        <ul className="mt-4 space-y-2 text-sm">{NEIGH.map(([s, n]) => <li key={s}><Link to={`/neighbourhoods/${s}`} className="hover:text-white">{n}</Link></li>)}</ul>
      </div>
      <div>
        <p className="eyebrow !text-[#e3c77a]">Contact</p>
        <ul className="mt-4 space-y-2 text-sm">
          <li><a href={`tel:${COMPANY.phoneHref}`} className="hover:text-white" data-testid="footer-phone">{COMPANY.phoneDisplay}</a></li>
          <li><a href={`mailto:${COMPANY.email}`} className="hover:text-white" data-testid="footer-email">{COMPANY.email}</a></li>
          <li>{COMPANY.address}</li>
          <li>{COMPANY.hours}</li>
        </ul>
      </div>
    </div>
    <div className="border-t border-white/10">
      <div className="max-w-7xl mx-auto px-4 sm:px-8 lg:px-12 py-6 text-xs text-white/40 flex flex-col md:flex-row gap-2 justify-between">
        <p>© {new Date().getFullYear()} {COMPANY.name}. Listings marked “Sample” are illustrative demo data — not verified, not actual inventory and not available for transactions.</p>
        <p>{COMPANY.placeholderNote} <Link to="/admin" className="underline hover:text-white">Admin</Link></p>
      </div>
    </div>
  </footer>
);

const CompareTray = () => {
  const list = useLocalList(KEYS.compare);
  const { pathname } = useLocation();
  if (!list.length || pathname === "/compare") return null;
  return (
    <div className="fixed bottom-4 left-4 z-40 bg-[#111114] text-white rounded-full pl-5 pr-2 h-12 flex items-center gap-3 shadow-xl" data-testid="compare-tray">
      <span className="text-sm">{list.length} selected</span>
      <Link to="/compare" className="btn-gold rounded-full px-4 h-8 text-sm flex items-center" data-testid="compare-tray-open">Compare</Link>
      <button onClick={clearCompare} aria-label="Clear compare" className="w-8 h-8 flex items-center justify-center text-white/60 hover:text-white"><X className="w-4 h-4" /></button>
    </div>
  );
};

export default function SiteLayout() {
  const { pathname, hash } = useLocation();
  useEffect(() => {
    if (hash) setTimeout(() => document.getElementById(hash.slice(1))?.scrollIntoView({ behavior: "smooth" }), 80);
    else window.scrollTo(0, 0);
  }, [pathname, hash]);
  return (
    <div className="min-h-screen bg-[#FAF9F6] text-[#111114] flex flex-col overflow-x-clip">
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 bg-white px-3 py-2 rounded">Skip to content</a>
      <SiteHeader />
      <main id="main" className="flex-1"><Outlet /></main>
      <SiteFooter />
      <CompareTray />
      <WhatsAppFab />
      <ChatWidget />
    </div>
  );
}
