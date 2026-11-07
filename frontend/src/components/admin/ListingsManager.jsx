import { useState } from "react";
import { Plus, Pencil } from "lucide-react";
import { toast } from "sonner";
import { Switch } from "@/components/ui/switch";
import { api, formatApiError, formatPrice, imageSrc } from "@/lib/api";
import { ListingForm } from "./ListingForm";

export const ListingsManager = ({ listings, reload }) => {
  const [editing, setEditing] = useState(null);
  const [open, setOpen] = useState(false);

  const toggle = async (p, v) => {
    try {
      await api.patch(`/admin/properties/${p.id}/active`, { is_active: v });
      toast.success(v ? "Listing activated" : "Listing deactivated");
      reload();
    } catch (e) {
      toast.error(formatApiError(e));
    }
  };

  return (
    <div data-testid="listings-manager">
      <div className="flex justify-between items-center mb-5">
        <p className="text-zinc-400 text-sm">{listings.length} listings · {listings.filter((l) => l.is_active).length} active</p>
        <button onClick={() => { setEditing(null); setOpen(true); }} className="btn-gold rounded-full px-5 py-2 text-sm font-medium flex items-center gap-2" data-testid="listing-add-button">
          <Plus className="w-4 h-4" /> Add listing
        </button>
      </div>
      <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
        {listings.map((p) => (
          <div key={p.id} className={`bg-[#1A1A22] border border-white/10 rounded-md overflow-hidden ${p.is_active ? "" : "opacity-50"}`} data-testid={`admin-listing-${p.id}`}>
            <img src={imageSrc(p.image_url)} alt="" className="w-full h-36 object-cover" />
            <div className="p-4">
              <div className="flex justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-white truncate">{p.title}</p>
                  <p className="text-sm text-[#D4AF37]">{formatPrice(p.price, p.listing_type)} <span className="text-zinc-500">· {p.location}</span></p>
                  <p className="text-xs text-zinc-500 mt-0.5">{p.bedrooms} BHK {p.property_type} · {p.listing_type === "rent" ? "Rent" : "Sale"}{p.is_sample ? " · Sample" : ""}</p>
                </div>
                <button onClick={() => { setEditing(p); setOpen(true); }} className="text-zinc-400 hover:text-[#D4AF37] h-8 w-8 flex items-center justify-center" data-testid={`admin-listing-edit-${p.id}`} aria-label="Edit"><Pencil className="w-4 h-4" /></button>
              </div>
              <div className="flex items-center justify-between mt-3 pt-3 border-t border-white/5">
                <span className="text-xs text-zinc-400">{p.is_active ? "Active" : "Inactive"}</span>
                <Switch checked={p.is_active} onCheckedChange={(v) => toggle(p, v)} data-testid={`admin-listing-toggle-${p.id}`} />
              </div>
            </div>
          </div>
        ))}
      </div>
      <ListingForm open={open} listing={editing} onClose={() => setOpen(false)} onSaved={() => { setOpen(false); reload(); }} />
    </div>
  );
};
