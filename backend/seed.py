import uuid
from datetime import datetime, timezone

from db import db

U = "https://images.unsplash.com/"
Q = "?crop=entropy&cs=srgb&fm=jpg&w=1200&q=80"

SAMPLE_NOTE = " SAMPLE listing for illustration only — not verified and not available."
SAMPLES = [
    ("Sector 10 2 BHK Builder Floor", "buy", "Sector 10", "Builder Floor", 2, 2, 1050, 6200000, "Ready to move",
     "1688653802629-5360086bf632", "Illustrative 2 BHK builder floor in the Housing Board Colony area of Sector 10, Faridabad."),
    ("Sector 10 3 BHK Floor Rental", "rent", "Sector 10", "Builder Floor", 3, 2, 1350, 22000, "Ready to move",
     "1738168246881-40f35f8aba0a", "Illustrative 3 BHK builder floor for rent in Sector 10, Faridabad."),
    ("Sector 9 Independent House", "buy", "Sector 9", "Independent House", 4, 4, 2400, 21000000, "Ready to move",
     "1580587771525-78b9dba3b914", "Illustrative 4 BHK independent house in Sector 9, Faridabad."),
    ("Sector 15 3 BHK Builder Floor", "buy", "Sector 15", "Builder Floor", 3, 3, 1600, 13500000, "Ready to move",
     "1624204386084-dd8c05e32226", "Illustrative 3 BHK builder floor in Sector 15, Faridabad."),
    ("Sector 16 2 BHK Apartment Rental", "rent", "Sector 16", "Apartment", 2, 2, 1100, 18000, "Ready to move",
     "1551361415-69c87624334f", "Illustrative 2 BHK apartment for rent in Sector 16, Faridabad."),
    ("NIT 2 BHK Independent House", "buy", "NIT", "Independent House", 2, 2, 900, 6800000, "Ready to move",
     "1613575831056-0acd5da8f085", "Illustrative 2 BHK independent house in the NIT area of Faridabad."),
    ("Sainik Colony 3 BHK Builder Floor", "buy", "Sainik Colony", "Builder Floor", 3, 3, 1400, 9500000, "Ready to move",
     "1650363700594-8e149ed80eec", "Illustrative 3 BHK builder floor in Sainik Colony, Faridabad."),
    ("Greenfield Colony House Rental", "rent", "Greenfield Colony", "Independent House", 3, 3, 1800, 35000, "Ready to move",
     "1613977257592-4871e5fcd7c4", "Illustrative 3 BHK independent house for rent in Greenfield Colony, Faridabad."),
    ("Charmwood Village 3 BHK Apartment", "buy", "Charmwood Village", "Apartment", 3, 3, 1800, 11500000, "Ready to move",
     "1783696147892-eec669309ca2", "Illustrative 3 BHK apartment in Charmwood Village, Faridabad."),
    ("Sector 21C 4 BHK Villa", "buy", "Sector 21C", "Villa", 4, 5, 4500, 35000000, "Ready to move",
     "1635108201018-94bbbfac4a79", "Illustrative 4 BHK villa in Sector 21C, Faridabad."),
    ("Sector 21D Residential Plot", "buy", "Sector 21D", "Plot", 0, 0, 2250, 24000000, None,
     "1773215023063-e662ea91a69c", "Illustrative 250 sq. yd residential plot in Sector 21D, Faridabad."),
    ("Sector 82 3 BHK Apartment", "buy", "Sector 82", "Apartment", 3, 3, 1450, 7800000, "Under construction",
     "1527465094057-db061fdbfaf7", "Illustrative 3 BHK apartment in Sector 82, Greater Faridabad."),
    ("Sector 86 2 BHK Apartment Rental", "rent", "Sector 86", "Apartment", 2, 2, 1050, 15000, "Ready to move",
     "1779903726439-5c27e3996c8a", "Illustrative 2 BHK apartment for rent in Sector 86, Greater Faridabad."),
]


async def seed_properties():
    titles = [t[0] for t in SAMPLES]
    await db.properties.delete_many({"is_sample": True, "title": {"$nin": titles}})  # drop retired demo data only
    existing = set(await db.properties.distinct("title", {"is_sample": True}))
    now = datetime.now(timezone.utc).isoformat()
    docs = []
    for i, (title, lt, loc, pt, bed, bath, area, price, poss, img, desc) in enumerate(SAMPLES):
        if title in existing:
            continue
        desc = desc + SAMPLE_NOTE
        docs.append({"id": str(uuid.uuid4()), "title": title, "listing_type": lt, "location": loc, "property_type": pt,
                     "bedrooms": bed, "bathrooms": bath, "area_sqft": area, "price": price, "possession": poss,
                     "image_url": f"{U}{img}{Q}", "description": desc, "is_active": True, "is_sample": True,
                     "featured": True, "created_at": now, "updated_at": now, "order": i})
    if docs:
        await db.properties.insert_many(docs)
