import { Bar, BarChart, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

const TEMP_COLORS = { Hot: "#EF4444", Warm: "#F59E0B", Cold: "#3B82F6" };
const INTENT_COLORS = { buy: "#D4AF37", rent: "#F3E5AB", sell: "#8A7322" };
const tooltipStyle = { background: "#1A1A22", border: "1px solid rgba(255,255,255,0.1)", color: "#fff", fontSize: 12 };

const Stat = ({ label, value, sub, testid }) => (
  <div className="bg-[#1A1A22] border border-white/10 rounded-md p-5 sm:p-6" data-testid={testid}>
    <p className="text-[10px] uppercase tracking-[0.2em] text-zinc-500">{label}</p>
    <p className="font-serif text-3xl sm:text-4xl text-white mt-2">{value}</p>
    {sub && <p className="text-xs text-zinc-500 mt-1">{sub}</p>}
  </div>
);

const Panel = ({ title, children, testid }) => (
  <div className="bg-[#1A1A22] border border-white/10 rounded-md p-5 sm:p-6" data-testid={testid}>
    <p className="text-sm text-white font-medium mb-4">{title}</p>
    {children}
  </div>
);

const Split = ({ data, colors, labels }) => (
  <div className="space-y-3">
    {Object.entries(data).map(([k, v]) => {
      const total = Object.values(data).reduce((a, b) => a + b, 0) || 1;
      return (
        <div key={k} data-testid={`split-${k.toLowerCase()}`}>
          <div className="flex justify-between text-sm"><span className="text-zinc-300">{labels?.[k] || k}</span><span className="text-white">{v}</span></div>
          <div className="h-1.5 bg-white/5 rounded-full mt-1.5"><div className="h-full rounded-full" style={{ width: `${(v / total) * 100}%`, background: colors[k] }} /></div>
        </div>
      );
    })}
  </div>
);

export const StatsOverview = ({ stats }) => {
  if (!stats) return <p className="text-zinc-500">Loading stats…</p>;
  const pie = Object.entries(stats.temperature).map(([name, value]) => ({ name, value })).filter((d) => d.value);
  return (
    <div className="space-y-6" data-testid="stats-overview">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        <Stat label="Total enquiries" value={stats.total} testid="stat-total" />
        <Stat label="Hot leads" value={stats.temperature.Hot} sub="Ready to act" testid="stat-hot" />
        <Stat label="Top location" value={stats.top_locations[0]?.location || "—"} sub={stats.top_locations[0] ? `${stats.top_locations[0].count} enquiries` : ""} testid="stat-top-location" />
        <Stat label="Active listings" value={stats.active_listings} testid="stat-active-listings" />
      </div>
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
        <Panel title="Buy / Rent / Sell" testid="panel-intent">
          <Split data={stats.intent} colors={INTENT_COLORS} labels={{ buy: "Buy", rent: "Rent", sell: "Sell" }} />
        </Panel>
        <Panel title="Lead temperature" testid="panel-temperature">
          <div className="flex items-center gap-4">
            <div className="w-28 h-28 shrink-0">
              <ResponsiveContainer>
                <PieChart><Pie data={pie} dataKey="value" innerRadius={30} outerRadius={50} stroke="none">
                  {pie.map((d) => <Cell key={d.name} fill={TEMP_COLORS[d.name]} />)}
                </Pie><Tooltip contentStyle={tooltipStyle} /></PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex-1"><Split data={stats.temperature} colors={TEMP_COLORS} /></div>
          </div>
        </Panel>
        <Panel title="Most requested locations" testid="panel-locations">
          {stats.top_locations.length ? (
            <div className="h-44"><ResponsiveContainer>
              <BarChart data={stats.top_locations} layout="vertical" margin={{ left: 10 }}>
                <XAxis type="number" hide allowDecimals={false} />
                <YAxis type="category" dataKey="location" width={110} tick={{ fill: "#A1A1AA", fontSize: 12 }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "rgba(255,255,255,0.03)" }} />
                <Bar dataKey="count" fill="#D4AF37" radius={[0, 3, 3, 0]} barSize={14} />
              </BarChart>
            </ResponsiveContainer></div>
          ) : <p className="text-zinc-500 text-sm">No data yet</p>}
        </Panel>
      </div>
      <Panel title="Budget distribution" testid="panel-budget">
        {stats.budget_distribution.length ? (
          <div className="h-56"><ResponsiveContainer>
            <BarChart data={stats.budget_distribution}>
              <XAxis dataKey="bucket" tick={{ fill: "#A1A1AA", fontSize: 11 }} axisLine={false} tickLine={false} interval={0} />
              <YAxis allowDecimals={false} tick={{ fill: "#71717A", fontSize: 11 }} axisLine={false} tickLine={false} width={30} />
              <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "rgba(255,255,255,0.03)" }} />
              <Bar dataKey="count" fill="#D4AF37" radius={[3, 3, 0, 0]} barSize={36} />
            </BarChart>
          </ResponsiveContainer></div>
        ) : <p className="text-zinc-500 text-sm">No data yet</p>}
      </Panel>
      <div className="grid lg:grid-cols-3 gap-4 sm:gap-6">
        <Panel title="Lead sources" testid="panel-sources">
          <Split data={Object.fromEntries(stats.sources.map((s) => [s.source, s.count]))} colors={Object.fromEntries(stats.sources.map((s, i) => [s.source, ["#D4AF37", "#F3E5AB", "#8A7322", "#A1A1AA"][i % 4]]))} />
        </Panel>
        <Panel title="Recent enquiries" testid="panel-recent">
          <ul className="space-y-3 text-sm">{stats.recent.map((r) => (
            <li key={r.id} className="flex justify-between gap-2"><span className="text-white truncate">{r.name} <span className="text-zinc-500 capitalize">· {r.intent} · {r.location || "—"}</span></span><span className="text-xs text-zinc-400 shrink-0">{r.temperature}</span></li>
          ))}{!stats.recent.length && <li className="text-zinc-500">No enquiries yet</li>}</ul>
        </Panel>
        <Panel title="Lead status" testid="panel-status">
          <Split data={stats.status} colors={new Proxy({}, { get: () => "#D4AF37" })} />
        </Panel>
      </div>
      <Panel title="Property performance" testid="panel-property-performance">
        <div className="overflow-x-auto"><table className="w-full text-sm min-w-[520px]">
          <thead><tr className="text-left text-[10px] uppercase tracking-[0.15em] text-zinc-500">{["Property", "Location", "Views", "Saves", "Enquiries"].map((h) => <th key={h} className="py-2 pr-4 font-medium">{h}</th>)}</tr></thead>
          <tbody>{stats.property_performance.map((p) => (
            <tr key={p.id} className="border-t border-white/5"><td className="py-2.5 pr-4 text-white">{p.title}{!p.is_active && <span className="text-xs text-red-400"> · inactive</span>}</td><td className="pr-4 text-zinc-400">{p.location}</td><td className="pr-4 text-zinc-300">{p.views}</td><td className="pr-4 text-zinc-300">{p.saves}</td><td className="text-[#D4AF37]">{p.enquiries}</td></tr>
          ))}</tbody>
        </table></div>
      </Panel>
    </div>
  );
};
