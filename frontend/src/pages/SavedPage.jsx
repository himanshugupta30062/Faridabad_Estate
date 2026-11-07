import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Heart } from "lucide-react";
import { api } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { useFavourites } from "@/context/FavouritesContext";
import { ListingCard } from "@/components/site/ListingCard";
import { Seo } from "@/components/site/Seo";

export default function SavedPage() {
  const { user } = useAuth();
  const { ids } = useFavourites();
  const [items, setItems] = useState(null);
  useEffect(() => { if (user) api.get("/me/favourites").then((r) => setItems(r.data.properties)).catch(() => setItems([])); }, [user, ids]);
  if (user === false) return (
    <div className="max-w-7xl mx-auto px-4 sm:px-8 lg:px-12 py-12" data-testid="saved-page-guest">
      <Seo title="Saved homes | Faridabad Estates" description="Your saved Faridabad properties." />
      <h1 className="font-serif text-4xl">Saved homes</h1>
      <div className="border border-dashed border-[#D8D2C4] rounded-xl p-10 text-center mt-8">
        <Heart className="w-8 h-8 mx-auto text-[#c9a54c]" />
        <p className="font-serif text-2xl mt-3">Keep your shortlist in one place</p>
        <p className="text-sm text-[#55524D] mt-2">Sign in or create a free account to save homes and see them on any device.</p>
        <div className="flex flex-wrap gap-3 justify-center mt-6">
          <Link to="/login?next=/saved" className="btn-dark rounded-full h-11 px-6 inline-flex items-center" data-testid="saved-guest-login">Sign in</Link>
          <Link to="/register?next=/saved" className="btn-line rounded-full h-11 px-6 inline-flex items-center" data-testid="saved-guest-register">Create account</Link>
          <Link to="/properties" className="rounded-full h-11 px-6 inline-flex items-center text-sm underline" data-testid="saved-guest-browse">Browse properties</Link>
        </div>
      </div>
    </div>
  );
  const active = (items || []).filter((p) => p.is_active && ids.includes(p.id));
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-8 lg:px-12 py-12" data-testid="saved-page">
      <Seo title="Saved homes | Faridabad Estates" description="Your saved Faridabad properties." />
      <h1 className="font-serif text-4xl">Saved homes</h1>
      {items === null ? <p className="text-[#55524D] mt-6">Loading…</p> : active.length ? (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mt-8">{active.map((p) => <ListingCard key={p.id} p={p} />)}</div>
      ) : (
        <div className="border border-dashed border-[#D8D2C4] rounded-xl p-10 text-center mt-8" data-testid="saved-empty">
          <p className="font-serif text-2xl">No saved homes yet</p><p className="text-sm text-[#55524D] mt-2">Tap the heart on any property to keep it here.</p>
          <Link to="/properties" className="btn-dark rounded-full h-11 px-6 inline-flex items-center mt-6">Browse properties</Link>
        </div>
      )}
    </div>
  );
}
