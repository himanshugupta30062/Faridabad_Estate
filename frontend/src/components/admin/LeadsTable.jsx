import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { TempBadge, requirementText, fmtDate } from "./leadUtils";

const FILTERS = ["All", "Hot", "Warm", "Cold"];

export const LeadsTable = ({ leads, onOpen, filter, setFilter, q, setQ }) => (
  <div className="bg-[#1A1A22] border border-white/10 rounded-md" data-testid="leads-table">
    <div className="p-4 sm:p-5 flex flex-col sm:flex-row gap-3 justify-between border-b border-white/10">
      <div className="flex gap-2">
        {FILTERS.map((f) => (
          <button key={f} onClick={() => setFilter(f)} data-testid={`leads-filter-${f.toLowerCase()}`}
            className={`px-4 py-1.5 rounded-full text-xs ${filter === f ? "btn-gold" : "bg-white/5 text-zinc-300"}`}>{f}</button>
        ))}
      </div>
      <div className="relative sm:w-64">
        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name, phone, location" className="pl-9 bg-white/5 border-white/10 h-9 text-white" data-testid="leads-search-input" />
      </div>
    </div>
    <div className="overflow-x-auto thin-scroll">
      <table className="w-full text-sm min-w-[820px]">
        <thead>
          <tr className="text-left text-[10px] uppercase tracking-[0.15em] text-zinc-500">
            {["Name", "Phone", "Intent", "Requirement", "Budget", "Location", "Lead", "Date"].map((h) => <th key={h} className="px-5 py-3 font-medium">{h}</th>)}
          </tr>
        </thead>
        <tbody>
          {leads.map((l) => (
            <tr key={l.id} onClick={() => onOpen(l.id)} className="border-t border-white/5 hover:bg-white/[0.03] cursor-pointer" data-testid={`lead-row-${l.id}`}>
              <td className="px-5 py-3.5 text-white">{l.name}</td>
              <td className="px-5 py-3.5 text-zinc-300">{l.phone}</td>
              <td className="px-5 py-3.5 capitalize text-[#D4AF37]">{l.intent}</td>
              <td className="px-5 py-3.5 text-zinc-300">{requirementText(l)}</td>
              <td className="px-5 py-3.5 text-zinc-300">{l.budget_label || "—"}</td>
              <td className="px-5 py-3.5 text-zinc-300">{l.location || "—"}</td>
              <td className="px-5 py-3.5"><TempBadge t={l.temperature} /></td>
              <td className="px-5 py-3.5 text-zinc-500 whitespace-nowrap">{fmtDate(l.created_at)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {!leads.length && <p className="text-center text-zinc-500 py-12" data-testid="leads-empty">No enquiries yet.</p>}
    </div>
  </div>
);
