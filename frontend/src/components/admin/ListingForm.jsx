import { useEffect, useRef, useState } from "react";
import { Loader2, Upload } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { api, formatApiError, imageSrc, PROPERTY_TYPES } from "@/lib/api";

const EMPTY = { title: "", listing_type: "buy", location: "", property_type: "Apartment", bedrooms: "", bathrooms: "", area_sqft: "",
  price: "", possession: "none", furnishing: "none", images: [], newImage: "", highlights: "", latitude: "", longitude: "", description: "", is_active: true, is_sample: false };

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
  if (f.property_type !== "Plot" && !(+f.bedrooms >= 1)) e.bedrooms = "Required";
  if (f.property_type !== "Plot" && !(+f.bathrooms >= 1)) e.bathrooms = "Required";
  if (!(+f.area_sqft >= 100)) e.area_sqft = "Min 100 sq.ft";
  if (!f.images.length) e.images = "Add at least one image link or upload a photo";
  if ((f.latitude === "") !== (f.longitude === "")) e.latitude = "Enter both latitude and longitude, or neither";
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
    setF(listing ? { ...EMPTY, ...listing, possession: listing.possession || "none", furnishing: listing.furnishing || "none",
      images: listing.images?.length ? listing.images : [listing.image_url].filter(Boolean), highlights: (listing.highlights || []).join("\n"),
      latitude: listing.latitude ?? "", longitude: listing.longitude ?? "", newImage: "" } : EMPTY);
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
      setF((x) => ({ ...x, images: [...x.images, data.url] }));
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
      possession: f.possession === "none" ? null : f.possession, furnishing: f.furnishing === "none" ? null : f.furnishing,
      highlights: f.highlights.split("\n").map((h) => h.trim()).filter(Boolean),
      latitude: f.latitude === "" ? null : +f.latitude, longitude: f.longitude === "" ? null : +f.longitude };
    ["id", "slug", "views", "image_url", "newImage", "featured", "order", "created_at", "updated_at"].forEach((k) => delete body[k]);
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
          <L label="Location (locality)" error={errors.location}><Input value={f.location} onChange={set("location")} placeholder="e.g. Sector 15 or Sainik Colony" className={cls} data-testid="listing-location-input" /></L>
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
            <L label={`Photos (${f.images.length}) — first photo is the cover`} error={errors.images}>
              <div className="flex gap-2 flex-wrap mb-2" data-testid="listing-images-list">
                {f.images.map((u, i) => (
                  <div key={u + i} className="relative">
                    <img src={imageSrc(u)} alt="" className={`h-20 w-28 object-cover rounded-sm ${i === 0 ? "ring-2 ring-[#D4AF37]" : ""}`} />
                    <div className="absolute inset-x-0 bottom-0 flex justify-between bg-black/70 text-[10px]">
                      {i > 0 ? <button type="button" onClick={() => setF({ ...f, images: [u, ...f.images.filter((_, k) => k !== i)] })} className="px-1.5 py-0.5 text-[#F3E5AB]" data-testid={`listing-image-cover-${i}`}>Make cover</button> : <span className="px-1.5 py-0.5 text-[#F3E5AB]">Cover</span>}
                      <button type="button" onClick={() => setF({ ...f, images: f.images.filter((_, k) => k !== i) })} className="px-1.5 py-0.5 text-red-300" data-testid={`listing-image-remove-${i}`}>Remove</button>
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex gap-2">
                <Input value={f.newImage} onChange={set("newImage")} placeholder="Paste image link (https://…)" className={cls} data-testid="listing-image-url-input" />
                <button type="button" onClick={() => { if (/^https:\/\//.test(f.newImage.trim())) setF({ ...f, images: [...f.images, f.newImage.trim()], newImage: "" }); else toast.error("Image links must start with https://"); }}
                  className="shrink-0 px-3 rounded-sm border border-white/15 text-white text-sm hover:border-[#D4AF37]" data-testid="listing-image-add-button">Add</button>
                <button type="button" onClick={() => fileRef.current?.click()} disabled={uploading} className="shrink-0 px-3 rounded-sm border border-white/15 text-white text-sm flex items-center gap-1.5 hover:border-[#D4AF37]" data-testid="listing-image-upload-button">
                  {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />} Upload
                </button>
                <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" hidden onChange={(e) => { upload(e.target.files?.[0]); e.target.value = ""; }} data-testid="listing-image-file-input" />
              </div>
            </L>
          </div>
          <L label="Furnishing">
            <Select value={f.furnishing} onValueChange={set("furnishing")}>
              <SelectTrigger className={cls} data-testid="listing-furnishing-select"><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="none">Not specified</SelectItem>{["Unfurnished", "Semi-furnished", "Fully furnished"].map((x) => <SelectItem key={x} value={x}>{x}</SelectItem>)}</SelectContent>
            </Select>
          </L>
          <div className="grid grid-cols-2 gap-2">
            <L label="Latitude" error={errors.latitude}><Input type="number" step="any" value={f.latitude} onChange={set("latitude")} placeholder="17.44" className={cls} data-testid="listing-lat-input" /></L>
            <L label="Longitude"><Input type="number" step="any" value={f.longitude} onChange={set("longitude")} placeholder="78.35" className={cls} data-testid="listing-lng-input" /></L>
          </div>
          <div className="sm:col-span-2"><L label="Verified highlights (one per line, optional)"><Textarea value={f.highlights} onChange={set("highlights")} placeholder="Only facts you have verified, e.g. East facing" className={`${cls} min-h-[70px]`} data-testid="listing-highlights-input" /></L></div>
          <label className="sm:col-span-2 flex items-center gap-2 text-sm text-zinc-300"><input type="checkbox" checked={f.is_sample} onChange={(e) => setF({ ...f, is_sample: e.target.checked })} data-testid="listing-sample-checkbox" />Mark as demo / sample listing</label>
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
