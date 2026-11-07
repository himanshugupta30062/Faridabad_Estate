import { useState } from "react";
import { Loader2, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { api, formatApiError } from "@/lib/api";

const TYPES = {
  visit: "Request a visit",
  tour: "Schedule a tour",
  callback: "Request a callback",
  contact_agent: "Contact agent",
  sell: "List my property",
};

const campaign = () => new URLSearchParams(window.location.search).get("utm_campaign") || null;
const today = () => new Date().toISOString().slice(0, 10);

export const EnquiryForm = ({ property, types = ["callback"], defaultIntent = "buy", dark = false, compact = false }) => {
  const [type, setType] = useState(types[0]);
  const [f, setF] = useState({ name: "", phone: "", intent: property?.listing_type || defaultIntent, location: property?.location || "", budget: "", message: "", preferred_date: "" });
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const needsDate = type === "visit" || type === "tour";

  const submit = async (e) => {
    e.preventDefault();
    const er = {};
    if (f.name.trim().length < 2) er.name = "Please enter your name";
    if (!/^[6-9]\d{9}$/.test(f.phone.replace(/\D/g, "").slice(-10))) er.phone = "Enter a valid 10-digit mobile number";
    if (needsDate && !f.preferred_date) er.preferred_date = "Choose a preferred date";
    setErrors(er);
    if (Object.keys(er).length) return;
    setBusy(true);
    try {
      await api.post("/enquiries", { ...f, intent: type === "sell" ? "sell" : f.intent, enquiry_type: property && type === "callback" ? "property" : type,
        preferred_date: needsDate ? f.preferred_date : null, property_id: property?.id || null, source_page: window.location.pathname, campaign: campaign() });
      setDone(true);
    } catch (err) {
      toast.error(formatApiError(err));
    } finally {
      setBusy(false);
    }
  };

  const ink = dark ? "text-white" : "text-[#111114]";
  const field = `h-11 rounded-md ${dark ? "bg-white/5 border-white/15 text-white placeholder:text-white/40" : "bg-white border-[#DDD7CB] placeholder:text-[#9a958a]"}`;
  if (done)
    return (
      <div className={`py-8 text-center ${ink}`} data-testid="enquiry-success">
        <CheckCircle2 className="w-10 h-10 mx-auto text-[#c9a54c]" />
        <p className="font-serif text-2xl mt-3">Thank you, {f.name.split(" ")[0]}.</p>
        <p className={`text-sm mt-2 ${dark ? "text-white/70" : "text-[#55524D]"}`}>An UrbanNest advisor will contact you on {f.phone} shortly.</p>
      </div>
    );
  return (
    <form onSubmit={submit} noValidate className="space-y-3" data-testid="enquiry-form">
      {types.length > 1 && (
        <div className="flex flex-wrap gap-2" role="tablist">
          {types.map((t) => (
            <button type="button" key={t} role="tab" aria-selected={type === t} onClick={() => setType(t)} data-testid={`enquiry-type-${t}`}
              className={`px-4 py-2 rounded-full text-sm ${type === t ? (dark ? "bg-white text-[#111114]" : "btn-dark") : dark ? "border border-white/20 text-white/80" : "btn-line"}`}>{TYPES[t]}</button>
          ))}
        </div>
      )}
      {!property && type !== "sell" && (
        <div className="flex gap-2">
          {["buy", "rent"].map((i) => (
            <button type="button" key={i} onClick={() => setF({ ...f, intent: i })} data-testid={`enquiry-intent-${i}`}
              className={`px-4 py-1.5 rounded-full text-xs uppercase tracking-wider ${f.intent === i ? "bg-[#c9a54c] text-[#111114]" : dark ? "text-white/70 border border-white/15" : "btn-line"}`}>{i}</button>
          ))}
        </div>
      )}
      <div className="grid sm:grid-cols-2 gap-3">
        <div><Input aria-label="Your name" placeholder="Your name *" value={f.name} onChange={set("name")} className={field} data-testid="enquiry-name-input" />
          {errors.name && <p className="text-red-500 text-xs mt-1" data-testid="enquiry-name-error">{errors.name}</p>}</div>
        <div><Input aria-label="Mobile number" placeholder="Mobile number *" inputMode="tel" value={f.phone} onChange={set("phone")} className={field} data-testid="enquiry-phone-input" />
          {errors.phone && <p className="text-red-500 text-xs mt-1" data-testid="enquiry-phone-error">{errors.phone}</p>}</div>
        {needsDate && (
          <div className="sm:col-span-2"><Input type="date" aria-label="Preferred date" min={today()} value={f.preferred_date} onChange={set("preferred_date")} className={field} data-testid="enquiry-date-input" />
            {errors.preferred_date && <p className="text-red-500 text-xs mt-1">{errors.preferred_date}</p>}</div>
        )}
        {!property && !compact && (
          <>
            <Input aria-label="Locality" placeholder={type === "sell" ? "Property locality" : "Preferred locality"} value={f.location} onChange={set("location")} className={field} data-testid="enquiry-location-input" />
            <Input aria-label="Budget" placeholder={type === "sell" ? "Expected price" : "Budget (e.g. ₹1.2 Cr)"} value={f.budget} onChange={set("budget")} className={field} data-testid="enquiry-budget-input" />
          </>
        )}
      </div>
      {!compact && <Textarea aria-label="Message" placeholder="Anything else we should know? (optional)" value={f.message} onChange={set("message")} className={`${field} h-auto min-h-[84px]`} data-testid="enquiry-message-input" />}
      <button disabled={busy} className="btn-gold w-full h-12 rounded-md font-medium flex items-center justify-center gap-2 disabled:opacity-60" data-testid="enquiry-submit-button">
        {busy && <Loader2 className="w-4 h-4 animate-spin" />}{TYPES[type]}
      </button>
      <p className={`text-[11px] ${dark ? "text-white/50" : "text-[#8a8579]"}`}>We'll only use your details to respond to this enquiry.</p>
    </form>
  );
};
