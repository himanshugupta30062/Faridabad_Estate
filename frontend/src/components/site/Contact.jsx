import { useEffect, useState } from "react";
import { Phone, Mail, MapPin, Clock, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { api, formatApiError } from "@/lib/api";

const EMPTY = { name: "", phone: "", intent: "buy", location: "", budget: "", message: "" };

const Info = ({ icon: Icon, children }) => (
  <div className="flex gap-4 items-start">
    <Icon className="w-5 h-5 text-[#D4AF37] mt-0.5 shrink-0" />
    <div className="text-zinc-300 text-sm leading-relaxed">{children}</div>
  </div>
);

export const Contact = ({ property, clearProperty }) => {
  const [form, setForm] = useState(EMPTY);
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (property) setForm((f) => ({ ...f, intent: property.listing_type, location: property.location, message: `Interested in ${property.title}` }));
  }, [property]);

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const validate = () => {
    const e = {};
    if (form.name.trim().length < 2) e.name = "Please enter your name";
    if (!/^[6-9]\d{9}$/.test(form.phone.replace(/\D/g, "").slice(-10))) e.phone = "Enter a valid 10-digit mobile number";
    setErrors(e);
    return !Object.keys(e).length;
  };

  const submit = async (ev) => {
    ev.preventDefault();
    if (!validate()) return;
    setBusy(true);
    try {
      await api.post("/enquiries", { ...form, property_id: property?.id || null });
      toast.success("Thank you! An UrbanNest advisor will call you shortly.");
      setForm(EMPTY);
      clearProperty();
    } catch (err) {
      toast.error(formatApiError(err));
    } finally {
      setBusy(false);
    }
  };

  const inputCls = "bg-white/5 border-white/10 text-white h-11 rounded-sm placeholder:text-zinc-600";
  return (
    <section id="contact" className="py-20 sm:py-28 bg-[#121218] border-t border-white/5" data-testid="contact-section">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-12 grid lg:grid-cols-2 gap-12 lg:gap-20">
        <div>
          <p className="text-xs uppercase tracking-[0.25em] text-[#D4AF37]">Contact</p>
          <h2 className="font-serif text-3xl sm:text-4xl text-white mt-3">Speak with an UrbanNest advisor</h2>
          <p className="text-zinc-400 mt-4 max-w-md">Share your requirement and we'll call you back — or chat with Property Mitra any time.</p>
          <div className="space-y-6 mt-10">
            <Info icon={MapPin}>UrbanNest Properties, 4th Floor, Sample Towers, Road No. 36, Jubilee Hills, Hyderabad 500033</Info>
            <Info icon={Phone}><a href="tel:+919000000000" className="hover:text-[#D4AF37]" data-testid="contact-phone">+91 90000 00000</a></Info>
            <Info icon={Mail}><a href="mailto:hello@urbannest.in" className="hover:text-[#D4AF37]" data-testid="contact-email">hello@urbannest.in</a></Info>
            <Info icon={Clock}>Mon – Sat, 10:00 AM – 7:00 PM</Info>
          </div>
        </div>
        <form onSubmit={submit} noValidate className="bg-[#1A1A22] border border-white/10 rounded-md p-6 sm:p-8 space-y-4" data-testid="enquiry-form">
          {property && (
            <p className="text-xs text-[#F3E5AB] bg-[#D4AF37]/10 border border-[#D4AF37]/30 rounded-sm px-3 py-2" data-testid="enquiry-property-tag">
              Enquiring about: {property.title}
            </p>
          )}
          <div className="flex gap-2">
            {["buy", "rent", "sell"].map((t) => (
              <button type="button" key={t} onClick={() => setForm({ ...form, intent: t })} data-testid={`enquiry-intent-${t}`}
                className={`px-5 py-2 rounded-full text-sm capitalize ${form.intent === t ? "btn-gold" : "bg-white/5 text-zinc-300"}`}>{t}</button>
            ))}
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <Input placeholder="Your name *" value={form.name} onChange={set("name")} className={inputCls} data-testid="enquiry-name-input" />
              {errors.name && <p className="text-red-400 text-xs mt-1" data-testid="enquiry-name-error">{errors.name}</p>}
            </div>
            <div>
              <Input placeholder="Mobile number *" inputMode="tel" value={form.phone} onChange={set("phone")} className={inputCls} data-testid="enquiry-phone-input" />
              {errors.phone && <p className="text-red-400 text-xs mt-1" data-testid="enquiry-phone-error">{errors.phone}</p>}
            </div>
            <Input placeholder="Preferred location" value={form.location} onChange={set("location")} className={inputCls} data-testid="enquiry-location-input" />
            <Input placeholder="Budget (e.g. ₹1.2 Cr)" value={form.budget} onChange={set("budget")} className={inputCls} data-testid="enquiry-budget-input" />
          </div>
          <Textarea placeholder="Anything else? (bedrooms, possession, timeline…)" value={form.message} onChange={set("message")}
            className="bg-white/5 border-white/10 text-white rounded-sm placeholder:text-zinc-600 min-h-[100px]" data-testid="enquiry-message-input" />
          <button disabled={busy} className="btn-gold w-full h-12 rounded-sm font-medium flex items-center justify-center gap-2 disabled:opacity-60" data-testid="enquiry-submit-button">
            {busy && <Loader2 className="w-4 h-4 animate-spin" />} Request a callback
          </button>
        </form>
      </div>
    </section>
  );
};
