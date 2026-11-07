import uuid
from datetime import datetime, timezone

from db import db

U = "https://images.unsplash.com/"
Q = "?crop=entropy&cs=srgb&fm=jpg&w=1200&q=80"

SAMPLES = [
    ("Skyline Residency 2 BHK", "buy", "Gachibowli", "Apartment", 2, 2, 1250, 8500000, "Ready to move",
     "photo-1702295297205-700e205030d0",
     "Well-planned 2 BHK apartment in a gated community close to the Gachibowli IT corridor, with an east-facing living room and a balcony."),
    ("Kondapur Greens 3 BHK", "buy", "Kondapur", "Apartment", 3, 3, 1680, 12500000, "Ready to move",
     "photo-1712793042263-cf9eab9a229a",
     "Spacious 3 BHK apartment with a large living-dining area and a utility space, located in a residential pocket of Kondapur."),
    ("Kokapet Heights 3 BHK", "buy", "Kokapet", "Apartment", 3, 3, 2050, 16000000, "Under construction",
     "photo-1783696147892-eec669309ca2",
     "Premium high-rise 3 BHK in Kokapet with large windows and views towards the Neopolis area."),
    ("Tellapur Garden Villa", "buy", "Tellapur", "Villa", 4, 5, 3600, 28000000, "Ready to move",
     "photo-1635108201018-94bbbfac4a79",
     "Independent 4 BHK villa in a gated villa community in Tellapur, with a private garden and a double-height living room."),
    ("Madhapur Urban 2 BHK Rental", "rent", "Madhapur", "Apartment", 2, 2, 1150, 28000, "Ready to move",
     "photo-1758448511320-05d7d28f4298",
     "Semi-furnished 2 BHK for rent in Madhapur, a short commute from HITEC City offices."),
    ("FinDistrict Elite 3 BHK Rental", "rent", "Financial District", "Apartment", 3, 3, 1850, 45000, "Ready to move",
     "photo-1779903726439-5c27e3996c8a",
     "3 BHK apartment for rent in the Financial District with a modular kitchen and two balconies."),
    ("Miyapur Comfort 3 BHK", "buy", "Miyapur", "Apartment", 3, 2, 1550, 9500000, "Ready to move",
     "photo-1785528266150-3154b0c13dc1",
     "Value-for-money 3 BHK apartment in Miyapur, near the metro line and established neighbourhood markets."),
    ("Narsingi Signature Villa", "buy", "Narsingi", "Villa", 4, 5, 4200, 32000000, "Under construction",
     "photo-1593714604578-d9e41b00c6c6",
     "Large 4 BHK luxury villa in Narsingi with a private terrace, close to the Outer Ring Road."),
]


async def seed_properties():
    if await db.properties.count_documents({"is_sample": True}) > 0:
        return
    now = datetime.now(timezone.utc).isoformat()
    docs = []
    for i, (title, lt, loc, pt, bed, bath, area, price, poss, img, desc) in enumerate(SAMPLES):
        docs.append({"id": str(uuid.uuid4()), "title": title, "listing_type": lt, "location": loc, "property_type": pt,
                     "bedrooms": bed, "bathrooms": bath, "area_sqft": area, "price": price, "possession": poss,
                     "image_url": f"{U}{img}{Q}", "description": desc, "is_active": True, "is_sample": True,
                     "featured": True, "created_at": now, "updated_at": now, "order": i})
    await db.properties.insert_many(docs)
