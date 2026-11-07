import { useState } from "react";
import { Link } from "react-router-dom";
import { BedDouble, Bath, Maximize, ChevronLeft, ChevronRight, MapPin } from "lucide-react";
import { formatPrice, imageSrc } from "@/lib/api";
import { FavButton, CompareButton, ShareButton } from "./PropertyActions";

export const DemoBadge = ({ className = "" }) => (
  <span className={`text-[10px] uppercase tracking-[0.18em] px-2 py-1 rounded-sm bg-[#FAF9F6]/95 text-[#6b5419] font-semibold ${className}`}>Demo listing</span>
);

const Carousel = ({ p }) => {
  const imgs = p.images?.length ? p.images : [p.image_url];
  const [i, setI] = useState(0);
  const go = (d) => (e) => { e.preventDefault(); e.stopPropagation(); setI((x) => (x + d + imgs.length) % imgs.length); };
  return (
    <div className="relative h-full overflow-hidden bg-[#E8E4DC]">
      <img src={imageSrc(imgs[i])} alt={`${p.title} photo ${i + 1}`} loading="lazy" className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-[1.03]" />
      {imgs.length > 1 && (
        <>
          <button onClick={go(-1)} aria-label="Previous photo" className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-white/90 flex items-center justify-center opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity" data-testid={`card-prev-${p.id}`}><ChevronLeft className="w-4 h-4" /></button>
          <button onClick={go(1)} aria-label="Next photo" className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-white/90 flex items-center justify-center opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity" data-testid={`card-next-${p.id}`}><ChevronRight className="w-4 h-4" /></button>
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1">
            {imgs.map((_, k) => <span key={k} className={`h-1.5 rounded-full transition-all ${k === i ? "w-4 bg-white" : "w-1.5 bg-white/60"}`} />)}
          </div>
        </>
      )}
    </div>
  );
};

export const ListingCard = ({ p, layout = "grid", active, onHover }) => {
  const list = layout === "list";
  return (
    <Link to={`/property/${p.slug}`} onMouseEnter={() => onHover?.(p.id)} onMouseLeave={() => onHover?.(null)}
      className={`group block bg-white border rounded-lg overflow-hidden transition-[border-color,box-shadow] duration-300 hover:shadow-[0_18px_40px_-22px_rgba(17,17,20,0.35)] ${active ? "border-[#c9a54c]" : "border-[#E5E1D8]"} ${list ? "sm:flex" : ""}`}
      data-testid={`listing-card-${p.id}`}>
      <div className={`relative ${list ? "sm:w-[42%] aspect-[4/3] sm:aspect-auto shrink-0" : "aspect-[4/3]"}`}>
        <Carousel p={p} />
        <div className="absolute top-3 left-3 right-14 flex flex-wrap gap-1.5">
          <span className="text-[10px] uppercase tracking-[0.18em] px-2 py-1 rounded-sm bg-[#16161a]/85 text-white font-semibold">{p.listing_type === "rent" ? "For rent" : "For sale"}</span>
          {p.is_sample && <DemoBadge />}
        </div>
        <FavButton id={p.id} className="absolute top-3 right-3 w-9 h-9 bg-white/95 text-[#111114] hover:bg-white" />
      </div>
      <div className="p-5 flex-1 flex flex-col">
        <div className="flex items-start justify-between gap-3">
          <p className="font-serif text-2xl text-[#111114]" data-testid="listing-card-price">{formatPrice(p.price, p.listing_type)}</p>
          <div className="flex gap-1 text-[#55524D]">
            <CompareButton id={p.id} className="w-8 h-8 hover:bg-[#F4F1EA]" />
            <ShareButton p={p} className="w-8 h-8 hover:bg-[#F4F1EA]" />
          </div>
        </div>
        <h3 className="text-[15px] font-medium text-[#111114] mt-1">{p.title}</h3>
        <p className="flex items-center gap-1 text-sm text-[#55524D] mt-1"><MapPin className="w-3.5 h-3.5" />{p.location}, Hyderabad · {p.property_type}</p>
        {list && <p className="text-sm text-[#55524D] mt-3 line-clamp-2">{p.description}</p>}
        <div className="flex gap-4 mt-auto pt-4 text-sm text-[#2b2a27]">
          <span className="flex items-center gap-1.5"><BedDouble className="w-4 h-4 text-[#8a8579]" />{p.bedrooms} BHK</span>
          <span className="flex items-center gap-1.5"><Bath className="w-4 h-4 text-[#8a8579]" />{p.bathrooms} bath</span>
          <span className="flex items-center gap-1.5"><Maximize className="w-4 h-4 text-[#8a8579]" />{p.area_sqft?.toLocaleString("en-IN")} sq.ft</span>
        </div>
        <span className="mt-4 pt-4 border-t border-[#EFEBE3] text-sm font-medium text-[#8a6d24] group-hover:text-[#111114] transition-colors">View details & enquire →</span>
      </div>
    </Link>
  );
};
