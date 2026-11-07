import { BedDouble, Bath, Maximize, MapPin, CalendarClock, Sparkles } from "lucide-react";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { formatPrice, imageSrc, openChat } from "@/lib/api";
import { SampleBadge } from "./PropertyCard";

const Spec = ({ icon: Icon, label, value }) => (
  <div className="border border-white/10 rounded-sm p-3">
    <Icon className="w-4 h-4 text-[#D4AF37]" />
    <p className="text-[10px] uppercase tracking-[0.2em] text-zinc-500 mt-2">{label}</p>
    <p className="text-white text-sm mt-0.5">{value}</p>
  </div>
);

export const PropertyDialog = ({ p, onClose, onEnquire }) => (
  <Dialog open={!!p} onOpenChange={(o) => !o && onClose()}>
    <DialogContent className="max-w-3xl p-0 overflow-hidden bg-[#1A1A22] border-white/10 max-h-[92vh] overflow-y-auto" data-testid="property-dialog">
      {p && (
        <>
          <img src={imageSrc(p.image_url)} alt={p.title} className="w-full aspect-[16/9] object-cover" />
          <div className="p-6 sm:p-8">
            <div className="flex flex-wrap items-center gap-2 mb-3">
              <span className="text-[10px] uppercase tracking-[0.2em] text-[#D4AF37]">{p.listing_type === "rent" ? "For Rent" : "For Sale"} · {p.property_type}</span>
              {p.is_sample && <SampleBadge />}
            </div>
            <DialogTitle className="font-serif text-2xl sm:text-3xl text-white">{p.title}</DialogTitle>
            <p className="flex items-center gap-1.5 text-zinc-400 mt-2"><MapPin className="w-4 h-4" /> {p.location}, Hyderabad</p>
            <p className="font-serif text-3xl text-[#D4AF37] mt-4" data-testid="property-dialog-price">{formatPrice(p.price, p.listing_type)}</p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6">
              <Spec icon={BedDouble} label="Bedrooms" value={`${p.bedrooms} BHK`} />
              <Spec icon={Bath} label="Bathrooms" value={p.bathrooms} />
              <Spec icon={Maximize} label="Area" value={`${p.area_sqft?.toLocaleString("en-IN")} sq.ft`} />
              <Spec icon={CalendarClock} label="Possession" value={p.possession || "Ask advisor"} />
            </div>
            <DialogDescription className="text-zinc-300 leading-relaxed mt-6">{p.description}</DialogDescription>
            <div className="flex flex-col sm:flex-row gap-3 mt-8">
              <button onClick={() => { onClose(); openChat(`I'm interested in ${p.title} in ${p.location}. Can you tell me more?`); }}
                className="btn-gold rounded-full px-6 py-3 text-sm font-medium flex items-center justify-center gap-2" data-testid="property-dialog-ask-ai">
                <Sparkles className="w-4 h-4" /> Ask Property Mitra
              </button>
              <button onClick={() => { onClose(); onEnquire(p); }}
                className="rounded-full px-6 py-3 text-sm border border-white/20 text-white hover:border-[#D4AF37]" data-testid="property-dialog-enquire">
                Request a callback
              </button>
            </div>
          </div>
        </>
      )}
    </DialogContent>
  </Dialog>
);
