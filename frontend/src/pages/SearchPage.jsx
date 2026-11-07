import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { LayoutGrid, List, Map as MapIcon, SlidersHorizontal, Search, X, Sparkles } from "lucide-react";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { api, formatApiError, formatPrice, openChat, PROPERTY_TYPES } from "@/lib/api";
import { useLocalList, KEYS } from "@/lib/local";
import { ListingCard } from "@/components/site/ListingCard";
import { PropertyMap } from "@/components/site/PropertyMap";
import { Seo } from "@/components/site/Seo";

const PRICES = { buy: [2500000, 5000000, 7500000, 10000000, 15000000, 20000000, 30000000, 50000000], rent: [10000, 20000, 30000, 40000, 50000, 75000, 100000] };
const AREAS = [500, 1000, 1500, 2000, 3000, 5000];
const FILTER_KEYS = ["q", "min_price", "max_price", "property_type", "bedrooms", "bathrooms", "min_area", "max_area", "furnishing", "possession"];

const Sel = ({ label, value, onChange, options, testid }) => (
  <label className="block">
    <span className="text-[11px] uppercase tracking-[0.14em] text-[#8a8579]">{label}</span>
    <select value={value || ""} onChange={(e) => onChange(e.target.value)} data-testid={testid}
      className="mt-1 w-full h-11 rounded-md border border-[#DDD7CB] bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-[#c9a54c]">
      {options.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
    </select>
  </label>
);

const Filters = ({ get, set, lt }) => {
  const priceOpts = (any) => [["", any], ...PRICES[lt].map((v) => [String(v), formatPrice(v, lt)])];
  return (
    <div className="grid grid-cols-2 gap-4">
      <Sel label="Min price" value={get("min_price")} onChange={(v) => set("min_price", v)} options={priceOpts("No min")} testid="filter-min-price" />
      <Sel label="Max price" value={get("max_price")} onChange={(v) => set("max_price", v)} options={priceOpts("No max")} testid="filter-max-price" />
      <Sel label="Property type" value={get("property_type")} onChange={(v) => set("property_type", v)} options={[["", "Any type"], ...PROPERTY_TYPES.map((t) => [t, t])]} testid="filter-property-type" />
      <Sel label="Bedrooms" value={get("bedrooms")} onChange={(v) => set("bedrooms", v)} options={[["", "Any"], ["1", "1 BHK"], ["2", "2 BHK"], ["3", "3 BHK"], ["4", "4+ BHK"]]} testid="filter-bedrooms" />
      <Sel label="Bathrooms" value={get("bathrooms")} onChange={(v) => set("bathrooms", v)} options={[["", "Any"], ["1", "1+"], ["2", "2+"], ["3", "3+"], ["4", "4+"]]} testid="filter-bathrooms" />
      <Sel label="Furnishing" value={get("furnishing")} onChange={(v) => set("furnishing", v)} options={[["", "Any"], ["Unfurnished", "Unfurnished"], ["Semi-furnished", "Semi-furnished"], ["Fully furnished", "Fully furnished"]]} testid="filter-furnishing" />
      <Sel label="Min area" value={get("min_area")} onChange={(v) => set("min_area", v)} options={[["", "No min"], ...AREAS.map((a) => [String(a), `${a} sq.ft`])]} testid="filter-min-area" />
      <Sel label="Max area" value={get("max_area")} onChange={(v) => set("max_area", v)} options={[["", "No max"], ...AREAS.map((a) => [String(a), `${a} sq.ft`])]} testid="filter-max-area" />
      <div className="col-span-2"><Sel label="Possession" value={get("possession")} onChange={(v) => set("possession", v)} options={[["", "Any"], ["Ready to move", "Ready to move"], ["Under construction", "Under construction"]]} testid="filter-possession" /></div>
    </div>
  );
};

export default function SearchPage() {
  const [sp, setSp] = useSearchParams();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(null);
  const [recent, setRecent] = useState([]);
  const [q, setQ] = useState(sp.get("q") || "");
  const recentIds = useLocalList(KEYS.recent);
  const [meta, setMeta] = useState({ suggestions: [], center: null });
  useEffect(() => { api.get("/search-meta").then((r) => setMeta(r.data)).catch(() => {}); }, []);
  const lt = sp.get("listing_type") || "buy";
  const view = sp.get("view") || "grid";
  const sort = sp.get("sort") || "relevance";
  const get = (k) => sp.get(k) || "";
  const set = useCallback((k, v) => setSp((p) => { const n = new URLSearchParams(p); if (v) n.set(k, v); else n.delete(k); if (k === "listing_type") { n.delete("min_price"); n.delete("max_price"); } return n; }, { replace: true }), [setSp]);
  const activeCount = FILTER_KEYS.filter((k) => k !== "q" && sp.get(k)).length;
  const params = useMemo(() => { const o = Object.fromEntries(sp.entries()); delete o.view; return { ...o, listing_type: lt }; }, [sp, lt]);

  useEffect(() => {
    setLoading(true); setError("");
    api.get("/properties", { params }).then((r) => setItems(r.data)).catch((e) => setError(formatApiError(e))).finally(() => setLoading(false));
  }, [params]);
  useEffect(() => {
    if (!recentIds.length) return setRecent([]);
    api.get("/properties", { params: { ids: recentIds.join(",") } }).then((r) => setRecent(recentIds.map((id) => r.data.find((p) => p.id === id)).filter(Boolean))).catch(() => {});
  }, [recentIds]);

  const clear = () => { setQ(""); setSp(new URLSearchParams({ listing_type: lt }), { replace: true }); };
  const submitQ = (e) => { e.preventDefault(); set("q", q.trim()); };
  const selectFromMap = (p) => { setActive(p.id); document.querySelector(`[data-testid="listing-card-${p.id}"]`)?.scrollIntoView({ behavior: "smooth", block: "center" }); };
  const title = `${lt === "rent" ? "Homes for rent" : "Homes for sale"} in Faridabad`;

  return (
    <div data-testid="search-page">
      <Seo title={`${title} | Faridabad Estates`} description={`Browse ${items.length} ${lt === "rent" ? "rental" : "sale"} listings across Faridabad with filters for price, BHK, area and possession.`} />
      <div className="sticky top-16 z-30 bg-[#FAF9F6]/95 backdrop-blur border-b border-[#E5E1D8]">
        <div className="max-w-7xl mx-auto px-4 sm:px-8 lg:px-12 py-3 flex flex-wrap items-center gap-2">
          <div className="flex bg-[#F0ECE3] rounded-full p-1" role="tablist">
            {["buy", "rent"].map((t) => <button key={t} role="tab" aria-selected={lt === t} onClick={() => set("listing_type", t)} className={`px-4 h-8 rounded-full text-sm capitalize ${lt === t ? "btn-dark" : "text-[#55524D]"}`} data-testid={`search-type-${t}`}>{t}</button>)}
          </div>
          <form onSubmit={submitQ} className="relative flex-1 min-w-[180px]">
            <label className="sr-only" htmlFor="kw">Search by locality, project or keyword</label>
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#8a8579]" />
            <input id="kw" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Sector, colony or keyword (e.g. Sector 15)" list="search-localities" className="w-full h-10 rounded-full border border-[#DDD7CB] bg-white pl-9 pr-3 text-sm outline-none focus:ring-2 focus:ring-[#c9a54c]" data-testid="search-keyword-input" />
            <datalist id="search-localities">{meta.suggestions.map((s) => <option key={s} value={s} />)}</datalist>
          </form>
          <button onClick={() => setOpen(true)} className="btn-line rounded-full h-10 px-4 text-sm flex items-center gap-2" data-testid="search-filters-button"><SlidersHorizontal className="w-4 h-4" />Filters{activeCount > 0 && <span className="w-5 h-5 rounded-full bg-[#c9a54c] text-[11px] font-semibold flex items-center justify-center">{activeCount}</span>}</button>
          <select aria-label="Sort" value={sort} onChange={(e) => set("sort", e.target.value === "relevance" ? "" : e.target.value)} className="h-10 rounded-full border border-[#DDD7CB] bg-white px-3 text-sm" data-testid="search-sort-select">
            <option value="relevance">Relevance</option><option value="price_asc">Price: low to high</option><option value="price_desc">Price: high to low</option><option value="newest">Newest</option>
          </select>
          <div className="flex border border-[#DDD7CB] rounded-full overflow-hidden" role="group" aria-label="View">
            {[["grid", LayoutGrid], ["list", List], ["map", MapIcon]].map(([v, Icon]) => (
              <button key={v} onClick={() => set("view", v === "grid" ? "" : v)} aria-label={`${v} view`} aria-pressed={view === v} className={`w-10 h-10 flex items-center justify-center ${view === v ? "bg-[#111114] text-white" : "bg-white"}`} data-testid={`view-${v}`}><Icon className="w-4 h-4" /></button>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-8 lg:px-12 py-8">
        <div className="flex flex-wrap items-baseline justify-between gap-2 mb-6">
          <div>
            <h1 className="font-serif text-3xl sm:text-4xl">{title}</h1>
            {sort === "relevance" && !sp.get("q") && meta.center && <p className="text-xs text-[#8a8579] mt-1" data-testid="search-center-note">Sorted by distance from {meta.center.name} · all of Faridabad searchable</p>}
          </div>
          <p className="text-sm text-[#55524D]" data-testid="results-count" aria-live="polite">{loading ? "Searching…" : `${items.length} ${items.length === 1 ? "property" : "properties"}`}{(activeCount > 0 || sp.get("q")) && <button onClick={clear} className="ml-3 underline" data-testid="clear-filters-button">Clear filters</button>}</p>
        </div>
        {error && <p className="text-red-600" role="alert" data-testid="search-error">{error}</p>}
        {!loading && !error && !items.length && (
          <div className="border border-dashed border-[#D8D2C4] rounded-xl p-10 text-center" data-testid="search-empty">
            <p className="font-serif text-2xl">No homes match these filters yet.</p>
            <p className="text-[#55524D] text-sm mt-2">Try widening your budget or area — or tell Estate Mitra exactly what you need and an advisor will call you.</p>
            <div className="flex flex-wrap gap-3 justify-center mt-6">
              <button onClick={clear} className="btn-line rounded-full h-11 px-5 text-sm">Clear filters</button>
              <button onClick={() => openChat()} className="btn-dark rounded-full h-11 px-5 text-sm flex items-center gap-2"><Sparkles className="w-4 h-4" />Ask Estate Mitra</button>
            </div>
          </div>
        )}
        {view === "map" && items.length > 0 ? (
          <div className="grid lg:grid-cols-[1fr_1.1fr] gap-6">
            <div className="lg:order-2 lg:sticky lg:top-36 h-[45vh] lg:h-[calc(100vh-10rem)] rounded-xl overflow-hidden border border-[#E5E1D8]">
              <PropertyMap items={items} activeId={active} onSelect={selectFromMap} className="w-full h-full" />
            </div>
            <div className="space-y-5">{items.map((p) => <ListingCard key={p.id} p={p} layout="list" active={active === p.id} onHover={setActive} />)}</div>
          </div>
        ) : (
          <div className={view === "list" ? "space-y-5" : "grid md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8"}>
            {items.map((p) => <ListingCard key={p.id} p={p} layout={view} />)}
          </div>
        )}
        {recent.length > 0 && (
          <section className="mt-16" data-testid="recently-viewed">
            <p className="eyebrow">Recently viewed</p>
            <div className="flex gap-5 overflow-x-auto no-scrollbar mt-4 pb-2">{recent.map((p) => <div key={p.id} className="w-72 shrink-0"><ListingCard p={p} /></div>)}</div>
          </section>
        )}
      </div>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="right" className="bg-[#FAF9F6] w-full sm:max-w-md overflow-y-auto" data-testid="filters-sheet">
          <div className="flex items-center justify-between"><SheetTitle className="font-serif text-2xl">Filters</SheetTitle></div>
          <div className="mt-6"><Filters get={get} set={set} lt={lt} /></div>
          <div className="flex gap-3 mt-8 sticky bottom-0 bg-[#FAF9F6] py-4">
            <button onClick={clear} className="btn-line rounded-full h-11 px-5 text-sm flex items-center gap-1" data-testid="filters-clear"><X className="w-4 h-4" />Clear</button>
            <button onClick={() => setOpen(false)} className="btn-dark rounded-full h-11 flex-1 text-sm" data-testid="filters-apply">Show {items.length} {items.length === 1 ? "home" : "homes"}</button>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
