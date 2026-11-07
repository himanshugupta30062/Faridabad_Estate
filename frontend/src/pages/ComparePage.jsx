import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { X } from "lucide-react";
import { api, formatPrice, imageSrc, configLabel } from "@/lib/api";
import { useLocalList, KEYS, toggleCompare } from "@/lib/local";
import { Seo } from "@/components/site/Seo";

const ROWS = [
  ["Price", (p) => formatPrice(p.price, p.listing_type)],
  ["Listing", (p) => (p.listing_type === "rent" ? "For rent" : "For sale")],
  ["Locality", (p) => p.location],
  ["Type", (p) => p.property_type],
  ["Configuration", (p) => configLabel(p)],
  ["Bathrooms", (p) => p.bathrooms],
  ["Area", (p) => `${p.area_sqft.toLocaleString("en-IN")} sq.ft`],
  ["Price / sq.ft", (p) => (p.listing_type === "buy" && p.property_type !== "Plot" ? `₹${Math.round(p.price / p.area_sqft).toLocaleString("en-IN")}` : "—")],
  ["Furnishing", (p) => p.furnishing || "Not specified"],
  ["Possession", (p) => p.possession || "Not specified"],
];

export default function ComparePage() {
  const ids = useLocalList(KEYS.compare);
  const [items, setItems] = useState([]);
  useEffect(() => {
    if (!ids.length) return setItems([]);
    api.get("/properties", { params: { ids: ids.join(",") } }).then((r) => setItems(ids.map((id) => r.data.find((p) => p.id === id)).filter(Boolean))).catch(() => {});
  }, [ids]);
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-8 lg:px-12 py-12" data-testid="compare-page">
      <Seo title="Compare properties | PropMitra" description="Compare up to three Faridabad properties side by side." />
      <h1 className="font-serif text-4xl">Compare homes</h1>
      {!items.length ? (
        <div className="border border-dashed border-[#D8D2C4] rounded-xl p-10 text-center mt-8" data-testid="compare-empty">
          <p className="font-serif text-2xl">Nothing to compare yet</p>
          <p className="text-[#55524D] text-sm mt-2">Use the compare icon on any property card to add up to three homes.</p>
          <Link to="/properties" className="btn-dark rounded-full h-11 px-6 inline-flex items-center mt-6">Browse properties</Link>
        </div>
      ) : (
        <div className="overflow-x-auto mt-8">
          <table className="w-full min-w-[640px] text-sm border-collapse">
            <thead><tr><th className="w-40" />{items.map((p) => (
              <th key={p.id} className="text-left align-top p-3 font-normal">
                <div className="relative">
                  <img src={imageSrc(p.image_url)} alt="" className="aspect-[4/3] w-full object-cover rounded-lg" />
                  <button onClick={() => toggleCompare(p.id)} aria-label="Remove" className="absolute top-2 right-2 w-8 h-8 rounded-full bg-white flex items-center justify-center" data-testid={`compare-remove-${p.id}`}><X className="w-4 h-4" /></button>
                </div>
                <Link to={`/property/${p.slug}`} className="block font-medium mt-3 hover:underline">{p.title}</Link>
              </th>))}</tr></thead>
            <tbody>{ROWS.map(([label, fn]) => (
              <tr key={label} className="border-t border-[#E5E1D8]"><td className="p-3 text-[#8a8579]">{label}</td>{items.map((p) => <td key={p.id} className="p-3">{fn(p)}</td>)}</tr>
            ))}</tbody>
          </table>
        </div>
      )}
    </div>
  );
}
