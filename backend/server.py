import asyncio
import logging
import re
import uuid
from collections import Counter
from contextlib import suppress
from datetime import datetime, timezone
from typing import Literal, Optional

from fastapi import FastAPI, APIRouter, Depends, File, HTTPException, Query, UploadFile
from fastapi.responses import Response
from pydantic import BaseModel, Field, field_validator
from pymongo import ASCENDING, DESCENDING, IndexModel
from starlette.middleware.cors import CORSMiddleware
import os

from db import db, client
from auth import router as auth_router, get_current_admin, seed_admin
from chat import (router as chat_router, extract_requirements, build_lead_fields, normalize_phone, now_iso,
                  public_property)
from seed import seed_properties
from storage import APP_NAME, init_storage, put_object, get_object

logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s")
logger = logging.getLogger(__name__)

INDEXES = {
    "users": [IndexModel([("email", ASCENDING)], name="email", unique=True),
              IndexModel([("user_id", ASCENDING)], name="user_id", unique=True)],
    "user_sessions": [IndexModel([("session_token", ASCENDING)], name="session_token")],
    "login_attempts": [IndexModel([("identifier", ASCENDING)], name="identifier")],
    "properties": [IndexModel([("id", ASCENDING)], name="id", unique=True),
                   IndexModel([("is_active", ASCENDING), ("listing_type", ASCENDING), ("price", ASCENDING)], name="search")],
    "leads": [IndexModel([("id", ASCENDING)], name="id", unique=True),
              IndexModel([("created_at", DESCENDING)], name="created_desc"),
              IndexModel([("session_id", ASCENDING)], name="session_id")],
    "chat_sessions": [IndexModel([("session_id", ASCENDING)], name="session_id", unique=True)],
    "files": [IndexModel([("storage_path", ASCENDING)], name="storage_path")],
}


async def ensure_indexes():
    for coll, models in INDEXES.items():
        for m in models:
            try:
                await db[coll].create_indexes([m])
            except Exception as exc:
                logger.error("ensure_indexes(%s.%s): %s", coll, m.document["name"], exc)


app = FastAPI()
api = APIRouter(prefix="/api")

PropertyType = Literal["Apartment", "Villa", "Independent House", "Plot"]


# ---------- Public listings ----------
@api.get("/")
async def root():
    return {"message": "PropMitra API"}


@api.get("/properties")
async def list_properties(listing_type: Optional[Literal["buy", "rent"]] = None, location: Optional[str] = None,
                          min_price: Optional[float] = Query(None, ge=0), max_price: Optional[float] = Query(None, ge=0),
                          property_type: Optional[str] = None, bedrooms: Optional[int] = Query(None, ge=1, le=10)):
    q = {"is_active": True}
    if listing_type:
        q["listing_type"] = listing_type
    if location:
        q["location"] = {"$regex": f"^{re.escape(location)}$", "$options": "i"}
    if property_type:
        q["property_type"] = property_type
    if bedrooms:
        q["bedrooms"] = {"$gte": 4} if bedrooms >= 4 else bedrooms
    if min_price is not None or max_price is not None:
        q["price"] = {}
        if min_price is not None:
            q["price"]["$gte"] = min_price
        if max_price is not None:
            q["price"]["$lte"] = max_price
    docs = await db.properties.find(q, {"_id": 0}).sort([("order", 1), ("created_at", -1)]).to_list(200)
    return [public_property(d) for d in docs]


@api.get("/locations")
async def locations():
    return sorted(await db.properties.distinct("location", {"is_active": True}))


@api.get("/properties/{pid}")
async def get_property(pid: str):
    d = await db.properties.find_one({"id": pid, "is_active": True}, {"_id": 0})
    if not d:
        raise HTTPException(status_code=404, detail="Property not found")
    return public_property(d)


@api.get("/files/{path:path}")
async def serve_file(path: str):
    rec = await db.files.find_one({"storage_path": path, "is_deleted": False})
    if not rec:
        raise HTTPException(status_code=404, detail="File not found")
    data, ct = get_object(path)
    return Response(content=data, media_type=rec.get("content_type", ct), headers={"Cache-Control": "public, max-age=86400"})


# ---------- Enquiry form ----------
class EnquiryIn(BaseModel):
    name: str = Field(min_length=2, max_length=80)
    phone: str
    intent: Literal["buy", "rent", "sell"]
    location: str = Field(default="", max_length=120)
    budget: str = Field(default="", max_length=80)
    message: str = Field(default="", max_length=1000)
    property_id: Optional[str] = None

    @field_validator("phone")
    @classmethod
    def valid_phone(cls, v):
        if not normalize_phone(v):
            raise ValueError("Enter a valid 10-digit Indian mobile number")
        return normalize_phone(v)


@api.post("/enquiries")
async def create_enquiry(body: EnquiryIn):
    text = (f"Visitor: I want to {body.intent}. Location: {body.location or 'not specified'}. "
            f"Budget: {body.budget or 'not specified'}. {body.message}\nVisitor: My name is {body.name}, phone {body.phone}.")
    prop = None
    if body.property_id:
        prop = await db.properties.find_one({"id": body.property_id}, {"_id": 0})
        if prop:
            text += f"\nVisitor: I am interested in the listing '{prop['title']}' in {prop['location']}."
    try:
        req = await extract_requirements(text)
    except Exception as e:
        logger.error("enquiry analysis failed: %s", e)
        req = {}
    req.update({"name": body.name, "phone": body.phone, "intent": body.intent})
    if not req.get("locations") and body.location:
        req["locations"] = [body.location]
    if not req.get("summary"):
        req["summary"] = f"{body.name} submitted a website enquiry to {body.intent} in {body.location or 'Hyderabad'}."
    matches = [public_property(prop)] if prop else []
    lead = build_lead_fields(req, matches)
    lead.update({"id": str(uuid.uuid4()), "source": "website_form", "status": "New", "session_id": None,
                 "transcript": [{"role": "user", "content": text, "ts": now_iso()}],
                 "created_at": now_iso(), "updated_at": now_iso()})
    await db.leads.insert_one(dict(lead))
    return {"ok": True, "id": lead["id"]}


# ---------- Admin ----------
admin = APIRouter(prefix="/api/admin", dependencies=[Depends(get_current_admin)])


def bucket(lead):
    v = lead.get("budget_max")
    if not v:
        return "Not shared"
    if lead.get("intent") == "rent":
        return "Rent < ₹30K" if v < 30000 else "Rent ₹30K–50K" if v <= 50000 else "Rent > ₹50K"
    if v < 10000000:
        return "Under ₹1 Cr"
    if v <= 20000000:
        return "₹1–2 Cr"
    if v <= 30000000:
        return "₹2–3 Cr"
    return "Above ₹3 Cr"


@admin.get("/stats")
async def stats():
    leads = await db.leads.find({}, {"_id": 0, "intent": 1, "temperature": 1, "location": 1, "budget_max": 1}).to_list(10000)
    intents = Counter((l.get("intent") or "unknown") for l in leads)
    temps = Counter((l.get("temperature") or "Warm") for l in leads)
    locs = Counter()
    for l in leads:
        for loc in (l.get("location") or "").split(","):
            if loc.strip():
                locs[loc.strip().title()] += 1
    order = ["Under ₹1 Cr", "₹1–2 Cr", "₹2–3 Cr", "Above ₹3 Cr", "Rent < ₹30K", "Rent ₹30K–50K", "Rent > ₹50K", "Not shared"]
    buckets = Counter(bucket(l) for l in leads)
    return {
        "total": len(leads),
        "intent": {k: intents.get(k, 0) for k in ["buy", "rent", "sell"]},
        "temperature": {k: temps.get(k, 0) for k in ["Hot", "Warm", "Cold"]},
        "top_locations": [{"location": k, "count": v} for k, v in locs.most_common(6)],
        "budget_distribution": [{"bucket": b, "count": buckets[b]} for b in order if buckets.get(b)],
        "active_listings": await db.properties.count_documents({"is_active": True}),
    }


@admin.get("/leads")
async def list_leads(temperature: Optional[str] = None, intent: Optional[str] = None, q: Optional[str] = None):
    f = {}
    if temperature:
        f["temperature"] = temperature
    if intent:
        f["intent"] = intent
    if q:
        rx = {"$regex": re.escape(q), "$options": "i"}
        f["$or"] = [{"name": rx}, {"phone": rx}, {"location": rx}]
    return await db.leads.find(f, {"_id": 0, "transcript": 0}).sort("created_at", -1).to_list(500)


@admin.get("/leads/{lid}")
async def get_lead(lid: str):
    lead = await db.leads.find_one({"id": lid}, {"_id": 0})
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")
    props = await db.properties.find({"id": {"$in": lead.get("matched_property_ids") or []}}, {"_id": 0}).to_list(20)
    lead["matched_properties"] = [{**public_property(p), "is_active": p.get("is_active")} for p in props]
    return lead


class LeadPatch(BaseModel):
    temperature: Optional[Literal["Hot", "Warm", "Cold"]] = None
    status: Optional[Literal["New", "Contacted", "Site visit", "Closed"]] = None


@admin.patch("/leads/{lid}")
async def patch_lead(lid: str, body: LeadPatch):
    upd = {k: v for k, v in body.model_dump().items() if v is not None}
    if not upd:
        raise HTTPException(status_code=422, detail="Nothing to update")
    r = await db.leads.update_one({"id": lid}, {"$set": {**upd, "updated_at": now_iso()}})
    if not r.matched_count:
        raise HTTPException(status_code=404, detail="Lead not found")
    return await db.leads.find_one({"id": lid}, {"_id": 0, "transcript": 0})


class PropertyIn(BaseModel):
    title: str = Field(min_length=3, max_length=120)
    listing_type: Literal["buy", "rent"]
    location: str = Field(min_length=2, max_length=60)
    property_type: PropertyType
    bedrooms: int = Field(ge=1, le=10)
    bathrooms: int = Field(ge=1, le=10)
    area_sqft: int = Field(ge=100, le=100000)
    price: float = Field(gt=0)
    possession: Optional[Literal["Ready to move", "Under construction"]] = None
    image_url: str = Field(min_length=5)
    description: str = Field(min_length=10, max_length=2000)
    is_active: bool = True

    @field_validator("location", "title")
    @classmethod
    def strip(cls, v):
        return v.strip()


@admin.get("/properties")
async def admin_properties():
    return await db.properties.find({}, {"_id": 0}).sort([("order", 1), ("created_at", -1)]).to_list(500)


@admin.post("/properties")
async def create_property(body: PropertyIn):
    doc = {**body.model_dump(), "id": str(uuid.uuid4()), "is_sample": False, "featured": True, "order": 100,
           "created_at": now_iso(), "updated_at": now_iso()}
    await db.properties.insert_one(dict(doc))
    doc.pop("_id", None)
    return doc


@admin.put("/properties/{pid}")
async def update_property(pid: str, body: PropertyIn):
    r = await db.properties.update_one({"id": pid}, {"$set": {**body.model_dump(), "updated_at": now_iso()}})
    if not r.matched_count:
        raise HTTPException(status_code=404, detail="Property not found")
    return await db.properties.find_one({"id": pid}, {"_id": 0})


class ActiveIn(BaseModel):
    is_active: bool


@admin.patch("/properties/{pid}/active")
async def set_active(pid: str, body: ActiveIn):
    r = await db.properties.update_one({"id": pid}, {"$set": {"is_active": body.is_active, "updated_at": now_iso()}})
    if not r.matched_count:
        raise HTTPException(status_code=404, detail="Property not found")
    return await db.properties.find_one({"id": pid}, {"_id": 0})


ALLOWED = {"image/jpeg": "jpg", "image/png": "png", "image/webp": "webp"}


@admin.post("/upload")
async def upload(file: UploadFile = File(...), user=Depends(get_current_admin)):
    if file.content_type not in ALLOWED:
        raise HTTPException(status_code=422, detail="Only JPG, PNG or WEBP images are allowed")
    data = await file.read()
    if len(data) > 5 * 1024 * 1024:
        raise HTTPException(status_code=422, detail="Image must be under 5 MB")
    path = f"{APP_NAME}/listings/{uuid.uuid4()}.{ALLOWED[file.content_type]}"
    try:
        res = await asyncio.to_thread(put_object, path, data, file.content_type)
    except Exception as e:
        logger.error("upload failed: %s", e)
        raise HTTPException(status_code=502, detail="Image upload failed. Please try again or paste an image link.")
    await db.files.insert_one({"id": str(uuid.uuid4()), "storage_path": res["path"], "original_filename": file.filename,
                               "content_type": file.content_type, "size": res.get("size"), "is_deleted": False,
                               "uploaded_by": user["user_id"], "created_at": now_iso()})
    return {"url": f"/api/files/{res['path']}"}


app.include_router(api)
app.include_router(auth_router)
app.include_router(chat_router)
app.include_router(admin)

app.add_middleware(CORSMiddleware, allow_credentials=True, allow_origins=os.environ.get("CORS_ORIGINS", "*").split(","),
                   allow_methods=["*"], allow_headers=["*"])


@app.on_event("startup")
async def startup():
    app.state.index_task = asyncio.create_task(ensure_indexes())
    await seed_admin()
    await seed_properties()
    try:
        await asyncio.to_thread(init_storage)
    except Exception as e:
        logger.error("Storage init failed: %s", e)


@app.on_event("shutdown")
async def shutdown():
    app.state.index_task.cancel()
    with suppress(asyncio.CancelledError):
        await app.state.index_task
    client.close()
