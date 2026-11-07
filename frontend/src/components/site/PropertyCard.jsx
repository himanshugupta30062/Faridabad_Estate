import { BedDouble, Bath, Maximize, MapPin } from "lucide-react";
import { formatPrice, imageSrc } from "@/lib/api";

export const SampleBadge = () => (
  <span className="text-[10px] uppercase tracking-[0.2em] px-2.5 py-1 rounded-sm border border-[#D4AF37]/60 bg-[#0F0F12]/85 text-[#F3E5AB]">
    Sample listing
  </span>
);

export const PropertyCard = ({ p, onOpen, index = 0 }) => (
  <article
    onClick={() => onOpen(p)}
    className="group cursor-pointer bg-[#1A1A22] border border-white/10 hover:border-[#D4AF37]/50 rounded-md overflow-hidden transition-colors fade-up"
    style={{ animationDelay: `${index * 60}ms` }}
    data-testid={`property-card-${p.id}`}
  >
    <div className="relative aspect-[4/3] overflow-hidden">
      <img src={imageSrc(p.image_url)} alt={p.title} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" loading="lazy" />
      <div className="absolute top-3 left-3 flex gap-2">
        <span className="text-[10px] uppercase tracking-[0.2em] px-2.5 py-1 rounded-sm bg-[#0F0F12]/80 text-white">
          {p.listing_type === "rent" ? "For Rent" : "For Sale"}
        </span>
        {p.is_sample && <SampleBadge />}
      </div>
    </div>
    <div className="p-5 sm:p-6">
      <p className="font-serif text-2xl text-[#D4AF37]" data-testid="property-card-price">{formatPrice(p.price, p.listing_type)}</p>
      <h3 className="font-serif text-lg text-white mt-1">{p.title}</h3>
      <p className="flex items-center gap-1.5 text-sm text-zinc-400 mt-1"><MapPin className="w-3.5 h-3.5" /> {p.location}, Hyderabad · {p.property_type}</p>
      <div className="flex gap-5 mt-4 pt-4 border-t border-white/10 text-sm text-zinc-300">
        <span className="flex items-center gap-1.5"><BedDouble className="w-4 h-4 text-zinc-500" /> {p.bedrooms} BHK</span>
        <span className="flex items-center gap-1.5"><Bath className="w-4 h-4 text-zinc-500" /> {p.bathrooms}</span>
        <span className="flex items-center gap-1.5"><Maximize className="w-4 h-4 text-zinc-500" /> {p.area_sqft?.toLocaleString("en-IN")} sq.ft</span>
      </div>
    </div>
  </article>
);
