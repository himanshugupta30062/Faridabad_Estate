import { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { BedDouble, Bath, Maximize, MapPin, CalendarClock, Sofa, Images, ChevronLeft, ChevronRight, X, MessageCircle, Sparkles, Phone, Info } from "lucide-react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { api, formatApiError, formatPrice, imageSrc, openChat, configLabel } from "@/lib/api";
import { pushRecent } from "@/lib/local";
import { COMPANY, AGENT } from "@/config/company";
import { openWhatsApp } from "@/components/site/SiteLayout";
import { FavButton, CompareButton, ShareButton } from "@/components/site/PropertyActions";
import { ListingCard, DemoBadge } from "@/components/site/ListingCard";
import { PropertyMap } from "@/components/site/PropertyMap";
import { EnquiryForm } from "@/components/site/EnquiryForm";
import { Seo } from "@/components/site/Seo";

const Lightbox = ({ imgs, index, setIndex, title }) => {
  const move = useCallback((d) => setIndex((i) => (i + d + imgs.length) % imgs.length), [imgs.length, setIndex]);
  useEffect(() => {
    if (index === null) return;
    const h = (e) => { if (e.key === "ArrowRight") move(1); if (e.key === "ArrowLeft") move(-1); };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [index, move]);
  return (
    <Dialog open={index !== null} onOpenChange={(o) => !o && setIndex(null)}>
      <DialogContent className="max-w-none w-screen h-[100dvh] p-0 bg-black border-0 rounded-none flex items-center justify-center [&>button]:hidden" data-testid="gallery-lightbox">
        <DialogTitle className="sr-only">{title} photos</DialogTitle>
        {index !== null && <img src={imageSrc(imgs[index])} alt={`${title} photo ${index + 1}`} className="max-w-full max-h-full object-contain" />}
        <button onClick={() => setIndex(null)} aria-label="Close gallery" className="absolute top-4 right-4 w-11 h-11 rounded-full bg-white/10 text-white flex items-center justify-center" data-testid="lightbox-close"><X /></button>
        <button onClick={() => move(-1)} aria-label="Previous photo" className="absolute left-4 w-11 h-11 rounded-full bg-white/10 text-white flex items-center justify-center" data-testid="lightbox-prev"><ChevronLeft /></button>
        <button onClick={() => move(1)} aria-label="Next photo" className="absolute right-4 w-11 h-11 rounded-full bg-white/10 text-white flex items-center justify-center" data-testid="lightbox-next"><ChevronRight /></button>
        <p className="absolute bottom-5 text-white/70 text-sm">{(index ?? 0) + 1} / {imgs.length}</p>
      </DialogContent>
    </Dialog>
  );
};

const Spec = ({ icon: Icon, label, value }) => (
  <div className="py-4 border-b border-[#E5E1D8]">
    <Icon className="w-5 h-5 text-[#8a6d24]" /><p className="text-[11px] uppercase tracking-[0.14em] text-[#8a8579] mt-3">{label}</p><p className="font-medium mt-0.5">{value}</p>
  </div>
);

export default function PropertyPage() {
  const { slug } = useParams();
  const [p, setP] = useState(null);
  const [error, setError] = useState("");
  const [similar, setSimilar] = useState([]);
  const [lb, setLb] = useState(null);

  useEffect(() => {
    setP(null); setError("");
    api.get(`/properties/${slug}`, { params: { track: true } }).then((r) => {
      setP(r.data); pushRecent(r.data.id);
      api.get(`/properties/${r.data.id}/similar`).then((s) => setSimilar(s.data)).catch(() => {});
    }).catch((e) => setError(formatApiError(e)));
  }, [slug]);

  if (error) return (
    <div className="max-w-xl mx-auto px-4 py-24 text-center" data-testid="property-error">
      <p className="font-serif text-3xl">Property unavailable</p><p className="text-[#55524D] mt-3">{error}</p>
      <Link to="/properties" className="btn-dark rounded-full h-11 px-6 inline-flex items-center mt-8">Browse all properties</Link>
    </div>
  );
  if (!p) return <div className="max-w-7xl mx-auto px-4 sm:px-8 lg:px-12 py-10" data-testid="property-loading"><div className="h-[55vh] rounded-xl bg-[#EFEBE3] animate-pulse" /><div className="h-8 w-1/3 bg-[#EFEBE3] rounded mt-8 animate-pulse" /></div>;

  const imgs = p.images?.length ? p.images : [p.image_url];
  const price = formatPrice(p.price, p.listing_type);
  const url = `${window.location.origin}/property/${p.slug}`;
  const waText = `Hi Faridabad Estates, I'm interested in ${p.title} (${price}, ${p.location}). Ref: ${p.id.slice(0, 8)} ${url}`;
  const wa = (e) => { e.preventDefault(); openWhatsApp(waText); };
  const jsonLd = { "@context": "https://schema.org", "@type": "RealEstateListing", name: p.title, description: p.description, url, image: imgs.slice(0, 4).map(imageSrc),
    offers: { "@type": "Offer", price: p.price, priceCurrency: "INR" }, address: { "@type": "PostalAddress", addressLocality: `${p.location}, Faridabad`, addressRegion: "Haryana", addressCountry: "IN" } };
  const toForm = () => document.getElementById("enquire")?.scrollIntoView({ behavior: "smooth" });

  return (
    <article className="pb-24 lg:pb-0" data-testid="property-page">
      <Seo title={`${p.title}, ${p.location} — ${price} | Faridabad Estates`} description={`SAMPLE ${p.property_type === "Plot" ? "" : configLabel(p) + " "}${p.property_type.toLowerCase()} ${p.listing_type === "rent" ? "for rent" : "for sale"} in ${p.location}, Faridabad. ${p.area_sqft} sq.ft. ${p.description.slice(0, 110)}`} jsonLd={jsonLd} />
      <div className="max-w-7xl mx-auto px-4 sm:px-8 lg:px-12 pt-6">
        <nav aria-label="Breadcrumb" className="text-xs text-[#8a8579]"><Link to="/" className="hover:underline">Home</Link> / <Link to={`/properties?listing_type=${p.listing_type}`} className="hover:underline">{p.listing_type === "rent" ? "Rent" : "Buy"}</Link> / {p.location}</nav>
        <div className="grid grid-cols-4 grid-rows-2 gap-2 mt-4 h-[42vh] sm:h-[58vh] rounded-xl overflow-hidden" data-testid="property-gallery">
          {imgs.slice(0, 3).map((src, i) => (
            <button key={i} onClick={() => setLb(i)} aria-label={`Open photo ${i + 1}`} className={`relative overflow-hidden bg-[#E8E4DC] ${i === 0 ? "col-span-4 sm:col-span-3 row-span-2" : "hidden sm:block"}`} data-testid={`gallery-image-${i}`}>
              <img src={imageSrc(src)} alt={`${p.title} photo ${i + 1}`} loading={i ? "lazy" : "eager"} className="w-full h-full object-cover hover:scale-[1.02] transition-transform duration-700" />
            </button>
          ))}
        </div>
        <div className="flex justify-between items-center mt-3">
          <div className="flex gap-2 items-center">{p.is_sample && <DemoBadge className="!bg-[#F4F1EA]" />}<span className="text-xs text-[#8a8579]">Ref {p.id.slice(0, 8).toUpperCase()}</span></div>
          <button onClick={() => setLb(0)} className="btn-line rounded-full h-9 px-4 text-sm flex items-center gap-2" data-testid="gallery-view-all"><Images className="w-4 h-4" />All {imgs.length} photos</button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-8 lg:px-12 mt-8 grid lg:grid-cols-[1fr_380px] gap-12">
        <div>
          <p className="eyebrow">{p.listing_type === "rent" ? "For rent" : "For sale"} · {p.property_type}</p>
          <h1 className="font-serif text-3xl sm:text-5xl mt-3" data-testid="property-title">{p.title}</h1>
          <p className="flex items-center gap-1.5 text-[#55524D] mt-3"><MapPin className="w-4 h-4" />{p.location}, Faridabad</p>
          <p className="font-serif text-4xl mt-6" data-testid="property-price">{price}</p>
          {p.listing_type === "buy" && p.property_type !== "Plot" && <p className="text-sm text-[#8a8579] mt-1">₹{Math.round(p.price / p.area_sqft).toLocaleString("en-IN")} per sq.ft</p>}
          <div className="flex flex-wrap gap-2 mt-6">
            <FavButton id={p.id} label className="btn-line h-10 px-4" />
            <ShareButton p={p} label className="btn-line h-10 px-4" />
            <CompareButton id={p.id} label className="btn-line h-10 px-4" />
          </div>
          {p.is_sample && <p className="mt-6 flex gap-2 text-sm bg-[#F4F1EA] border border-[#E5E1D8] rounded-lg p-4 text-[#55524D]" data-testid="demo-notice"><Info className="w-4 h-4 mt-0.5 shrink-0" />SAMPLE listing with illustrative details and price. It is not verified, not actual inventory and not available for any transaction.</p>}

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-8 mt-8">
            <Spec icon={BedDouble} label="Configuration" value={configLabel(p)} />
            {p.bathrooms > 0 && <Spec icon={Bath} label="Bathrooms" value={p.bathrooms} />}
            <Spec icon={Maximize} label="Area" value={`${p.area_sqft.toLocaleString("en-IN")} sq.ft`} />
            {p.furnishing && <Spec icon={Sofa} label="Furnishing" value={p.furnishing} />}
            {p.possession && <Spec icon={CalendarClock} label="Possession" value={p.possession} />}
          </div>

          <section className="mt-10"><h2 className="font-serif text-2xl">About this home</h2><p className="text-[#2b2a27] leading-relaxed mt-4 whitespace-pre-line">{p.description}</p></section>
          {p.highlights?.length > 0 && (
            <section className="mt-10" data-testid="property-highlights"><h2 className="font-serif text-2xl">Highlights</h2>
              <ul className="mt-4 grid sm:grid-cols-2 gap-3">{p.highlights.map((h) => <li key={h} className="flex gap-3 text-[#2b2a27]"><span className="w-1.5 h-1.5 rounded-full bg-[#c9a54c] mt-2.5 shrink-0" />{h}</li>)}</ul>
            </section>
          )}
          {p.latitude != null && (
            <section className="mt-10"><h2 className="font-serif text-2xl">Location</h2>
              <p className="text-sm text-[#8a8579] mt-1">Pin shows the approximate locality, not the exact address.</p>
              <div className="h-72 rounded-xl overflow-hidden border border-[#E5E1D8] mt-4"><PropertyMap items={[p]} activeId={p.id} single className="w-full h-full" /></div>
            </section>
          )}
          <button onClick={() => openChat(`Tell me more about ${p.title} in ${p.location} (ref ${p.id}).`)} className="mt-10 w-full text-left bg-[#111114] text-white rounded-xl p-6 flex items-center gap-4 hover:bg-[#1f1f24] transition-colors" data-testid="property-ask-ai">
            <Sparkles className="w-6 h-6 text-[#e3c77a] shrink-0" /><span><span className="block font-medium">Questions about this home?</span><span className="text-sm text-white/60">Ask Estate Mitra — answers come only from this listing's details.</span></span>
          </button>
        </div>

        <aside id="enquire" className="lg:sticky lg:top-24 self-start space-y-4 scroll-mt-24">
          <div className="bg-white border border-[#E5E1D8] rounded-xl p-6" data-testid="agent-card">
            <div className="flex items-center gap-3">
              <img src={AGENT.img} alt="" className="w-12 h-12 rounded-full object-cover" />
              <div><p className="font-medium">{AGENT.name}</p><p className="text-xs text-[#55524D]">{AGENT.role}</p></div>
            </div>
            <div className="grid grid-cols-2 gap-2 mt-5">
              <a href="#whatsapp" onClick={wa} className="h-11 rounded-md bg-[#1f7a4d] text-white text-sm flex items-center justify-center gap-2 hover:bg-[#186640]" data-testid="property-whatsapp"><MessageCircle className="w-4 h-4" />WhatsApp</a>
              <a href={`tel:${COMPANY.phoneHref}`} className="btn-line h-11 rounded-md text-sm flex items-center justify-center gap-2" data-testid="property-call"><Phone className="w-4 h-4" />Call</a>
            </div>
            <div className="mt-6"><EnquiryForm property={p} compact types={["visit", "tour", "callback"]} /></div>
          </div>
        </aside>
      </div>

      {similar.length > 0 && (
        <section className="max-w-7xl mx-auto px-4 sm:px-8 lg:px-12 py-16" data-testid="similar-section">
          <h2 className="font-serif text-3xl">Similar homes</h2>
          <div className="grid md:grid-cols-3 gap-6 mt-8">{similar.map((s) => <ListingCard key={s.id} p={s} />)}</div>
        </section>
      )}

      <div className="lg:hidden fixed bottom-0 inset-x-0 z-30 bg-white border-t border-[#E5E1D8] p-3 flex gap-2" data-testid="mobile-sticky-cta">
        <a href="#whatsapp" onClick={wa} className="h-12 w-12 rounded-md bg-[#1f7a4d] text-white flex items-center justify-center" aria-label="WhatsApp enquiry" data-testid="mobile-sticky-whatsapp"><MessageCircle className="w-5 h-5" /></a>
        <button onClick={toForm} className="btn-dark h-12 rounded-md flex-1 font-medium" data-testid="mobile-request-visit">Request a visit</button>
      </div>
      <Lightbox imgs={imgs} index={lb} setIndex={setLb} title={p.title} />
    </article>
  );
}
