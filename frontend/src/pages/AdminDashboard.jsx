import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { LogOut, ExternalLink, Download } from "lucide-react";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { api, formatApiError } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { StatsOverview } from "@/components/admin/StatsOverview";
import { LeadsTable } from "@/components/admin/LeadsTable";
import { LeadDetail } from "@/components/admin/LeadDetail";
import { ListingsManager } from "@/components/admin/ListingsManager";

export default function AdminDashboard() {
  const { user, logout } = useAuth();
  const [stats, setStats] = useState(null);
  const [leads, setLeads] = useState([]);
  const [listings, setListings] = useState([]);
  const [filter, setFilter] = useState("All");
  const [q, setQ] = useState("");
  const [openLead, setOpenLead] = useState(null);

  const loadStats = useCallback(() => api.get("/admin/stats").then((r) => setStats(r.data)).catch((e) => toast.error(formatApiError(e))), []);
  const loadListings = useCallback(() => api.get("/admin/properties").then((r) => setListings(r.data)).catch((e) => toast.error(formatApiError(e))), []);
  const loadLeads = useCallback(() => {
    const params = {};
    if (filter !== "All") params.temperature = filter;
    if (q.trim()) params.q = q.trim();
    return api.get("/admin/leads", { params }).then((r) => setLeads(r.data)).catch((e) => toast.error(formatApiError(e)));
  }, [filter, q]);

  useEffect(() => { loadStats(); loadListings(); }, [loadStats, loadListings]);

  const exportCsv = async () => {
    try {
      const { data } = await api.get("/admin/export/leads.csv", { responseType: "blob" });
      const url = URL.createObjectURL(data);
      const a = Object.assign(document.createElement("a"), { href: url, download: `propmitra-enquiries-${new Date().toISOString().slice(0, 10)}.csv` });
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      toast.error(formatApiError(e));
    }
  };
  useEffect(() => { const t = setTimeout(loadLeads, 250); return () => clearTimeout(t); }, [loadLeads]);

  return (
    <div className="dark min-h-screen bg-[#0F0F12] text-white" data-testid="admin-dashboard">
      <header className="sticky top-0 z-40 backdrop-blur-md bg-[#0F0F12]/85 border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-12 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="w-9 h-9 rounded-sm border border-[#D4AF37]/60 flex items-center justify-center font-serif text-[#D4AF37]">U</span>
            <div><p className="font-serif">PropMitra Admin</p><p className="text-[11px] text-zinc-500">{user?.email}</p></div>
          </div>
          <div className="flex items-center gap-2">
            <Link to="/" className="text-sm text-zinc-400 hover:text-white flex items-center gap-1 px-2" data-testid="admin-view-site"><ExternalLink className="w-4 h-4" /><span className="hidden sm:inline">Website</span></Link>
            <button onClick={logout} className="text-sm text-zinc-400 hover:text-white flex items-center gap-1 px-2" data-testid="admin-logout-button"><LogOut className="w-4 h-4" /><span className="hidden sm:inline">Logout</span></button>
          </div>
        </div>
      </header>
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-12 py-8 sm:py-10">
        <div className="flex items-center justify-between gap-4">
          <h1 className="font-serif text-3xl sm:text-4xl">Dashboard</h1>
          <button onClick={exportCsv} className="text-sm border border-white/15 rounded-full px-4 py-2 flex items-center gap-2 hover:border-[#D4AF37]" data-testid="admin-export-csv"><Download className="w-4 h-4" />Export enquiries</button>
        </div>
        <Tabs defaultValue="overview" className="mt-6">
          <TabsList className="bg-[#1A1A22] border border-white/10">
            <TabsTrigger value="overview" data-testid="admin-tab-overview">Overview</TabsTrigger>
            <TabsTrigger value="leads" data-testid="admin-tab-leads">Leads</TabsTrigger>
            <TabsTrigger value="listings" data-testid="admin-tab-listings">Listings</TabsTrigger>
          </TabsList>
          <TabsContent value="overview" className="mt-6">
            <StatsOverview stats={stats} />
            <div className="mt-6"><LeadsTable leads={leads.slice(0, 5)} onOpen={setOpenLead} filter={filter} setFilter={setFilter} q={q} setQ={setQ} /></div>
          </TabsContent>
          <TabsContent value="leads" className="mt-6">
            <LeadsTable leads={leads} onOpen={setOpenLead} filter={filter} setFilter={setFilter} q={q} setQ={setQ} />
          </TabsContent>
          <TabsContent value="listings" className="mt-6">
            <ListingsManager listings={listings} reload={() => { loadListings(); loadStats(); }} />
          </TabsContent>
        </Tabs>
      </main>
      <LeadDetail id={openLead} onClose={() => setOpenLead(null)} onChanged={() => { loadLeads(); loadStats(); }} />
    </div>
  );
}
