import re
from datetime import datetime, timezone
from statistics import mean
from typing import Literal, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from fastapi.responses import Response

from auth import get_current_user
from math import cos, radians

from catalog import NEIGHBOURHOODS, SEARCH_CENTER
from chat import public_property
from db import db

router = APIRouter(prefix="/api")
SORTS = {"price_asc": [("price", 1)], "price_desc": [("price", -1)], "newest": [("created_at", -1)],
         "relevance": [("order", 1), ("created_at", -1)]}


def _dist(d):
    if d.get("latitude") is None:
        return 999.0
    dy, dx = d["latitude"] - SEARCH_CENTER[0], (d["longitude"] - SEARCH_CENTER[1]) * cos(radians(SEARCH_CENTER[0]))
    return (dx * dx + dy * dy) ** 0.5


def _in(locs):
    return {"$in": locs}


@router.get("/search-meta")
async def search_meta():
    locs = await db.properties.distinct("location", {"is_active": True})
    areas = sorted({*locs, *[n["name"] for n in NEIGHBOURHOODS]})
    return {"center": {"name": "Sector 10, Faridabad", "lat": SEARCH_CENTER[0], "lng": SEARCH_CENTER[1]}, "suggestions": areas,
            "groups": [{"name": n["name"], "localities": n["localities"]} for n in NEIGHBOURHOODS]}


def _rx(s):
    return {"$regex": re.escape(s.strip()), "$options": "i"}


@router.get("/properties")
async def search(q: Optional[str] = Query(None, max_length=80), listing_type: Optional[Literal["buy", "rent"]] = None,
                 location: Optional[str] = None, min_price: Optional[float] = Query(None, ge=0),
                 max_price: Optional[float] = Query(None, ge=0), property_type: Optional[str] = None,
                 bedrooms: Optional[int] = Query(None, ge=1, le=10), bathrooms: Optional[int] = Query(None, ge=1, le=10),
                 min_area: Optional[int] = Query(None, ge=0), max_area: Optional[int] = Query(None, ge=0),
                 furnishing: Optional[str] = None, possession: Optional[str] = None,
                 sort: Literal["relevance", "price_asc", "price_desc", "newest"] = "relevance",
                 ids: Optional[str] = None, limit: int = Query(60, ge=1, le=200)):
    f = {"is_active": True}
    if ids:
        f["id"] = {"$in": [i for i in ids.split(",") if i][:10]}
    if listing_type:
        f["listing_type"] = listing_type
    if location:
        f["location"] = {"$regex": f"^{re.escape(location)}$", "$options": "i"}
    if property_type:
        f["property_type"] = property_type
    if bedrooms:
        f["bedrooms"] = {"$gte": 4} if bedrooms >= 4 else bedrooms
    if bathrooms:
        f["bathrooms"] = {"$gte": bathrooms}
    if furnishing:
        f["furnishing"] = furnishing
    if possession:
        f["possession"] = possession
    for key, lo, hi in [("price", min_price, max_price), ("area_sqft", min_area, max_area)]:
        if lo is not None or hi is not None:
            f[key] = {**({"$gte": lo} if lo is not None else {}), **({"$lte": hi} if hi is not None else {})}
    if q and q.strip():
        group = next((n for n in NEIGHBOURHOODS if n["name"].lower() == q.strip().lower()), None)
        f["$or"] = [{"location": _in(group["localities"])}] if group else [{k: _rx(q)} for k in ["title", "location", "description", "property_type"]]
    docs = await db.properties.find(f, {"_id": 0}).sort(SORTS[sort]).to_list(limit)
    if sort == "relevance":
        ql = (q or "").strip().lower()
        docs.sort(key=lambda d: (-(3 * (ql in d["location"].lower()) + 2 * (ql in d["title"].lower())) if ql else 0, _dist(d)))
    return [public_property(d) for d in docs]


@router.get("/locations")
async def locations():
    return sorted(await db.properties.distinct("location", {"is_active": True}))


@router.get("/properties/{key}")
async def get_property(key: str, track: bool = False):
    f = {"is_active": True, "$or": [{"slug": key}, {"id": key}]}
    d = await db.properties.find_one(f, {"_id": 0})
    if not d:
        raise HTTPException(status_code=404, detail="This property is not available or has been removed.")
    if track:
        await db.properties.update_one({"id": d["id"]}, {"$inc": {"views": 1}})
    return public_property(d)


@router.get("/properties/{pid}/similar")
async def similar(pid: str):
    p = await db.properties.find_one({"id": pid}, {"_id": 0})
    if not p:
        raise HTTPException(status_code=404, detail="Property not found")
    base = {"is_active": True, "listing_type": p["listing_type"], "id": {"$ne": pid}}
    near = {**base, "$or": [{"location": p["location"]}, {"property_type": p["property_type"]},
                            {"price": {"$gte": p["price"] * 0.6, "$lte": p["price"] * 1.4}}]}
    docs = await db.properties.find(near, {"_id": 0}).to_list(3)
    return [public_property(d) for d in docs]


def _insight(name, props):
    buys = [p for p in props if p["listing_type"] == "buy"]
    rents = [p for p in props if p["listing_type"] == "rent"]
    return {"location": name, "listings": len(props),
            "avg_price_per_sqft": round(mean(p["price"] / p["area_sqft"] for p in buys if p["property_type"] != "Plot")) if any(p["property_type"] != "Plot" for p in buys) else None,
            "min_buy_price": min((p["price"] for p in buys), default=None),
            "min_rent": min((p["price"] for p in rents), default=None),
            "types": sorted({p["property_type"] for p in props})}


@router.get("/insights")
async def insights():
    props = await db.properties.find({"is_active": True}, {"_id": 0}).to_list(1000)
    by = {}
    for p in props:
        by.setdefault(p["location"], []).append(p)
    rows = [_insight(k, v) for k, v in by.items()]
    return sorted(rows, key=lambda r: -r["listings"])


@router.get("/neighbourhoods")
async def neighbourhoods():
    props = await db.properties.find({"is_active": True}, {"_id": 0, "location": 1, "listing_type": 1, "price": 1,
                                                           "area_sqft": 1, "property_type": 1, "image_url": 1}).to_list(1000)
    out = []
    for n in NEIGHBOURHOODS:
        mine = [p for p in props if p["location"] in n["localities"]]
        out.append({**n, **_insight(n["name"], mine), "image_url": mine[0]["image_url"] if mine else None})
    return out


@router.get("/neighbourhoods/{slug}")
async def neighbourhood(slug: str):
    n = next((x for x in NEIGHBOURHOODS if x["slug"] == slug), None)
    if not n:
        raise HTTPException(status_code=404, detail="Neighbourhood not found")
    props = await db.properties.find({"is_active": True, "location": _in(n["localities"])}, {"_id": 0}).to_list(100)
    return {**n, **_insight(n["name"], props), "properties": [public_property(p) for p in props]}


@router.get("/me/favourites")
async def my_favourites(user=Depends(get_current_user)):
    favs = await db.favourites.find({"user_id": user["user_id"]}, {"_id": 0}).sort("created_at", -1).to_list(200)
    ids = [f["property_id"] for f in favs]
    props = {p["id"]: p for p in await db.properties.find({"id": {"$in": ids}}, {"_id": 0}).to_list(200)}
    return {"ids": ids, "properties": [{**public_property(props[i]), "is_active": props[i].get("is_active")} for i in ids if i in props]}


@router.post("/me/favourites/{pid}")
async def add_favourite(pid: str, user=Depends(get_current_user)):
    if not await db.properties.find_one({"id": pid, "is_active": True}):
        raise HTTPException(status_code=404, detail="Property not found")
    await db.favourites.update_one({"user_id": user["user_id"], "property_id": pid},
                                   {"$setOnInsert": {"created_at": datetime.now(timezone.utc).isoformat()}}, upsert=True)
    return {"ok": True}


@router.delete("/me/favourites/{pid}")
async def remove_favourite(pid: str, user=Depends(get_current_user)):
    await db.favourites.delete_one({"user_id": user["user_id"], "property_id": pid})
    return {"ok": True}


@router.get("/sitemap.xml")
async def sitemap(request: Request):
    host = request.headers.get("x-forwarded-host") or request.headers.get("host")
    base = f"https://{host}"
    urls = ["/", "/properties", "/compare"] + [f"/neighbourhoods/{n['slug']}" for n in NEIGHBOURHOODS]
    async for p in db.properties.find({"is_active": True}, {"_id": 0, "slug": 1}):
        urls.append(f"/property/{p['slug']}")
    body = "".join(f"<url><loc>{base}{u}</loc></url>" for u in urls)
    xml = f'<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">{body}</urlset>'
    return Response(content=xml, media_type="application/xml")
