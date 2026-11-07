import { Heart, Share2, GitCompare } from "lucide-react";
import { toast } from "sonner";
import { useFavourites } from "@/context/FavouritesContext";
import { toggleCompare, useLocalList, KEYS } from "@/lib/local";

const base = "flex items-center justify-center rounded-full transition-colors";

export const FavButton = ({ id, className = "", label = false }) => {
  const { ids, toggle } = useFavourites();
  const on = ids.includes(id);
  return (
    <button type="button" onClick={(e) => { e.preventDefault(); e.stopPropagation(); toggle(id); }} aria-pressed={on}
      aria-label={on ? "Remove from saved" : "Save property"} data-testid={`fav-button-${id}`}
      className={`${base} gap-2 ${className}`}>
      <Heart className={`w-4 h-4 ${on ? "fill-[#c9a54c] text-[#c9a54c]" : ""}`} />{label && <span className="text-sm">{on ? "Saved" : "Save"}</span>}
    </button>
  );
};

export const CompareButton = ({ id, className = "", label = false }) => {
  const list = useLocalList(KEYS.compare);
  const on = list.includes(id);
  const click = (e) => {
    e.preventDefault(); e.stopPropagation();
    const r = toggleCompare(id);
    if (r === "full") toast.error("You can compare up to 3 properties");
  };
  return (
    <button type="button" onClick={click} aria-pressed={on} aria-label={on ? "Remove from compare" : "Add to compare"}
      data-testid={`compare-button-${id}`} className={`${base} gap-2 ${on ? "text-[#8a6d24]" : ""} ${className}`}>
      <GitCompare className="w-4 h-4" />{label && <span className="text-sm">{on ? "Comparing" : "Compare"}</span>}
    </button>
  );
};

export async function shareProperty(p) {
  const url = `${window.location.origin}/property/${p.slug}`;
  try {
    if (navigator.share) await navigator.share({ title: p.title, text: `${p.title} — Faridabad Estates`, url });
    else {
      await navigator.clipboard.writeText(url);
      toast.success("Link copied to clipboard");
    }
  } catch (e) {
    if (e?.name !== "AbortError") toast.error("Couldn't share — copy the address bar link instead");
  }
}

export const ShareButton = ({ p, className = "", label = false }) => (
  <button type="button" onClick={(e) => { e.preventDefault(); e.stopPropagation(); shareProperty(p); }} aria-label="Share property"
    data-testid={`share-button-${p.id}`} className={`${base} gap-2 ${className}`}>
    <Share2 className="w-4 h-4" />{label && <span className="text-sm">Share</span>}
  </button>
);
