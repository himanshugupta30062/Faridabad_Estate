import { useCallback, useEffect, useState } from "react";
import { Sparkles } from "lucide-react";
import { api, formatApiError, openChat } from "@/lib/api";
import { Navbar } from "@/components/site/Navbar";
import { SearchFilters } from "@/components/site/SearchFilters";
import { PropertyCard } from "@/components/site/PropertyCard";
import { PropertyDialog } from "@/components/site/PropertyDialog";
import { About } from "@/components/site/About";
import { Testimonials } from "@/components/site/Testimonials";
import { Contact } from "@/components/site/Contact";
import { ChatWidget } from "@/components/site/ChatWidget";

const HERO = "https://images.unsplash.com/photo-1783696147892-eec669309ca2?crop=entropy&cs=srgb&fm=jpg&w=2000&q=80";
const EMPTY = { listing_type: "buy", location: "", budget: "", property_type: "", bedrooms: "" };

function toParams(f) {
  const p = { listing_type: f.listing_type };
  if (f.location) p.location = f.location;
  if (f.property_type) p.property_type = f.property_type;
  if (f.bedrooms) p.bedrooms = f.bedrooms;
  if (f.budget) {
    const [lo, hi] = f.budget.split("-");
    if (lo) p.min_price = lo;
    if (hi) p.max_price = hi;
  }
  return p;
}

export default function Home() {
  const [filters, setFilters] = useState(EMPTY);
  const [applied, setApplied] = useState(null);
  const [props, setProps] = useState([]);
  const [locations, setLocations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selected, setSelected] = useState(null);
  const [enquireFor, setEnquireFor] = useState(null);

  const load = useCallback(async (f) => {
    setLoading(true);
    setError("");
    try {
      const { data } = await api.get("/properties", { params: f ? toParams(f) : {} });
      setProps(data);
    } catch (e) {
      setError(formatApiError(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load(null);
    api.get("/locations").then((r) => setLocations(r.data)).catch(() => {});
  }, [load]);

  const search = () => {
    setApplied(filters);
    load(filters);
    document.getElementById("listings")?.scrollIntoView({ behavior: "smooth" });
  };
  const reset = () => { setFilters(EMPTY); setApplied(null); load(null); };
  const enquire = (p) => { setEnquireFor(p); setTimeout(() => document.getElementById("contact")?.scrollIntoView({ behavior: "smooth" }), 100); };

  return (
    <div id="top" className="bg-[#0F0F12] min-h-screen text-white">
      <Navbar />
      <section className="relative grain overflow-hidden" data-testid="hero-section">
        <img src={HERO} alt="" className="absolute inset-0 w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-b from-[#0F0F12]/80 via-[#0F0F12]/60 to-[#0F0F12]" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-12 pt-20 sm:pt-28 pb-16">
          <p className="text-xs uppercase tracking-[0.3em] text-[#D4AF37] fade-up">UrbanNest Properties · Hyderabad</p>
          <h1 className="font-serif text-4xl sm:text-5xl lg:text-6xl font-semibold mt-5 max-w-3xl leading-[1.1] fade-up" style={{ animationDelay: "80ms" }}>
            Find the right home in Hyderabad, <span className="gold-text italic">guided by AI.</span>
          </h1>
          <p className="text-zinc-300 text-base sm:text-lg mt-6 max-w-xl fade-up" style={{ animationDelay: "160ms" }}>
            Search curated listings across Gachibowli, Kokapet, Financial District, Tellapur and beyond — or let Property Mitra shortlist for you.
          </p>
          <button onClick={() => openChat()} className="mt-8 inline-flex items-center gap-2 text-sm text-[#F3E5AB] border-b border-[#D4AF37]/50 pb-1 hover:text-white fade-up" style={{ animationDelay: "240ms" }} data-testid="hero-chat-button">
            <Sparkles className="w-4 h-4" /> Talk to Property Mitra
          </button>
          <div className="mt-12 sm:mt-16 fade-up" style={{ animationDelay: "320ms" }}>
            <SearchFilters filters={filters} setFilters={setFilters} locations={locations} onSearch={search} onReset={reset} />
          </div>
        </div>
      </section>

      <section id="listings" className="py-16 sm:py-24" data-testid="listings-section">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-12">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-10">
            <div>
              <p className="text-xs uppercase tracking-[0.25em] text-[#D4AF37]">{applied ? "Search results" : "Featured listings"}</p>
              <h2 className="font-serif text-3xl sm:text-4xl mt-3">{applied ? `Homes to ${applied.listing_type}` : "Handpicked homes"}</h2>
            </div>
            <p className="text-sm text-zinc-500" data-testid="listings-count">{loading ? "Loading…" : `${props.length} ${props.length === 1 ? "property" : "properties"}`}</p>
          </div>
          {error && <p className="text-red-400" data-testid="listings-error">{error}</p>}
          {!loading && !error && props.length === 0 && (
            <div className="border border-dashed border-white/15 rounded-md p-10 text-center" data-testid="listings-empty">
              <p className="font-serif text-xl">No listings match these filters.</p>
              <p className="text-zinc-400 text-sm mt-2">Tell Property Mitra your requirement and an advisor will call you back.</p>
              <button onClick={() => openChat()} className="btn-gold rounded-full px-6 py-2.5 text-sm font-medium mt-6" data-testid="listings-empty-chat">Share my requirement</button>
            </div>
          )}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8" data-testid="listings-grid">
            {props.map((p, i) => <PropertyCard key={p.id} p={p} index={i} onOpen={setSelected} />)}
          </div>
        </div>
      </section>

      <About />
      <Testimonials />
      <Contact property={enquireFor} clearProperty={() => setEnquireFor(null)} />
      <footer className="border-t border-white/10 py-8 text-center text-xs text-zinc-500 px-4" data-testid="site-footer">
        © {new Date().getFullYear()} UrbanNest Properties, Hyderabad · PropMitra AI advisor. Listings marked “Sample” are for demonstration only.
      </footer>
      <PropertyDialog p={selected} onClose={() => setSelected(null)} onEnquire={enquire} />
      <ChatWidget />
    </div>
  );
}
