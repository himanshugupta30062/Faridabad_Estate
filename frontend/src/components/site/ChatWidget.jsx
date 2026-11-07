import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Sparkles, X, Send, MapPin, BedDouble, Headset } from "lucide-react";
import { API, formatPrice, imageSrc } from "@/lib/api";

const SID_KEY = "propmitra_chat_sid";
const GREETING = "Namaste! I'm Estate Mitra, your AI property advisor from Faridabad Estates — Find Your Place. Build Your Future. Are you looking to Buy, Rent or Sell a property in Faridabad?";

const MiniCard = ({ p }) => (
  <Link to={`/property/${p.slug}`} className="flex gap-3 bg-[#0F0F12] border border-[#D4AF37]/30 hover:border-[#D4AF37] rounded-sm p-2 min-w-[260px] max-w-[280px]" data-testid={`chat-match-${p.id}`}>
    <img src={imageSrc(p.image_url)} alt={p.title} className="w-20 h-16 object-cover rounded-sm" />
    <div className="min-w-0">
      <p className="text-[#D4AF37] font-serif text-sm">{formatPrice(p.price, p.listing_type)}</p>
      <p className="text-white text-xs truncate">{p.title}</p>
      <p className="text-zinc-500 text-[11px] flex items-center gap-2 mt-0.5">
        <span className="flex items-center gap-0.5"><MapPin className="w-3 h-3" />{p.location}</span>
        <span className="flex items-center gap-0.5"><BedDouble className="w-3 h-3" />{p.bedrooms ? `${p.bedrooms} BHK` : "Plot"}</span>
      </p>
      {p.reasons?.length > 0 && <p className="text-[10px] text-emerald-300/90 mt-1 leading-snug line-clamp-2">✓ {p.reasons.join(" · ")}</p>}
      <p className="text-[9px] uppercase tracking-widest text-[#F3E5AB]/70 mt-0.5">{p.is_sample ? "Sample · not verified · " : ""}View details →</p>
    </div>
  </Link>
);

const Bubble = ({ m }) => (
  <div className={`flex flex-col ${m.role === "user" ? "items-end" : "items-start"}`}>
    <div className={`max-w-[85%] px-4 py-2.5 text-sm leading-relaxed whitespace-pre-wrap rounded-2xl ${m.role === "user" ? "bg-[#D4AF37] text-[#0F0F12] rounded-br-sm" : "bg-[#242430] text-zinc-100 rounded-bl-sm"}`}>
      {m.content || <span className="flex gap-1"><span className="typing-dot">●</span><span className="typing-dot">●</span><span className="typing-dot">●</span></span>}
    </div>
    {m.matches?.length > 0 && (
      <div className="flex gap-2 overflow-x-auto thin-scroll mt-2 max-w-full pb-1">{m.matches.map((p) => <MiniCard key={p.id} p={p} />)}</div>
    )}
  </div>
);

export const ChatWidget = () => {
  const onProperty = useLocation().pathname.startsWith("/property/");
  const [showLabel, setShowLabel] = useState(true);
  useEffect(() => {
    // Label collapses to an icon after a few seconds, then reappears briefly every 30s
    let hide = setTimeout(() => setShowLabel(false), 5000);
    const tick = setInterval(() => {
      setShowLabel(true);
      hide = setTimeout(() => setShowLabel(false), 4000);
    }, 30000);
    return () => { clearTimeout(hide); clearInterval(tick); };
  }, []);
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([{ role: "assistant", content: GREETING }]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [leadSaved, setLeadSaved] = useState(false);
  const [configured, setConfigured] = useState(true);
  const sid = useRef(localStorage.getItem(SID_KEY));
  const endRef = useRef(null);

  useEffect(() => {
    fetch(`${API}/chat/status`).then((r) => r.json()).then((d) => setConfigured(d.configured)).catch(() => {});
  }, []);

  useEffect(() => {
    if (!sid.current) return;
    fetch(`${API}/chat/${sid.current}`).then((r) => (r.ok ? r.json() : null)).then((d) => {
      if (!d) return;
      setLeadSaved(d.lead_saved);
      setMessages(d.messages.map((m) => ({ role: m.role, content: m.content, matches: m.matches || [] })));
    }).catch(() => {});
  }, []);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, open]);

  const send = useCallback(async (text) => {
    const msg = (text || "").trim();
    if (!msg || busy) return;
    setBusy(true);
    setMessages((ms) => [...ms, { role: "user", content: msg }, { role: "assistant", content: "" }]);
    const patchLast = (fn) => setMessages((ms) => { const c = [...ms]; c[c.length - 1] = fn(c[c.length - 1]); return c; });
    try {
      const res = await fetch(`${API}/chat/stream`, { method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ session_id: sid.current, message: msg, source_page: window.location.pathname }) });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(typeof d.detail === "string" ? d.detail : "Sorry, I couldn't connect just now. Please try again in a moment.");
      }
      const reader = res.body.getReader();
      const dec = new TextDecoder();
      let buf = "";
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += dec.decode(value, { stream: true });
        const parts = buf.split("\n\n");
        buf = parts.pop();
        for (const part of parts) {
          if (!part.startsWith("data: ")) continue;
          const ev = JSON.parse(part.slice(6));
          if (ev.type === "meta") {
            sid.current = ev.session_id;
            localStorage.setItem(SID_KEY, ev.session_id);
            patchLast((m) => ({ ...m, matches: ev.matches }));
          } else if (ev.type === "delta") patchLast((m) => ({ ...m, content: m.content + ev.content }));
          else if (ev.type === "done") setLeadSaved(ev.lead_saved);
        }
      }
    } catch (err) {
      patchLast((m) => ({ ...m, content: err.message || "Sorry, I couldn't connect just now. Please try again in a moment." }));
    } finally {
      setBusy(false);
    }
  }, [busy]);

  useEffect(() => {
    const h = (e) => { setOpen(true); if (e.detail?.message) send(e.detail.message); };
    window.addEventListener("propmitra:chat", h);
    return () => window.removeEventListener("propmitra:chat", h);
  }, [send]);

  const reset = () => {
    localStorage.removeItem(SID_KEY);
    sid.current = null;
    setLeadSaved(false);
    setMessages([{ role: "assistant", content: GREETING }]);
  };

  return (
    <>
      {!open && (
        <button onClick={() => setOpen(true)} aria-label="Ask Estate Mitra" className={`group fixed ${onProperty ? "bottom-20" : "bottom-4"} lg:bottom-5 right-4 sm:right-5 z-50 btn-gold rounded-full px-[14px] sm:px-[18px] h-12 sm:h-14 flex items-center shadow-2xl font-medium`} data-testid="chat-open-button">
          <Sparkles className="w-5 h-5 shrink-0" />
          <span className={`hidden sm:inline-block overflow-hidden whitespace-nowrap transition-[max-width,opacity,margin] duration-500 group-hover:max-w-[160px] group-hover:opacity-100 group-hover:ml-2 ${showLabel ? "max-w-[160px] opacity-100 ml-2" : "max-w-0 opacity-0 ml-0"}`} data-testid="chat-open-label">Ask Estate Mitra</span>
        </button>
      )}
      {open && (
        <div className="fixed z-50 inset-0 sm:inset-auto sm:bottom-5 sm:right-5 sm:w-[400px] sm:h-[620px] sm:max-h-[85vh] bg-[#1A1A22] sm:border border-[#D4AF37]/30 sm:rounded-md flex flex-col shadow-2xl fade-up" data-testid="chat-panel">
          <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 bg-[#0F0F12]">
            <div className="flex items-center gap-3">
              <span className="w-9 h-9 rounded-full btn-gold flex items-center justify-center"><Sparkles className="w-4 h-4" /></span>
              <div>
                <p className="text-white font-serif">Estate Mitra</p>
                <p className="text-[11px] text-zinc-500">AI advisor · Faridabad Estates</p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button onClick={() => send("I'd like to talk to a human advisor, please.")} disabled={busy} className="text-[11px] text-[#F3E5AB] hover:text-white px-2 flex items-center gap-1" data-testid="chat-handoff-button"><Headset className="w-3.5 h-3.5" />Human</button>
              <button onClick={reset} className="text-[11px] text-zinc-500 hover:text-white px-2" data-testid="chat-new-button">New chat</button>
              <button onClick={() => setOpen(false)} className="text-zinc-400 hover:text-white p-1" data-testid="chat-close-button" aria-label="Close chat"><X className="w-5 h-5" /></button>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto thin-scroll p-4 space-y-4" data-testid="chat-messages">
            {messages.map((m, i) => <Bubble key={i} m={m} />)}
            {!configured && <p className="text-center text-xs text-red-300 bg-red-500/10 rounded-sm p-3" data-testid="chat-not-configured">Estate Mitra isn't configured yet (AI key missing on the server). Please call or WhatsApp Faridabad Estates directly.</p>}
            {messages.length === 1 && configured && (
              <div className="flex gap-2 flex-wrap">
                {[["buy", "Buy", "I want to buy a property"], ["rent", "Rent", "I want to rent a property"], ["sell", "Sell", "I want to sell my property"],
                  ["eg1", "3 BHK in Sector 15 under ₹1.5 Cr", "Find me a 3 BHK in Sector 15 under ₹1.5 crore."],
                  ["eg2", "Rental near Sector 10", "I need a rental near Sector 10 under ₹25,000."]].map(([k, t, m]) => (
                  <button key={k} onClick={() => send(m)} data-testid={`chat-quick-${k}`}
                    className="px-4 py-1.5 rounded-full border border-[#D4AF37]/50 text-[#F3E5AB] text-sm hover:bg-[#D4AF37]/10">{t}</button>
                ))}
              </div>
            )}
            {leadSaved && <p className="text-center text-[11px] text-emerald-400" data-testid="chat-lead-saved">Your enquiry is saved — an advisor will call you.</p>}
            <div ref={endRef} />
          </div>
          <form onSubmit={(e) => { e.preventDefault(); send(input); setInput(""); }} className="p-3 border-t border-white/10 flex gap-2">
            <input value={input} onChange={(e) => setInput(e.target.value)} maxLength={1500} placeholder="Type your message…"
              className="flex-1 bg-white/5 border border-white/10 rounded-full px-4 text-sm text-white h-11 outline-none focus:border-[#D4AF37]/60" data-testid="chat-input" />
            <button disabled={busy || !input.trim()} className="btn-gold w-11 h-11 rounded-full flex items-center justify-center disabled:opacity-50" data-testid="chat-send-button" aria-label="Send">
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      )}
    </>
  );
};
