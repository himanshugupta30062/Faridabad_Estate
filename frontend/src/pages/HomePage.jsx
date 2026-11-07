import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Search, Sparkles, ArrowRight, Home, KeyRound, Tag, MessageSquareText, ListChecks, PhoneCall, Quote } from "lucide-react";
import { api, formatPrice, imageSrc, openChat, PROPERTY_TYPES } from "@/lib/api";
import { ListingCard } from "@/components/site/ListingCard";
import { EnquiryForm } from "@/components/site/EnquiryForm";
import { Seo } from "@/components/site/Seo";
import { COMPANY, TEAM, TESTIMONIALS } from "@/config/company";

const HERO = "https://images.unsplash.com/photo-1706808849780-7a04fbac83ef?crop=entropy&cs=srgb&fm=jpg&w=2200&q=75";
const BUDGETS = { buy: [["", "Any budget"], ["10000000", "Under ₹1 Cr"], ["15000000", "Under ₹1.5 Cr"], ["20000000", "Under ₹2 Cr"], ["35000000", "Under ₹3.5 Cr"]],
  rent: [["", "Any budget"], ["30000", "Under ₹30,000"], ["50000", "Under ₹50,000"], ["100000", "Under ₹1 lakh"]] };

const HeroSearch = () => {
  const nav = useNavigate();
  const [mode, setMode] = useState("buy");
  const [q, setQ] = useState("");
  const [type, setType] = useState("");
  const [max, setMax] = useState("");
  const go = (e) => {
    e.preventDefault();
    if (mode === "sell") return document.getElementById("sell")?.scrollIntoView({ behavior: "smooth" });
    const p = new URLSearchParams({ listing_type: mode });
    if (q.trim()) p.set("q", q.trim());
    if (type) p.set("property_type", type);
    if (max) p.set("max_price", max);
    nav(`/properties?${p}`);
  };
  const sel = "h-12 rounded-md bg-[#F4F1EA] px-3 text-sm text-[#111114] border-0 outline-none focus:ring-2 focus:ring-[#c9a54c]";
  return (
    <form onSubmit={go} className="bg-[#FAF9F6] rounded-xl p-3 sm:p-4 shadow-2xl max-w-4xl" data-testid="hero-search">
      <div className="flex gap-1 mb-3" role="tablist" aria-label="Search mode">
        {[["buy", "Buy"], ["rent", "Rent"], ["sell", "Sell"]].map(([k, l]) => (
          <button type="button" key={k} role="tab" aria-selected={mode === k} onClick={() => { setMode(k); setMax(""); }} data-testid={`hero-tab-${k}`}
            className={`px-5 h-9 rounded-full text-sm font-medium transition-colors ${mode === k ? "btn-dark" : "text-[#55524D] hover:bg-[#F0ECE3]"}`}>{l}</button>
        ))}
      </div>
      {mode === "sell" ? (
        <div className="flex flex-col sm:flex-row gap-3 sm:items-center justify-between p-2">
          <p className="text-sm text-[#2b2a27]">Thinking of selling? Share your property details and an UrbanNest advisor will call you.</p>
          <button className="btn-gold rounded-md h-12 px-6 font-medium shrink-0" data-testid="hero-sell-button">Start selling</button>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-[1.6fr_1fr_1fr_auto] gap-2">
          <label className="col-span-2 md:col-span-1 relative">
            <span className="sr-only">Locality, project or keyword</span>
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#8a8579]" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Locality, project or keyword" className={`${sel} w-full pl-9`} data-testid="hero-search-input" />
          </label>
          <select aria-label="Property type" value={type} onChange={(e) => setType(e.target.value)} className={sel} data-testid="hero-type-select">
            <option value="">Any type</option>{PROPERTY_TYPES.map((t) => <option key={t}>{t}</option>)}
          </select>
          <select aria-label="Budget" value={max} onChange={(e) => setMax(e.target.value)} className={sel} data-testid="hero-budget-select">
            {BUDGETS[mode].map(([v, l]) => <option key={l} value={v}>{l}</option>)}
          </select>
          <button className="col-span-2 md:col-span-1 btn-gold rounded-md h-12 px-6 font-medium flex items-center justify-center gap-2" data-testid="hero-search-button"><Search className="w-4 h-4" />Search</button>
        </div>
      )}
    </form>
  );
};

const Head = ({ eyebrow, title, action, dark }) => (
  <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-10">
    <div><p className={`eyebrow ${dark ? "!text-[#e3c77a]" : ""}`}>{eyebrow}</p><h2 className={`font-serif text-3xl sm:text-4xl mt-3 max-w-xl ${dark ? "text-white" : ""}`}>{title}</h2></div>
    {action}
  </div>
);

export default function HomePage() {
  const [props, setProps] = useState([]);
  const [hoods, setHoods] = useState([]);
  const [insights, setInsights] = useState([]);
  useEffect(() => {
    api.get("/properties").then((r) => setProps(r.data)).catch(() => {});
    api.get("/neighbourhoods").then((r) => setHoods(r.data)).catch(() => {});
    api.get("/insights").then((r) => setInsights(r.data)).catch(() => {});
  }, []);
  const count = (fn) => props.filter(fn).length;
  const collections = [
    { title: "Gated villas", q: "property_type=Villa&listing_type=buy", n: count((p) => p.property_type === "Villa"), img: props.find((p) => p.property_type === "Villa")?.image_url },
    { title: "Ready to move", q: "possession=Ready+to+move&listing_type=buy", n: count((p) => p.possession === "Ready to move" && p.listing_type === "buy"), img: props[1]?.images?.[1] },
    { title: "Rentals near the IT corridor", q: "listing_type=rent", n: count((p) => p.listing_type === "rent"), img: props.find((p) => p.listing_type === "rent")?.image_url },
    { title: "Homes under ₹1 crore", q: "listing_type=buy&max_price=10000000", n: count((p) => p.listing_type === "buy" && p.price <= 10000000), img: props[0]?.images?.[1] },
  ];

  return (
    <>
      <Seo title="PropMitra by UrbanNest Properties — Find a Home in Hyderabad" description="Discover apartments, villas and rentals across Hyderabad with PropMitra, the AI real estate advisor from UrbanNest Properties." />
      <section className="relative min-h-[88vh] flex items-end" data-testid="hero-section">
        <img src={HERO} alt="Contemporary home with a pool at dusk" className="absolute inset-0 w-full h-full object-cover" fetchpriority="high" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#111114]/90 via-[#111114]/40 to-[#111114]/10" />
        <div className="relative w-full max-w-7xl mx-auto px-4 sm:px-8 lg:px-12 pb-12 sm:pb-16 pt-32">
          <p className="eyebrow !text-[#e3c77a] fade-up">{COMPANY.name} · {COMPANY.city}</p>
          <h1 className="font-serif text-white text-4xl sm:text-5xl lg:text-6xl font-medium leading-[1.08] mt-4 max-w-3xl fade-up" style={{ animationDelay: "80ms" }}>Find a Place You'll Love to Call Home.</h1>
          <p className="text-white/80 text-base sm:text-lg mt-5 max-w-xl fade-up" style={{ animationDelay: "160ms" }}>Discover exceptional properties across Hyderabad with your personal AI real estate advisor.</p>
          <div className="flex flex-wrap gap-3 mt-8 fade-up" style={{ animationDelay: "220ms" }}>
            <Link to="/properties" className="btn-gold rounded-full h-12 px-6 font-medium flex items-center gap-2" data-testid="hero-explore-button">Explore Properties <ArrowRight className="w-4 h-4" /></Link>
            <button onClick={() => openChat()} className="rounded-full h-12 px-6 font-medium flex items-center gap-2 bg-white/10 text-white border border-white/30 hover:bg-white/20 transition-colors" data-testid="hero-chat-button"><Sparkles className="w-4 h-4 text-[#e3c77a]" />Talk to Property Mitra</button>
          </div>
          <div className="mt-10 fade-up" style={{ animationDelay: "300ms" }}><HeroSearch /></div>
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-4 sm:px-8 lg:px-12 py-14 grid md:grid-cols-3 gap-px bg-[#E5E1D8] border-y border-[#E5E1D8] md:border md:rounded-lg overflow-hidden" data-testid="entry-points">
        {[
          { icon: Home, t: "Buy a home", d: `${count((p) => p.listing_type === "buy")} homes for sale, from apartments to villas.`, to: "/properties?listing_type=buy", id: "buy" },
          { icon: KeyRound, t: "Rent a home", d: `${count((p) => p.listing_type === "rent")} rentals close to Hyderabad's work hubs.`, to: "/properties?listing_type=rent", id: "rent" },
          { icon: Tag, t: "Sell your property", d: "Tell us about your home and get a call from an advisor.", to: "/#sell", id: "sell" },
        ].map(({ icon: Icon, t, d, to, id }) => (
          <Link key={t} to={to} className="group bg-[#FAF9F6] p-8 hover:bg-white transition-colors" data-testid={`entry-${id}`}>
            <Icon className="w-6 h-6 text-[#8a6d24]" /><p className="font-serif text-2xl mt-5">{t}</p><p className="text-sm text-[#55524D] mt-2">{d}</p>
            <span className="inline-flex items-center gap-1 text-sm font-medium mt-6 group-hover:gap-2 transition-all">Get started <ArrowRight className="w-4 h-4" /></span>
          </Link>
        ))}
      </section>

      <section className="max-w-7xl mx-auto px-4 sm:px-8 lg:px-12 py-12 sm:py-16" data-testid="featured-section">
        <Head eyebrow="Handpicked" title="Featured homes across West Hyderabad" action={<Link to="/properties" className="btn-line rounded-full px-5 h-10 text-sm flex items-center gap-2 self-start" data-testid="featured-view-all">View all properties <ArrowRight className="w-4 h-4" /></Link>} />
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">{props.slice(0, 6).map((p) => <ListingCard key={p.id} p={p} />)}</div>
      </section>

      <section id="neighbourhoods" className="bg-[#F4F1EA] py-16 sm:py-24 scroll-mt-16" data-testid="neighbourhoods-section">
        <div className="max-w-7xl mx-auto px-4 sm:px-8 lg:px-12">
          <Head eyebrow="Neighbourhoods" title="Popular places to live in Hyderabad" />
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
            {hoods.map((n, i) => (
              <Link key={n.slug} to={`/neighbourhoods/${n.slug}`} className={`group relative rounded-lg overflow-hidden bg-[#16161a] ${i === 0 ? "lg:col-span-2 lg:row-span-2 aspect-square lg:aspect-auto" : "aspect-[4/5]"}`} data-testid={`hood-card-${n.slug}`}>
                {n.image_url && <img src={imageSrc(n.image_url)} alt={n.name} loading="lazy" className="absolute inset-0 w-full h-full object-cover opacity-80 group-hover:scale-105 transition-transform duration-700" />}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />
                <div className="absolute bottom-0 p-4 sm:p-6 text-white">
                  <p className={`font-serif ${i === 0 ? "text-3xl" : "text-xl"}`}>{n.name}</p>
                  <p className="text-xs text-white/75 mt-1">{n.listings ? `${n.listings} listing${n.listings > 1 ? "s" : ""}${n.min_buy_price ? ` · from ${formatPrice(n.min_buy_price)}` : n.min_rent ? ` · from ${formatPrice(n.min_rent, "rent")}` : ""}` : "Enquire for options"}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-4 sm:px-8 lg:px-12 py-16 sm:py-24" data-testid="collections-section">
        <Head eyebrow="Collections" title="Curated ways to start your search" />
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {collections.map((c) => (
            <Link key={c.title} to={`/properties?${c.q}`} className="group" data-testid={`collection-${c.title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`}>
              <div className="aspect-[4/3] rounded-lg overflow-hidden bg-[#E8E4DC]">{c.img && <img src={imageSrc(c.img)} alt="" loading="lazy" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />}</div>
              <p className="font-medium mt-4">{c.title}</p><p className="text-sm text-[#55524D]">{c.n} {c.n === 1 ? "property" : "properties"}</p>
            </Link>
          ))}
        </div>
      </section>

      <section id="advisory" className="bg-[#111114] text-white py-16 sm:py-24 scroll-mt-16" data-testid="advisory-section">
        <div className="max-w-7xl mx-auto px-4 sm:px-8 lg:px-12 grid lg:grid-cols-[1fr_1.4fr] gap-12">
          <div>
            <p className="eyebrow !text-[#e3c77a]">How our advisory works</p>
            <h2 className="font-serif text-3xl sm:text-4xl mt-3">An AI advisor that listens, and a human who follows through.</h2>
            <p className="text-white/65 mt-5 max-w-md">Property Mitra only recommends homes that exist in our live listings. Your UrbanNest advisor takes it from there.</p>
            <button onClick={() => openChat()} className="btn-gold rounded-full h-12 px-6 font-medium mt-8 inline-flex items-center gap-2" data-testid="advisory-chat-button"><Sparkles className="w-4 h-4" />Talk to Property Mitra</button>
          </div>
          <ol className="grid sm:grid-cols-3 gap-6">
            {[[MessageSquareText, "Tell us what you need", "Share budget, locality and configuration in plain words, in any order."],
              [ListChecks, "See genuine matches", "Get listings from our database, with a clear reason why each one fits."],
              [PhoneCall, "Meet your advisor", "An UrbanNest advisor calls you to arrange visits and answer details."]].map(([Icon, t, d], i) => (
              <li key={t} className="border-t border-white/15 pt-6">
                <span className="font-serif text-[#e3c77a] text-sm">0{i + 1}</span>
                <Icon className="w-6 h-6 mt-4 text-white/80" /><p className="font-medium mt-4">{t}</p><p className="text-sm text-white/60 mt-2 leading-relaxed">{d}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-4 sm:px-8 lg:px-12 py-16 sm:py-24 grid lg:grid-cols-[1fr_1.3fr] gap-12" data-testid="why-section">
        <div>
          <p className="eyebrow">Why {COMPANY.name}</p>
          <h2 className="font-serif text-3xl sm:text-4xl mt-3">Local knowledge, honest information, personal follow-up.</h2>
          <ul className="mt-8 space-y-5 text-[#2b2a27]">
            {["Advice focused on West Hyderabad's key residential corridors.", "Listing details come only from our records — nothing invented.", "One advisor stays with you from first call to site visit."].map((t) => (
              <li key={t} className="flex gap-3"><span className="w-1.5 h-1.5 rounded-full bg-[#c9a54c] mt-2.5 shrink-0" />{t}</li>
            ))}
          </ul>
        </div>
        <div>
          <div className="grid grid-cols-3 gap-4" data-testid="team-section">
            {TEAM.map((m, i) => (
              <figure key={i}>
                <img src={m.img} alt="Placeholder advisor portrait" loading="lazy" className="aspect-[3/4] w-full object-cover rounded-lg" />
                <figcaption className="mt-3"><p className="text-sm font-medium">{m.name}</p><p className="text-xs text-[#55524D]">{m.role}</p></figcaption>
              </figure>
            ))}
          </div>
          <p className="text-xs text-[#8a8579] mt-4">Team profiles are placeholders — replace with genuine UrbanNest advisors.</p>
        </div>
      </section>

      <section className="bg-[#F4F1EA] py-16 sm:py-24" data-testid="insights-section">
        <div className="max-w-7xl mx-auto px-4 sm:px-8 lg:px-12">
          <Head eyebrow="Local market insights" title="What our current listings show" />
          <div className="overflow-x-auto bg-white border border-[#E5E1D8] rounded-lg">
            <table className="w-full text-sm min-w-[640px]">
              <thead><tr className="text-left text-[11px] uppercase tracking-[0.15em] text-[#8a8579]">{["Locality", "Listings", "Avg. price / sq.ft (sale)", "Lowest sale price", "Lowest rent", "Types"].map((h) => <th key={h} className="px-5 py-4 font-medium">{h}</th>)}</tr></thead>
              <tbody>{insights.map((r) => (
                <tr key={r.location} className="border-t border-[#EFEBE3]">
                  <td className="px-5 py-4 font-medium">{r.location}</td><td className="px-5 py-4">{r.listings}</td>
                  <td className="px-5 py-4">{r.avg_price_per_sqft ? `₹${r.avg_price_per_sqft.toLocaleString("en-IN")}` : "—"}</td>
                  <td className="px-5 py-4">{r.min_buy_price ? formatPrice(r.min_buy_price) : "—"}</td>
                  <td className="px-5 py-4">{r.min_rent ? formatPrice(r.min_rent, "rent") : "—"}</td><td className="px-5 py-4 text-[#55524D]">{r.types.join(", ")}</td>
                </tr>))}</tbody>
            </table>
          </div>
          <p className="text-xs text-[#8a8579] mt-3">Calculated live from active UrbanNest listings (currently demo data). Not an official market index.</p>
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-4 sm:px-8 lg:px-12 py-16 sm:py-24" data-testid="testimonials-section">
        <Head eyebrow="Client stories" title="What clients tell us" action={<span className="text-xs uppercase tracking-widest text-[#8a6d24] border border-[#c9a54c]/50 rounded-full px-3 py-1 self-start">Demo testimonials</span>} />
        <div className="grid md:grid-cols-3 gap-6">
          {TESTIMONIALS.map((t, i) => (
            <figure key={i} className="border-t-2 border-[#111114] pt-6">
              <Quote className="w-6 h-6 text-[#c9a54c]" /><blockquote className="font-serif text-xl leading-snug mt-4">“{t.text}”</blockquote>
              <figcaption className="text-sm text-[#55524D] mt-5">{t.name} · {t.role}</figcaption>
            </figure>
          ))}
        </div>
      </section>

      <section id="sell" className="bg-[#111114] scroll-mt-16" data-testid="enquiry-cta-section">
        <div className="max-w-7xl mx-auto px-4 sm:px-8 lg:px-12 py-16 sm:py-24 grid lg:grid-cols-2 gap-12">
          <div className="text-white">
            <p className="eyebrow !text-[#e3c77a]">Speak with an advisor</p>
            <h2 className="font-serif text-3xl sm:text-5xl mt-3 leading-tight">Buying, renting or selling? Let's talk.</h2>
            <p className="text-white/65 mt-5 max-w-md">Share a few details and an UrbanNest advisor will call you back — usually within one working day.</p>
            <div className="mt-8 space-y-2 text-sm text-white/80">
              <p><a href={`tel:${COMPANY.phoneHref}`} className="hover:text-white">{COMPANY.phoneDisplay}</a> · <a href={`https://wa.me/${COMPANY.whatsapp}`} target="_blank" rel="noreferrer" className="hover:text-white" data-testid="cta-whatsapp-link">WhatsApp</a></p>
              <p>{COMPANY.hours}</p>
            </div>
          </div>
          <div className="bg-[#1b1b20] border border-white/10 rounded-xl p-6 sm:p-8"><EnquiryForm dark types={["callback", "sell", "visit"]} /></div>
        </div>
      </section>
    </>
  );
}
