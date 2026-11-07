import re

from db import db

U = "https://images.unsplash.com/photo-"
Q = "?crop=entropy&cs=srgb&fm=jpg&w=1400&q=75"


def img(i):
    return f"{U}{i}{Q}"


# Demo-only extras for the 8 sample listings: gallery, furnishing and approximate locality coordinates
SAMPLE_EXTRAS = {
    "Skyline Residency 2 BHK": (["1650363700594-8e149ed80eec", "1628592102751-ba83b0314276", "1702295297205-700e205030d0", "1600489000022-c2086d79f9d4"], "Unfurnished", 17.4401, 78.3489),
    "Kondapur Greens 3 BHK": (["1624204386084-dd8c05e32226", "1738168246881-40f35f8aba0a", "1642541070065-3912f347e7c6", "1725257928373-dc6d2ac7b145"], "Unfurnished", 17.4600, 78.3570),
    "Kokapet Heights 3 BHK": (["1783696147892-eec669309ca2", "1738168279272-c08d6dd22002", "1757344454333-cc666252e596", "1502005097973-6a7082348e28"], "Unfurnished", 17.3950, 78.3330),
    "Tellapur Garden Villa": (["1688653802629-5360086bf632", "1635108201018-94bbbfac4a79", "1613575831056-0acd5da8f085", "1720420021124-4e18564e070f"], "Unfurnished", 17.4630, 78.2850),
    "Madhapur Urban 2 BHK Rental": (["1551361415-69c87624334f", "1758448511320-05d7d28f4298", "1696762932825-2737db830bbe"], "Semi-furnished", 17.4483, 78.3915),
    "FinDistrict Elite 3 BHK Rental": (["1527465094057-db061fdbfaf7", "1779903726439-5c27e3996c8a", "1642541070065-3912f347e7c6", "1610177534644-34d881503b83"], "Semi-furnished", 17.4156, 78.3410),
    "Miyapur Comfort 3 BHK": (["1785528266150-3154b0c13dc1", "1628592102751-ba83b0314276", "1720420021124-4e18564e070f"], "Unfurnished", 17.4960, 78.3570),
    "Narsingi Signature Villa": (["1613977257592-4871e5fcd7c4", "1593714604578-d9e41b00c6c6", "1580587771525-78b9dba3b914", "1757344454333-cc666252e596"], "Unfurnished", 17.3880, 78.3560),
}

NEIGHBOURHOODS = [
    {"slug": "gachibowli", "name": "Gachibowli", "lat": 17.4401, "lng": 78.3489,
     "intro": "A major IT and education hub in West Hyderabad, popular with professionals who want a short commute to the tech corridor."},
    {"slug": "kondapur", "name": "Kondapur", "lat": 17.4600, "lng": 78.3570,
     "intro": "An established residential neighbourhood between HITEC City and Miyapur, with a mix of apartments and gated communities."},
    {"slug": "kokapet", "name": "Kokapet", "lat": 17.3950, "lng": 78.3330,
     "intro": "A fast-developing high-rise locality near the Outer Ring Road and the Financial District."},
    {"slug": "financial-district", "name": "Financial District", "lat": 17.4156, "lng": 78.3410,
     "intro": "Home to many large corporate campuses, making it a favourite for rentals close to work."},
    {"slug": "tellapur", "name": "Tellapur", "lat": 17.4630, "lng": 78.2850,
     "intro": "A greener, quieter locality in West Hyderabad known for villa and plotted communities."},
    {"slug": "narsingi", "name": "Narsingi", "lat": 17.3880, "lng": 78.3560,
     "intro": "A well-connected locality along the Outer Ring Road with premium villa and apartment projects."},
    {"slug": "madhapur", "name": "Madhapur", "lat": 17.4483, "lng": 78.3915,
     "intro": "Central to HITEC City, with lively streets and strong demand for rentals."},
    {"slug": "miyapur", "name": "Miyapur", "lat": 17.4960, "lng": 78.3570,
     "intro": "A value-focused residential area in North-West Hyderabad on the metro line."},
]


def slugify(s: str) -> str:
    return re.sub(r"[^a-z0-9]+", "-", s.lower()).strip("-")


async def migrate_properties():
    async for p in db.properties.find({}, {"_id": 0}):
        upd = {}
        if not p.get("slug"):
            upd["slug"] = f"{slugify(p['title'])}-{p['id'][:6]}"
        extra = SAMPLE_EXTRAS.get(p["title"]) if p.get("is_sample") else None
        if extra and not p.get("images"):
            imgs, furn, lat, lng = extra
            upd.update({"images": [img(i) for i in imgs], "image_url": img(imgs[0]), "furnishing": furn,
                        "latitude": lat, "longitude": lng, "highlights": []})
        elif not p.get("images"):
            upd["images"] = [p["image_url"]] if p.get("image_url") else []
        if "views" not in p:
            upd["views"] = 0
        if upd:
            await db.properties.update_one({"id": p["id"]}, {"$set": upd})
