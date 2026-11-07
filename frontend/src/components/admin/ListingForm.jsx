import { useEffect, useRef, useState } from "react";
import { Loader2, Upload } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { api, formatApiError, imageSrc, PROPERTY_TYPES } from "@/lib/api";

const EMPTY = { title: "", listing_type: "buy", location: "", property_type: "Apartment", bedrooms: "", bathrooms: "", area_sqft: "",
  price: "", possession: "none", image_url: "", description: "", is_active: true };

const L = ({ label, error, children }) => (
  <label className="block">
    <span className="text-xs text-zinc-400">{label}</span>
    <div className="mt-1">{children}</div>
    {error && <span className="text-xs text-red-400" data-testid="listing-form-field-error">{error}</span>}
  </label>
);

const cls = "bg-white/5 border-white/10 text-white";

function validate(f) {
  const e = {};
  if (f.title.trim().length < 3) e.title = "Title is required";
  if (f.location.trim().length < 2) e.location = "Location is required";
  if (!(+f.price > 0)) e.price = "Enter a valid price";
  if (!(+f.bedrooms >= 1)) e.bedrooms = "Required";
  if (!(+f.bathrooms >= 1)) e.bathrooms = "Required";
  if (!(+f.area_sqft >= 100)) e.area_sqft = "Min 100 sq.ft";
  if (!f.image_url) e.image_url = "Add an image link or upload a photo";
  if (f.description.trim().length < 10) e.description = "At least 10 characters";
  return e;
}

export const ListingForm = ({ open, listing, onClose, onSaved }) => {
  const [f, setF] = useState(EMPTY);
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef(null);

  useEffect(() => {
    setErrors({});
    setF(listing ? { ...EMPTY, ...listing, possession: listing.possession || "none" } : EMPTY);
  }, [listing, open]);

  const set = (k) => (e) => setF({ ...f, [k]: e?.target ? e.target.value : e });

  const upload = async (file) => {
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) return toast.error("Image must be under 5 MB");
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const { data } = await api.post("/admin/upload", fd);
      setF((x) => ({ ...x, image_url: data.url }));
      toast.success("Photo uploaded");
    } catch (e) {
      toast.error(formatApiError(e));
    } finally {
      setUploading(false);
    }
  };

  const save = async () => {
    const e = validate(f);
    setErrors(e);
    if (Object.keys(e).length) return;
    setBusy(true);
    const body = { ...f, bedrooms: +f.bedrooms, bathrooms: +f.bathrooms, area_sqft: +f.area_sqft, price: +f.price,
      possession: f.possession === "none" ? null : f.possession };
    ["id", "is_sample", "featured", "order", "created_at", "updated_at"].forEach((k) => delete body[k]);
    try {
      if (listing) await api.put(`/admin/properties/${listing.id}`, body);
      else await api.post("/admin/properties", body);
      toast.success(listing ? "Listing updated" : "Listing added");
      onSaved();
    } catch (err) {
      toast.error(formatApiError(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl bg-[#1A1A22] border-white/10 max-h-[92vh] overflow-y-auto thin-scroll" data-testid="listing-form">
        <DialogHeader>
          <DialogTitle className="font-serif text-2xl text-white">{listing ? "Edit listing" : "Add listing"}</DialogTitle>
          <DialogDescription className="text-zinc-500">Only enter verified details — Property Mitra uses this data to answer visitors.</DialogDescription>
        </DialogHeader>
        <div className="grid sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2"><L label="Title" error={errors.title}><Input value={f.title} onChange={set("title")} className={cls} data-testid="listing-title-input" /></L></div>
          <L label="Listing type">
            <Select value={f.listing_type} onValueChange={set("listing_type")}>
              <SelectTrigger className={cls} data-testid="listing-type-select"><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="buy">For sale</SelectItem><SelectItem value="rent">For rent</SelectItem></SelectContent>
            </Select>
          </L>
          <L label="Property type">
            <Select value={f.property_type} onValueChange={set("property_type")}>
              <SelectTrigger className={cls} data-testid="listing-property-type-select"><SelectValue /></SelectTrigger>
              <SelectContent>{PROPERTY_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
            </Select>
          </L>
          <L label="Location (locality)" error={errors.location}><Input value={f.location} onChange={set("location")} placeholder="e.g. Gachibowli" className={cls} data-testid="listing-location-input" /></L>
          <L label={f.listing_type === "rent" ? "Monthly rent (₹)" : "Price (₹)"} error={errors.price}><Input type="number" value={f.price} onChange={set("price")} placeholder={f.listing_type === "rent" ? "28000" : "8500000"} className={cls} data-testid="listing-price-input" /></L>
          <L label="Bedrooms" error={errors.bedrooms}><Input type="number" value={f.bedrooms} onChange={set("bedrooms")} className={cls} data-testid="listing-bedrooms-input" /></L>
          <L label="Bathrooms" error={errors.bathrooms}><Input type="number" value={f.bathrooms} onChange={set("bathrooms")} className={cls} data-testid="listing-bathrooms-input" /></L>
          <L label="Area (sq.ft)" error={errors.area_sqft}><Input type="number" value={f.area_sqft} onChange={set("area_sqft")} className={cls} data-testid="listing-area-input" /></L>
          <L label="Possession">
            <Select value={f.possession} onValueChange={set("possession")}>
              <SelectTrigger className={cls} data-testid="listing-possession-select"><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="none">Not specified</SelectItem><SelectItem value="Ready to move">Ready to move</SelectItem><SelectItem value="Under construction">Under construction</SelectItem></SelectContent>
            </Select>
          </L>
          <div className="sm:col-span-2">
            <L label="Image" error={errors.image_url}>
              <div className="flex gap-2">
                <Input value={f.image_url} onChange={set("image_url")} placeholder="Paste image link (https://…)" className={cls} data-testid="listing-image-url-input" />
                <button type="button" onClick={() => fileRef.current?.click()} disabled={uploading} className="shrink-0 px-3 rounded-sm border border-white/15 text-white text-sm flex items-center gap-1.5 hover:border-[#D4AF37]" data-testid="listing-image-upload-button">
                  {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />} Upload
                </button>
                <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" hidden onChange={(e) => { upload(e.target.files?.[0]); e.target.value = ""; }} data-testid="listing-image-file-input" />
              </div>
            </L>
            {f.image_url && <img src={imageSrc(f.image_url)} alt="" className="mt-2 h-28 rounded-sm object-cover" data-testid="listing-image-preview" />}
          </div>
          <div className="sm:col-span-2"><L label="Description" error={errors.description}><Textarea value={f.description} onChange={set("description")} className={`${cls} min-h-[90px]`} data-testid="listing-description-input" /></L></div>
        </div>
        <div className="flex justify-end gap-2 mt-2">
          <button onClick={onClose} className="px-5 py-2 rounded-full text-sm text-zinc-300 border border-white/10" data-testid="listing-cancel-button">Cancel</button>
          <button onClick={save} disabled={busy} className="btn-gold px-6 py-2 rounded-full text-sm font-medium flex items-center gap-2 disabled:opacity-60" data-testid="listing-save-button">
            {busy && <Loader2 className="w-4 h-4 animate-spin" />} Save listing
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
