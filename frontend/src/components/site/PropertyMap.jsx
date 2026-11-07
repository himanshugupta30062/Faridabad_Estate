import { useEffect, useMemo } from "react";
import { MapContainer, TileLayer, Marker, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { formatPrice } from "@/lib/api";

const shortPrice = (p) => formatPrice(p.price, p.listing_type).replace("/month", "/mo");

const Fit = ({ points }) => {
  const map = useMap();
  useEffect(() => {
    if (points.length === 1) map.setView(points[0], 14);
    else if (points.length > 1) map.fitBounds(points, { padding: [40, 40], maxZoom: 14 });
  }, [map, points]);
  return null;
};

export const PropertyMap = ({ items, activeId, onSelect, className = "", single = false }) => {
  const located = items.filter((p) => p.latitude != null && p.longitude != null);
  const points = useMemo(() => located.map((p) => [p.latitude, p.longitude]), [located.map((p) => p.id).join()]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!located.length)
    return <div className={`flex items-center justify-center bg-[#F4F1EA] text-sm text-[#55524D] ${className}`} data-testid="map-empty">No mappable locations for these results.</div>;
  return (
    <MapContainer center={points[0]} zoom={12} scrollWheelZoom={!single} className={className} data-testid="property-map">
      <TileLayer attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
      <Fit points={points} />
      {located.map((p) => (
        <Marker key={p.id} position={[p.latitude, p.longitude]} eventHandlers={{ click: () => onSelect?.(p) }}
          zIndexOffset={p.id === activeId ? 1000 : 0}
          icon={L.divIcon({ className: "", html: `<span class="price-pin ${p.id === activeId ? "active" : ""}">${single ? "Approx. location" : shortPrice(p)}</span>`, iconSize: [0, 0] })} />
      ))}
    </MapContainer>
  );
};
