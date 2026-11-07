import axios from "axios";

export const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
export const API = `${BACKEND_URL}/api`;

export const api = axios.create({ baseURL: API, withCredentials: true });

let refreshing = null;
api.interceptors.response.use(
  (r) => r,
  async (error) => {
    const cfg = error.config;
    const url = cfg?.url || "";
    if (error.response?.status === 401 && !cfg._retry && !url.includes("/auth/")) {
      cfg._retry = true;
      try {
        refreshing = refreshing || api.post("/auth/refresh");
        await refreshing;
        refreshing = null;
        return api(cfg);
      } catch (e) {
        refreshing = null;
      }
    }
    return Promise.reject(error);
  }
);

export function formatApiError(err) {
  const detail = err?.response?.data?.detail;
  if (detail == null) return err?.message || "Something went wrong. Please try again.";
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail))
    return detail.map((e) => (e && typeof e.msg === "string" ? e.msg.replace(/^Value error, /, "") : JSON.stringify(e))).join(" ");
  if (typeof detail.msg === "string") return detail.msg;
  return String(detail);
}

export function formatPrice(price, listingType) {
  if (price == null) return "";
  const p = Number(price);
  if (listingType === "rent") return `₹${p.toLocaleString("en-IN")}/month`;
  if (p >= 10000000) return `₹${+(p / 10000000).toFixed(2)} Cr`;
  return `₹${+(p / 100000).toFixed(2)} Lakh`;
}

export function imageSrc(url) {
  if (!url) return "";
  return url.startsWith("/api/") ? `${BACKEND_URL}${url}` : url;
}

export const BUDGETS = {
  buy: [
    { value: "0-10000000", label: "Under ₹1 Cr" },
    { value: "10000000-20000000", label: "₹1 Cr – ₹2 Cr" },
    { value: "20000000-30000000", label: "₹2 Cr – ₹3 Cr" },
    { value: "30000000-", label: "Above ₹3 Cr" },
  ],
  rent: [
    { value: "0-30000", label: "Under ₹30,000/mo" },
    { value: "30000-50000", label: "₹30,000 – ₹50,000/mo" },
    { value: "50000-", label: "Above ₹50,000/mo" },
  ],
};

export const PROPERTY_TYPES = ["Apartment", "Builder Floor", "Independent House", "Villa", "Plot"];
export const configLabel = (p) => (p.property_type === "Plot" || !p.bedrooms ? "Plot" : `${p.bedrooms} BHK`);

export function openChat(message) {
  window.dispatchEvent(new CustomEvent("propmitra:chat", { detail: { message } }));
}
