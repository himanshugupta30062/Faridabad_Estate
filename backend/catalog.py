import re

from db import db

U = "https://images.unsplash.com/photo-"
Q = "?crop=entropy&cs=srgb&fm=jpg&w=1400&q=75"


def img(i):
    return f"{U}{i}{Q}"


# Demo-only extras for the 8 sample listings: gallery, furnishing and approximate locality coordinates
# Default search centre: Sector 10 HBC, Faridabad (locality centroid, not an address)
SEARCH_CENTER = (28.3775, 77.3045)

# Demo-only extras for sample listings: gallery, furnishing and approximate locality coordinates
SAMPLE_EXTRAS = {
    "Sector 10 HBC 2 BHK Builder Floor": (["1688653802629-5360086bf632", "1628592102751-ba83b0314276", "1702295297205-700e205030d0", "1600489000022-c2086d79f9d4"], "Semi-furnished", 28.3775, 77.3045),
    "Sector 10 HBC 3 BHK Floor Rental": (["1738168246881-40f35f8aba0a", "1642541070065-3912f347e7c6", "1725257928373-dc6d2ac7b145"], "Semi-furnished", 28.3790, 77.3030),
    "Sector 9 Independent House": (["1580587771525-78b9dba3b914", "1738168279272-c08d6dd22002", "1757344454333-cc666252e596", "1502005097973-6a7082348e28"], "Unfurnished", 28.3820, 77.3080),
    "Sector 15 3 BHK Builder Floor": (["1624204386084-dd8c05e32226", "1613575831056-0acd5da8f085", "1720420021124-4e18564e070f", "1610177534644-34d881503b83"], "Semi-furnished", 28.3960, 77.3230),
    "Sector 16 2 BHK Apartment Rental": (["1551361415-69c87624334f", "1758448511320-05d7d28f4298", "1696762932825-2737db830bbe"], "Fully furnished", 28.4070, 77.3180),
    "NIT 2 BHK Independent House": (["1613575831056-0acd5da8f085", "1628592102751-ba83b0314276", "1642541070065-3912f347e7c6"], "Unfurnished", 28.3870, 77.2960),
    "Sainik Colony 3 BHK Builder Floor": (["1650363700594-8e149ed80eec", "1738168246881-40f35f8aba0a", "1757344454333-cc666252e596"], "Semi-furnished", 28.4200, 77.2960),
    "Greenfield Colony House Rental": (["1613977257592-4871e5fcd7c4", "1738168279272-c08d6dd22002", "1720420021124-4e18564e070f", "1600489000022-c2086d79f9d4"], "Semi-furnished", 28.4650, 77.2950),
    "Charmwood Village 3 BHK Apartment": (["1783696147892-eec669309ca2", "1628592102751-ba83b0314276", "1702295297205-700e205030d0", "1725257928373-dc6d2ac7b145"], "Unfurnished", 28.4930, 77.2970),
    "Sector 21C 4 BHK Villa": (["1635108201018-94bbbfac4a79", "1593714604578-d9e41b00c6c6", "1613575831056-0acd5da8f085", "1757344454333-cc666252e596"], "Unfurnished", 28.4250, 77.3340),
    "Sector 21D Residential Plot": (["1773215023063-e662ea91a69c"], None, 28.4200, 77.3250),
    "Sector 82 3 BHK Apartment": (["1527465094057-db061fdbfaf7", "1738168246881-40f35f8aba0a", "1642541070065-3912f347e7c6", "1502005097973-6a7082348e28"], "Unfurnished", 28.3950, 77.3670),
    "Sector 86 2 BHK Apartment Rental": (["1779903726439-5c27e3996c8a", "1758448511320-05d7d28f4298", "1696762932825-2737db830bbe"], "Semi-furnished", 28.4010, 77.3850),
}

NEIGHBOURHOODS = [
    {"slug": "sector-10-hbc", "name": "Sector 10 HBC", "lat": 28.3775, "lng": 77.3045, "localities": ["Sector 10 HBC"],
     "intro": "A settled residential pocket around the Housing Board Colony in central Faridabad, with builder floors and independent homes."},
    {"slug": "sectors-7-11", "name": "Sectors 7–11", "lat": 28.3800, "lng": 77.3050,
     "localities": ["Sector 7", "Sector 8", "Sector 9", "Sector 10 HBC", "Sector 11"],
     "intro": "Established central sectors of Faridabad with a mix of plotted houses and builder floors."},
    {"slug": "sectors-14-17", "name": "Sectors 14–17", "lat": 28.4000, "lng": 77.3210,
     "localities": ["Sector 14", "Sector 15", "Sector 16", "Sector 17"],
     "intro": "Mature, well-known sectors near the Mathura Road corridor, popular for independent homes and floors."},
    {"slug": "nit", "name": "NIT", "lat": 28.3870, "lng": 77.2960, "localities": ["NIT"],
     "intro": "The older New Industrial Township area of Faridabad, with dense neighbourhoods and value-focused homes."},
    {"slug": "sainik-colony", "name": "Sainik Colony", "lat": 28.4200, "lng": 77.2960, "localities": ["Sainik Colony"],
     "intro": "A residential colony in north-west Faridabad known for builder floors and family homes."},
    {"slug": "greenfield-colony", "name": "Greenfield Colony", "lat": 28.4650, "lng": 77.2950, "localities": ["Greenfield Colony"],
     "intro": "A leafy residential colony in north Faridabad, close to the Delhi border."},
    {"slug": "charmwood-village", "name": "Charmwood Village", "lat": 28.4930, "lng": 77.2970, "localities": ["Charmwood Village"],
     "intro": "A large gated township near Surajkund with apartments and villas."},
    {"slug": "sectors-21c-21d", "name": "Sectors 21C & 21D", "lat": 28.4230, "lng": 77.3300, "localities": ["Sector 21C", "Sector 21D"],
     "intro": "Premium plotted sectors known for larger independent homes, kothis and residential plots."},
    {"slug": "greater-faridabad", "name": "Greater Faridabad (Sectors 75–89)", "lat": 28.3980, "lng": 77.3750,
     "localities": [f"Sector {n}" for n in range(75, 90)],
     "intro": "Newer high-rise sectors along the Faridabad–Gurgaon and Kheri Road corridors, mostly apartments."},
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
            upd.update({"images": [img(i) for i in imgs], "image_url": img(imgs[0]), "furnishing": furn, "city": "Faridabad",
                        "latitude": lat, "longitude": lng, "highlights": []})
        elif not p.get("images"):
            upd["images"] = [p["image_url"]] if p.get("image_url") else []
        if "views" not in p:
            upd["views"] = 0
        if upd:
            await db.properties.update_one({"id": p["id"]}, {"$set": upd})
