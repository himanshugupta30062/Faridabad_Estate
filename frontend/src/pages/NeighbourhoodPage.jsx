import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Sparkles } from "lucide-react";
import { api, formatApiError, formatPrice, imageSrc, openChat } from "@/lib/api";
import { ListingCard } from "@/components/site/ListingCard";
import { EnquiryForm } from "@/components/site/EnquiryForm";
import { Seo } from "@/components/site/Seo";

const Stat = ({ label, value }) => <div><p className="text-[11px] uppercase tracking-[0.14em] text-white/60">{label}</p><p className="font-serif text-2xl text-white mt-1">{value}</p></div>;

export default function NeighbourhoodPage() {
  const { slug } = useParams();
  const [n, setN] = useState(null);
  const [error, setError] = useState("");
  useEffect(() => { setN(null); api.get(`/neighbourhoods/${slug}`).then((r) => setN(r.data)).catch((e) => setError(formatApiError(e))); }, [slug]);
  if (error) return <div className="py-24 text-center" data-testid="hood-error"><p className="font-serif text-3xl">{error}</p><Link to="/" className="underline mt-4 inline-block">Back home</Link></div>;
  if (!n) return <div className="h-[50vh] bg-[#EFEBE3] animate-pulse" />;
  const hero = n.properties[0]?.images?.[0] || n.properties[0]?.image_url;
  return (
    <div data-testid="neighbourhood-page">
      <Seo title={`Property in ${n.name}, Hyderabad — Homes for sale & rent | PropMitra`} description={`${n.intro} Browse ${n.listings} UrbanNest listings in ${n.name}.`} />
      <section className="relative bg-[#111114] overflow-hidden">
        {hero && <img src={imageSrc(hero)} alt="" className="absolute inset-0 w-full h-full object-cover opacity-40" />}
        <div className="relative max-w-7xl mx-auto px-4 sm:px-8 lg:px-12 py-20 sm:py-28">
          <p className="eyebrow !text-[#e3c77a]">Neighbourhood guide · Hyderabad</p>
          <h1 className="font-serif text-white text-4xl sm:text-6xl mt-4">{n.name}</h1>
          <p className="text-white/80 mt-5 max-w-xl text-lg">{n.intro}</p>
          <div className="flex flex-wrap gap-10 mt-10">
            <Stat label="UrbanNest listings" value={n.listings} />
            {n.min_buy_price && <Stat label="Sale from" value={formatPrice(n.min_buy_price)} />}
            {n.min_rent && <Stat label="Rent from" value={formatPrice(n.min_rent, "rent")} />}
            {n.avg_price_per_sqft && <Stat label="Avg. ₹ / sq.ft (listings)" value={`₹${n.avg_price_per_sqft.toLocaleString("en-IN")}`} />}
          </div>
        </div>
      </section>
      <section className="max-w-7xl mx-auto px-4 sm:px-8 lg:px-12 py-14">
        <h2 className="font-serif text-3xl">Homes in {n.name}</h2>
        {n.properties.length ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mt-8">{n.properties.map((p) => <ListingCard key={p.id} p={p} />)}</div>
        ) : <p className="text-[#55524D] mt-4" data-testid="hood-empty">No active listings here right now — share your requirement and we'll call you when something fits.</p>}
        <p className="text-xs text-[#8a8579] mt-6">Figures are calculated from current UrbanNest listings (demo data) and are not an official market index.</p>
      </section>
      <section className="max-w-7xl mx-auto px-4 sm:px-8 lg:px-12 pb-20 grid lg:grid-cols-2 gap-10">
        <div className="bg-[#111114] text-white rounded-xl p-8">
          <p className="font-serif text-2xl">Looking in {n.name}?</p>
          <p className="text-white/65 mt-3">Tell Property Mitra your budget and configuration to see matching homes instantly.</p>
          <button onClick={() => openChat(`I'm looking for a home in ${n.name}.`)} className="btn-gold rounded-full h-11 px-5 mt-6 inline-flex items-center gap-2" data-testid="hood-chat-button"><Sparkles className="w-4 h-4" />Ask Property Mitra</button>
        </div>
        <div className="bg-white border border-[#E5E1D8] rounded-xl p-6"><EnquiryForm types={["callback", "visit"]} /></div>
      </section>
    </div>
  );
}
