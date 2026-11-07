import { Search, RotateCcw } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BUDGETS, PROPERTY_TYPES } from "@/lib/api";

const Field = ({ label, children }) => (
  <div className="flex-1 min-w-0">
    <p className="text-[10px] uppercase tracking-[0.2em] text-zinc-500 mb-1.5">{label}</p>
    {children}
  </div>
);

const Pick = ({ value, onChange, placeholder, options, testid }) => (
  <Select value={value || "any"} onValueChange={(v) => onChange(v === "any" ? "" : v)}>
    <SelectTrigger className="bg-white/5 border-white/10 text-white h-11 rounded-sm" data-testid={testid}>
      <SelectValue placeholder={placeholder} />
    </SelectTrigger>
    <SelectContent>
      <SelectItem value="any">{placeholder}</SelectItem>
      {options.map((o) => (
        <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
      ))}
    </SelectContent>
  </Select>
);

export const SearchFilters = ({ filters, setFilters, locations, onSearch, onReset }) => {
  const set = (k) => (v) => setFilters((f) => ({ ...f, [k]: v, ...(k === "listing_type" ? { budget: "" } : {}) }));
  return (
    <div className="bg-[#1A1A22]/90 backdrop-blur-xl border border-white/10 rounded-md p-4 sm:p-6 shadow-2xl" data-testid="search-filters">
      <div className="flex gap-2 mb-5">
        {["buy", "rent"].map((t) => (
          <button
            key={t}
            onClick={() => set("listing_type")(t)}
            className={`px-6 py-2 rounded-full text-sm font-medium transition-colors ${filters.listing_type === t ? "btn-gold" : "bg-white/5 text-zinc-300 hover:bg-white/10"}`}
            data-testid={`filter-type-${t}`}
          >
            {t === "buy" ? "Buy" : "Rent"}
          </button>
        ))}
      </div>
      <div className="grid grid-cols-2 lg:flex gap-3 lg:gap-4 items-end">
        <Field label="Location">
          <Pick value={filters.location} onChange={set("location")} placeholder="All locations" testid="filter-location"
            options={locations.map((l) => ({ value: l, label: l }))} />
        </Field>
        <Field label="Budget">
          <Pick value={filters.budget} onChange={set("budget")} placeholder="Any budget" testid="filter-budget"
            options={BUDGETS[filters.listing_type]} />
        </Field>
        <Field label="Property type">
          <Pick value={filters.property_type} onChange={set("property_type")} placeholder="Any type" testid="filter-property-type"
            options={PROPERTY_TYPES.map((t) => ({ value: t, label: t }))} />
        </Field>
        <Field label="Bedrooms">
          <Pick value={filters.bedrooms} onChange={set("bedrooms")} placeholder="Any BHK" testid="filter-bedrooms"
            options={[1, 2, 3, 4].map((b) => ({ value: String(b), label: b === 4 ? "4+ BHK" : `${b} BHK` }))} />
        </Field>
        <div className="col-span-2 lg:col-span-1 flex gap-2">
          <button onClick={onSearch} className="btn-gold flex-1 lg:flex-none h-11 px-6 rounded-sm font-medium flex items-center justify-center gap-2" data-testid="filter-search-button">
            <Search className="w-4 h-4" /> Search
          </button>
          <button onClick={onReset} className="h-11 w-11 rounded-sm border border-white/10 text-zinc-400 hover:text-white flex items-center justify-center" data-testid="filter-reset-button" aria-label="Reset filters">
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
