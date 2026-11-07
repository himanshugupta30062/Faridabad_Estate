import { useEffect, useState } from "react";

export const KEYS = { compare: "pm_compare", recent: "pm_recent" };
const read = (k) => {
  try {
    return JSON.parse(localStorage.getItem(k) || "[]");
  } catch {
    return [];
  }
};
const write = (k, v) => {
  localStorage.setItem(k, JSON.stringify(v));
  window.dispatchEvent(new Event("pm-store"));
};

export function useLocalList(key) {
  const [v, setV] = useState(() => read(key));
  useEffect(() => {
    const h = () => setV(read(key));
    window.addEventListener("pm-store", h);
    window.addEventListener("storage", h);
    return () => {
      window.removeEventListener("pm-store", h);
      window.removeEventListener("storage", h);
    };
  }, [key]);
  return v;
}

export function toggleCompare(id) {
  const l = read(KEYS.compare);
  if (l.includes(id)) return write(KEYS.compare, l.filter((x) => x !== id)) ?? "removed";
  if (l.length >= 3) return "full";
  write(KEYS.compare, [...l, id]);
  return "added";
}

export const clearCompare = () => write(KEYS.compare, []);
export const pushRecent = (id) => write(KEYS.recent, [id, ...read(KEYS.recent).filter((x) => x !== id)].slice(0, 8));
