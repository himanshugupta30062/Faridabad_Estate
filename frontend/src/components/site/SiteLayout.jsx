import { Link, Outlet, useLocation } from "react-router-dom";
import { useEffect } from "react";
import { X } from "lucide-react";
import { toast } from "sonner";
import { SiteHeader, Logo } from "./SiteHeader";
import { ChatWidget } from "./ChatWidget";
import { COMPANY, whatsappUrl } from "@/config/company";

export const openWhatsApp = (text) => {
  const url = whatsappUrl(text);
  if (!url) return toast.error("WhatsApp number not configured yet", { description: "Please call or use the enquiry form — the business will add its WhatsApp number soon." });
  window.open(url, "_blank", "noopener");
};

export const WhatsAppIcon = ({ className = "w-6 h-6" }) => (
  <svg viewBox="0 0 32 32" className={className} fill="currentColor" aria-hidden="true">
    <path d="M16.04 3C9.4 3 4 8.4 4 15.04c0 2.12.56 4.2 1.62 6.03L4 29l8.13-1.6a12 12 0 0 0 3.9.65h.01C22.68 28.05 28 22.65 28 16.01 28 8.4 22.68 3 16.04 3Zm0 22.98h-.01a9.95 9.95 0 0 1-5.07-1.39l-.36-.21-4.82.95.98-4.7-.24-.38a9.9 9.9 0 0 1-1.52-5.21c0-5.5 4.48-9.98 10.04-9.98 5.53 0 9.96 4.47 9.96 9.98 0 5.5-4.47 9.94-9.96 9.94Zm5.46-7.44c-.3-.15-1.77-.87-2.04-.97-.27-.1-.47-.15-.67.15-.2.3-.77.97-.94 1.17-.17.2-.35.22-.65.07-.3-.15-1.26-.46-2.4-1.48-.89-.79-1.49-1.77-1.66-2.07-.17-.3-.02-.46.13-.61.13-.13.3-.35.45-.52.15-.17.2-.3.3-.5.1-.2.05-.37-.03-.52-.07-.15-.67-1.62-.92-2.22-.24-.58-.49-.5-.67-.51h-.57c-.2 0-.52.07-.8.37-.27.3-1.04 1.02-1.04 2.49s1.07 2.89 1.22 3.09c.15.2 2.1 3.2 5.08 4.49.71.31 1.26.49 1.7.63.71.23 1.36.2 1.87.12.57-.09 1.77-.72 2.02-1.42.25-.7.25-1.3.17-1.42-.07-.12-.27-.2-.57-.35Z" />
  </svg>
);

const WhatsAppFab = () => {
  const onProperty = useLocation().pathname.startsWith("/property/");
  return (
  <button onClick={() => openWhatsApp(`Hi ${COMPANY.name}, I'm looking for a property in Faridabad. Please help me.`)} aria-label="Chat with us on WhatsApp"
    className={`group fixed bottom-[76px] sm:bottom-[88px] lg:bottom-[92px] right-4 sm:right-5 z-50 w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-[#25D366] text-white ${onProperty ? "hidden lg:flex" : "flex"} items-center justify-center shadow-[0_10px_25px_-8px_rgba(37,211,102,0.7)] hover:bg-[#1ebe5b] hover:scale-105 transition-[transform,background-color] duration-200`} data-testid="whatsapp-fab">
    <span className="absolute inset-0 rounded-full bg-[#25D366] opacity-40 animate-ping [animation-duration:2.5s]" aria-hidden="true" />
    <WhatsAppIcon className="relative w-6 h-6 sm:w-7 sm:h-7" />
    <span className="pointer-events-none absolute right-full mr-3 whitespace-nowrap rounded-full bg-[#111114] text-white text-xs px-3 py-1.5 opacity-0 translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-[opacity,transform] duration-200 hidden sm:block">Chat on WhatsApp</span>
  </button>
  );
};
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
