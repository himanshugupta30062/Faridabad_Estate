import { useEffect, useState } from "react";
import { Copy, MessageCircle, Phone } from "lucide-react";
import { toast } from "sonner";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { api, formatApiError, formatPrice, imageSrc } from "@/lib/api";
import { TempBadge, fmtDate } from "./leadUtils";

const Row = ({ k, v, cap }) => (
  <div className="flex justify-between gap-4 py-2 border-b border-white/5 text-sm">
    <span className="text-zinc-500">{k}</span><span className={`text-white text-right ${cap ? "capitalize" : ""}`}>{v || "—"}</span>
  </div>
);

const Section = ({ title, children }) => (
  <div className="mt-6"><p className="text-[10px] uppercase tracking-[0.2em] text-[#D4AF37] mb-3">{title}</p>{children}</div>
);

export const LeadDetail = ({ id, onClose, onChanged }) => {
  const [lead, setLead] = useState(null);

  useEffect(() => {
    setLead(null);
    if (id) api.get(`/admin/leads/${id}`).then((r) => setLead(r.data)).catch((e) => toast.error(formatApiError(e)));
  }, [id]);

  const patch = async (body) => {
    try {
      const { data } = await api.patch(`/admin/leads/${id}`, body);
      setLead((l) => ({ ...l, ...data }));
      onChanged();
      toast.success("Lead updated");
    } catch (e) {
      toast.error(formatApiError(e));
    }
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(lead.whatsapp_message);
      toast.success("WhatsApp message copied");
    } catch {
      toast.error("Copy failed — please select the text manually");
    }
  };

  return (
    <Sheet open={!!id} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="w-full sm:max-w-xl bg-[#0F0F12] border-white/10 overflow-y-auto thin-scroll" data-testid="lead-detail">
        {!lead ? <p className="text-zinc-500 mt-10">Loading…</p> : (
          <>
            <SheetHeader className="text-left">
              <div className="flex items-center gap-2"><TempBadge t={lead.temperature} /><span className="text-xs text-zinc-500">{fmtDate(lead.created_at)} · {lead.source === "chatbot" ? "AI chat" : "Website form"}</span></div>
              <SheetTitle className="font-serif text-2xl text-white" data-testid="lead-detail-name">{lead.name}</SheetTitle>
              <SheetDescription asChild>
                <a href={`tel:${lead.phone}`} className="text-zinc-300 flex items-center gap-1.5 text-sm"><Phone className="w-3.5 h-3.5" /> {lead.phone}</a>
              </SheetDescription>
            </SheetHeader>

            <div className="grid grid-cols-2 gap-3 mt-5">
              <Select value={lead.temperature} onValueChange={(v) => patch({ temperature: v })}>
                <SelectTrigger className="bg-white/5 border-white/10 text-white" data-testid="lead-temperature-select"><SelectValue /></SelectTrigger>
                <SelectContent>{["Hot", "Warm", "Cold"].map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
              </Select>
              <Select value={lead.status || "New"} onValueChange={(v) => patch({ status: v })}>
                <SelectTrigger className="bg-white/5 border-white/10 text-white" data-testid="lead-status-select"><SelectValue /></SelectTrigger>
                <SelectContent>{["New", "Contacted", "Site visit", "Closed"].map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
              </Select>
            </div>

            <Section title="AI summary">
              <p className="text-sm text-zinc-300 leading-relaxed bg-[#1A1A22] border border-white/10 rounded-sm p-4" data-testid="lead-detail-summary">{lead.summary || "—"}</p>
            </Section>

            <Section title="Requirements">
              <Row k="Intent" v={lead.intent} cap /><Row k="Location" v={lead.location} /><Row k="Budget" v={lead.budget_label} />
              <Row k="Property type" v={lead.property_type} /><Row k="Bedrooms" v={lead.bedrooms && `${lead.bedrooms} BHK`} /><Row k="Possession" v={lead.possession} />
            </Section>

            <Section title={`Matching properties (${lead.matched_properties?.length || 0})`}>
              {lead.matched_properties?.length ? lead.matched_properties.map((p) => (
                <div key={p.id} className="flex gap-3 border border-white/10 rounded-sm p-2 mb-2" data-testid={`lead-match-${p.id}`}>
                  <img src={imageSrc(p.image_url)} alt="" className="w-20 h-14 object-cover rounded-sm" />
                  <div className="text-sm"><p className="text-white">{p.title}</p><p className="text-[#D4AF37]">{formatPrice(p.price, p.listing_type)} <span className="text-zinc-500">· {p.location}</span></p>
                    {p.is_active === false && <p className="text-xs text-red-400">Now inactive</p>}</div>
                </div>
              )) : <p className="text-sm text-zinc-500">No matching listings — callback requested.</p>}
            </Section>

            <Section title="WhatsApp follow-up">
              <textarea readOnly value={lead.whatsapp_message} className="w-full text-sm text-zinc-200 bg-[#1A1A22] border border-white/10 rounded-sm p-4 min-h-[120px]" data-testid="lead-whatsapp-text" />
              <div className="flex gap-2 mt-2">
                <button onClick={copy} className="btn-gold rounded-full px-4 py-2 text-sm flex items-center gap-2" data-testid="lead-whatsapp-copy"><Copy className="w-4 h-4" /> Copy message</button>
                <a href={`https://wa.me/91${lead.phone}?text=${encodeURIComponent(lead.whatsapp_message)}`} target="_blank" rel="noreferrer"
                  className="rounded-full px-4 py-2 text-sm border border-white/15 text-white flex items-center gap-2 hover:border-emerald-500" data-testid="lead-whatsapp-open"><MessageCircle className="w-4 h-4" /> Open WhatsApp</a>
              </div>
            </Section>

            <Section title="Chat transcript">
              <div className="space-y-2" data-testid="lead-transcript">
                {(lead.transcript || []).map((m, i) => (
                  <div key={i} className={`text-sm rounded-sm px-3 py-2 ${m.role === "user" ? "bg-[#D4AF37]/10 text-[#F3E5AB] ml-8" : "bg-[#1A1A22] text-zinc-300 mr-8"}`}>
                    <p className="text-[10px] uppercase tracking-widest opacity-60 mb-0.5">{m.role === "user" ? "Visitor" : "Property Mitra"}</p>
                    <p className="whitespace-pre-wrap">{m.content}</p>
                  </div>
                ))}
              </div>
            </Section>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
};
