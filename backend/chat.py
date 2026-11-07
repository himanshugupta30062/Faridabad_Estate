import asyncio
import json
import os
import re
import uuid
import logging
from datetime import datetime, timezone

from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field
from emergentintegrations.llm.chat import LlmChat, UserMessage, TextDelta, StreamDone

from db import db
from emailer import send_lead_alert

router = APIRouter(prefix="/api")
log = logging.getLogger("chat")
REQ_KEYS = ["intent", "locations", "budget_min", "budget_max", "property_type", "bedrooms", "possession", "name", "phone"]


def now_iso():
    return datetime.now(timezone.utc).isoformat()


def llm(session_id: str, system: str) -> LlmChat:
    return LlmChat(api_key=os.environ["EMERGENT_LLM_KEY"], session_id=session_id,
                   system_message=system).with_model("anthropic", os.environ["LLM_MODEL"])


def fmt_price(p, listing_type="buy"):
    if p is None:
        return ""
    p = float(p)
    if listing_type == "rent":
        return f"₹{int(p):,}/month"
    if p >= 10000000:
        return f"₹{p / 10000000:.2f}".rstrip("0").rstrip(".") + " crore"
    return f"₹{p / 100000:.2f}".rstrip("0").rstrip(".") + " lakh"


def normalize_phone(phone):
    if not phone:
        return None
    digits = re.sub(r"\D", "", str(phone))[-10:]
    return digits if re.fullmatch(r"[6-9]\d{9}", digits) else None


def budget_label(req):
    lt = "rent" if req.get("intent") == "rent" else "buy"
    lo, hi = req.get("budget_min"), req.get("budget_max")
    if lo and hi:
        return f"{fmt_price(lo, lt)} – {fmt_price(hi, lt)}"
    if hi:
        return f"Up to {fmt_price(hi, lt)}"
    if lo:
        return f"From {fmt_price(lo, lt)}"
    return ""


EXTRACT_SYSTEM = """You extract structured real estate requirements from a chat between a visitor and Estate Mitra (Faridabad Estates, Faridabad, Haryana).
Return ONLY a JSON object, no prose, with keys:
intent: "buy" | "rent" | "sell" | null
locations: array of Faridabad locality names the visitor wants (or owns, for sell), Title Case, e.g. ["Sector 15"] or ["Sainik Colony"], or []
budget_min: number in INR or null; budget_max: number in INR or null. For rent use monthly rent. Convert lakh (1e5) and crore (1e7) exactly: "1.5 crore" = 15000000, "1.25 Cr" = 12500000, "85 lakh" = 8500000, "₹28,000/month" = 28000. "around X" => min 0.85X, max 1.15X. "under X" => max X. For sell, use expected price as budget_max.
property_type: "Apartment" | "Builder Floor" | "Independent House" | "Villa" | "Plot" | null (flat/society => Apartment, floor => Builder Floor, kothi/house => Independent House)
bedrooms: integer or null
possession: "Ready to move" | "Under construction" | "Any" | null
name: string or null; phone: string or null (exactly as visitor typed)
handoff: true if the visitor asks to talk to a human, agent, advisor or a real person, else false
temperature: "Hot" | "Warm" | "Cold". Hot = clear intent, budget and location given, shares contact and wants to proceed soon (site visit, ready to move, urgent). Warm = some requirements clear but undecided or no urgency. Cold = vague, just browsing, or refuses details.
summary: 2-3 short sentences summarising the visitor's requirement and stage for a sales advisor. Only facts stated by the visitor.
Locations: use Faridabad locality names exactly in this style: "Sector 10", "Sector 9", "Sector 15", "Sector 21C", "NIT", "Sainik Colony", "Greenfield Colony", "Charmwood Village", "Sector 82". "sec 15"/"sector-15" => "Sector 15"; "HBC"/"Housing Board Colony"/"sec 10" => "Sector 10"; "Sectors 14 to 17" => ["Sector 14","Sector 15","Sector 16","Sector 17"]; "Greater Faridabad" or "new sectors" => ["Sector 75", ..., "Sector 89"] (all 15); "near X" => ["X"]. If the visitor just says "Faridabad" or "anywhere", use [].
Intent: if the visitor gives a monthly amount or says rent/rental/lease => "rent"; if they mention lakh/crore purchase budget or buying => "buy"; if they want to sell/list their property => "sell".
Only use what the visitor actually said. Never guess."""

REPLY_RULES = """You are Estate Mitra, the friendly AI property advisor of Faridabad Estates, a real estate consultancy in Faridabad, Haryana.
Goal: understand the visitor's requirement, recommend matching listings, and collect their name and phone for a callback.
Conversation flow (ask at most 1-2 things per message, keep replies under 90 words, warm Indian English, use lakh/crore):
1. Ask if they want to Buy, Rent or Sell.
2. Collect preferred location, budget, property type, bedrooms and possession preference (ready to move / under construction). For Sell, collect location, property type, bedrooms and expected price.
3. When MATCHING_LISTINGS has items, recommend them by title and briefly explain why each matches using its "reasons" (they are shown as cards with links below your message). Offer to refine (budget, area, BHK).
4. If search was done and there are no matches, say honestly that no current listing matches and offer a callback from a Faridabad Estates advisor.
5. Ask for name and 10-digit mobile number so an advisor can call back. Once LEAD_SAVED is true, thank them and confirm an advisor will contact them soon.
STRICT RULES:
- Recommend ONLY listings in MATCHING_LISTINGS. Never mention any other property.
- Describe a listing only using fields present in its data. Never invent availability, approvals (RERA etc.), amenities, specifications, discounts or prices. If asked about something not in the data, say the advisor will confirm it.
- All listings shown are sample listings for demonstration.
- Do not process payments, legal verification or transactions.
- If MATCHING_LISTINGS is [] (an empty list), immediately and honestly say no current listing matches, then offer a callback and ask for name and phone (or suggest relaxing budget/location).
- If HANDOFF_REQUESTED is true: confirm a Faridabad Estates human advisor will take over and call them; ask for name and phone if missing.
- Greet only once; never restart with "Namaste" or re-introduce yourself mid-conversation.
- Never ask again for anything already in COLLECTED, and do not ask about preferences that a recommended listing already answers.
- Do not output JSON or markdown tables. Plain text with short line breaks only."""


async def extract_requirements(transcript: str) -> dict:
    chat = llm(f"extract-{uuid.uuid4().hex}", EXTRACT_SYSTEM)
    raw = await chat.send_message(UserMessage(text=f"CONVERSATION:\n{transcript}\n\nReturn the JSON now."))
    m = re.search(r"\{.*\}", raw, re.S)
    return json.loads(m.group(0)) if m else {}


def merge_requirements(old: dict, new: dict) -> dict:
    out = dict(old)
    for k in REQ_KEYS + ["temperature", "summary", "handoff"]:
        v = new.get(k)
        if v not in (None, "", []):
            out[k] = v
    return out


def public_property(p: dict) -> dict:
    return {k: p.get(k) for k in ["id", "slug", "title", "listing_type", "location", "property_type", "bedrooms", "bathrooms",
                                  "area_sqft", "price", "possession", "furnishing", "image_url", "images", "highlights",
                                  "latitude", "longitude", "description", "is_sample", "created_at"]}


async def find_matches(req: dict, limit: int = 4):
    intent = req.get("intent")
    known = sum(bool(req.get(k)) for k in ["locations", "budget_max", "property_type", "bedrooms"])
    if intent not in ("buy", "rent") or known < 2:
        return None
    q = {"is_active": True, "listing_type": intent}
    if req.get("locations"):
        q["$or"] = [{"location": {"$regex": f"^{re.escape(loc.strip())}$", "$options": "i"}} for loc in req["locations"]]
    if req.get("budget_max"):
        q["price"] = {"$lte": float(req["budget_max"])}
        if req.get("budget_min"):
            q["price"]["$gte"] = float(req["budget_min"])
    if req.get("property_type"):
        q["property_type"] = req["property_type"]
    if req.get("bedrooms"):
        q["bedrooms"] = int(req["bedrooms"])
    if req.get("possession") in ("Ready to move", "Under construction"):
        q["possession"] = req["possession"]
    docs = await db.properties.find(q, {"_id": 0}).sort("price", 1).to_list(limit)
    return [{**public_property(d), "reasons": match_reasons(d, req)} for d in docs]


def match_reasons(p, req):
    r = []
    if req.get("locations"):
        r.append(f"In {p['location']}, your preferred area")
    if req.get("budget_max"):
        r.append(f"{fmt_price(p['price'], p['listing_type'])} is within your budget of up to {fmt_price(req['budget_max'], p['listing_type'])}")
    if req.get("bedrooms"):
        r.append(f"{p['bedrooms']} BHK as requested")
    if req.get("property_type"):
        r.append(f"{p['property_type']} as requested")
    if req.get("possession") in ("Ready to move", "Under construction"):
        r.append(f"Possession: {p.get('possession')}")
    return r


def whatsapp_message(lead: dict, matches: list) -> str:
    name = (lead.get("name") or "there").split(" ")[0]
    intent = lead.get("intent") or "buy"
    parts = []
    if lead.get("bedrooms"):
        parts.append(f"{lead['bedrooms']} BHK")
    parts.append((lead.get("property_type") or "property").lower())
    want = " ".join(parts)
    loc = f" in {lead['location']}" if lead.get("location") else ""
    bl = lead.get("budget_label") or ""
    bud = f" within a budget of {bl[0].lower() + bl[1:]}" if bl else ""
    verb = {"buy": "buy", "rent": "rent", "sell": "sell"}.get(intent, "buy")
    msg = f"Hi {name}, this is Faridabad Estates. Thank you for your enquiry on Faridabad Estates to {verb} a {want}{loc}{bud}."
    if matches:
        titles = ", ".join(m["title"] for m in matches[:3])
        msg += f" We have shortlisted options for you, including {titles}."
    elif intent == "sell":
        msg += " Our advisor would like to understand your property better and discuss the next steps."
    else:
        msg += " We are checking options that fit your requirement and will share them shortly."
    msg += " When would be a convenient time for a quick call or site visit?"
    return msg


def build_lead_fields(req: dict, matches: list) -> dict:
    lead = {
        "name": req.get("name"), "phone": normalize_phone(req.get("phone")), "intent": req.get("intent"),
        "location": ", ".join(req.get("locations") or []), "budget_min": req.get("budget_min"),
        "budget_max": req.get("budget_max"), "property_type": req.get("property_type"),
        "bedrooms": req.get("bedrooms"), "possession": req.get("possession"),
        "temperature": req.get("temperature") or "Warm", "summary": req.get("summary") or "",
        "matched_property_ids": [m["id"] for m in matches or []],
    }
    lead["budget_label"] = budget_label(req)
    lead["whatsapp_message"] = whatsapp_message(lead, matches or [])
    return lead


def transcript_text(messages):
    return "\n".join(f"{'Visitor' if m['role'] == 'user' else 'Estate Mitra'}: {m['content']}" for m in messages)


class ChatIn(BaseModel):
    session_id: str | None = None
    source_page: str | None = Field(default=None, max_length=200)
    message: str = Field(min_length=1, max_length=1500)


GREETING = ("Namaste! I'm Estate Mitra, your AI property advisor from Faridabad Estates — Find Your Place. Build Your Future. "
            "Are you looking to Buy, Rent or Sell a property in Faridabad?")


@router.get("/chat/status")
async def chat_status():
    return {"configured": bool(os.environ.get("EMERGENT_LLM_KEY"))}


@router.get("/chat/{session_id}")
async def get_chat(session_id: str):
    s = await db.chat_sessions.find_one({"session_id": session_id}, {"_id": 0})
    if not s:
        raise HTTPException(status_code=404, detail="Chat not found")
    return {"session_id": session_id, "messages": s["messages"], "matches": s.get("matches") or [],
            "lead_saved": bool(s.get("lead_id"))}


@router.post("/chat/stream")
async def chat_stream(body: ChatIn):
    text = body.message.strip()
    if not text:
        raise HTTPException(status_code=422, detail="Message cannot be empty")
    if not os.environ.get("EMERGENT_LLM_KEY"):
        raise HTTPException(status_code=503, detail="Estate Mitra is not configured yet. Please contact Faridabad Estates directly.")
    sid = body.session_id or f"chat_{uuid.uuid4().hex}"
    s = await db.chat_sessions.find_one({"session_id": sid}, {"_id": 0})
    if not s:
        s = {"session_id": sid, "messages": [{"role": "assistant", "content": GREETING, "ts": now_iso()}],
             "requirements": {}, "matches": [], "lead_id": None, "created_at": now_iso(), "source_page": body.source_page}
        await db.chat_sessions.insert_one(dict(s))
    messages = s["messages"] + [{"role": "user", "content": text, "ts": now_iso()}]
    transcript = transcript_text(messages)

    try:
        extracted = await extract_requirements(transcript)
    except Exception as e:  # keep conversation going if extraction fails
        log.error("extraction failed: %s", e)
        extracted = {}
    req = merge_requirements(s.get("requirements") or {}, extracted)
    matches = await find_matches(req)
    prev_ids = [m["id"] for m in s.get("matches") or []]
    shown = matches if matches and [m["id"] for m in matches] != prev_ids else []
    phone_ok = normalize_phone(req.get("phone"))
    phone_invalid = bool(req.get("phone")) and not phone_ok
    can_save = bool(req.get("intent") and req.get("name") and phone_ok)

    collected = {k: req.get(k) for k in REQ_KEYS if req.get(k) not in (None, "", [])}
    missing = [k for k in ["intent", "locations", "budget_max", "property_type", "bedrooms", "possession", "name", "phone"]
               if k not in collected]
    match_info = ("NOT_SEARCHED_YET (need intent buy/rent, location and budget)" if matches is None
                  else json.dumps([{**m, "price_display": fmt_price(m["price"], m["listing_type"])} for m in matches]) or "[]")
    system = (f"{REPLY_RULES}\n\nCOLLECTED: {json.dumps(collected)}\nSTILL_MISSING: {missing}\n"
              f"MATCHING_LISTINGS: {match_info}\nLEAD_SAVED: {can_save}\nHANDOFF_REQUESTED: {bool(req.get('handoff'))}\n"
              f"PHONE_INVALID: {phone_invalid} (if true, politely ask for a valid 10-digit Indian mobile number)")

    async def gen():
        yield f"data: {json.dumps({'type': 'meta', 'session_id': sid, 'matches': shown, 'lead_saved': can_save})}\n\n"
        reply = ""
        try:
            chat = llm(f"reply-{uuid.uuid4().hex}", system)
            prompt = f"CONVERSATION SO FAR:\n{transcript}\n\nWrite Estate Mitra's next reply to the visitor's last message."
            async for ev in chat.stream_message(UserMessage(text=prompt)):
                if isinstance(ev, TextDelta):
                    reply += ev.content
                    yield f"data: {json.dumps({'type': 'delta', 'content': ev.content})}\n\n"
                elif isinstance(ev, StreamDone):
                    break
        except Exception as e:
            log.error("reply failed: %s", e)
            if not reply:
                reply = "Sorry, I'm having trouble right now. Please share your name and phone and a Faridabad Estates advisor will call you back."
                yield f"data: {json.dumps({'type': 'delta', 'content': reply})}\n\n"
        all_msgs = messages + [{"role": "assistant", "content": reply, "ts": now_iso(),
                                "matches": shown}]
        update = {"messages": all_msgs, "requirements": req, "matches": matches if matches is not None else (s.get("matches") or []),
                  "updated_at": now_iso()}
        lead_id = s.get("lead_id")
        if can_save:
            lead = build_lead_fields(req, matches)
            lead.update({"transcript": all_msgs, "session_id": sid, "source": "chatbot", "updated_at": now_iso(),
                         "handoff_requested": bool(req.get("handoff")), "source_page": s.get("source_page") or body.source_page,
                         "enquiry_type": "Human handoff" if req.get("handoff") else "AI-qualified enquiry"})
            if lead_id:
                prev = await db.leads.find_one({"id": lead_id}, {"_id": 0, "temperature": 1, "hot_alert_sent": 1}) or {}
                await db.leads.update_one({"id": lead_id}, {"$set": lead})
                if lead["temperature"] == "Hot" and not prev.get("hot_alert_sent"):
                    asyncio.create_task(send_lead_alert({**lead, "id": lead_id}))
            else:
                lead_id = str(uuid.uuid4())
                await db.leads.insert_one({**lead, "id": lead_id, "status": "New", "notes": [], "created_at": now_iso()})
                if lead["temperature"] == "Hot":
                    asyncio.create_task(send_lead_alert({**lead, "id": lead_id}))
            update["lead_id"] = lead_id
        await db.chat_sessions.update_one({"session_id": sid}, {"$set": update})
        yield f"data: {json.dumps({'type': 'done', 'lead_saved': bool(lead_id)})}\n\n"

    return StreamingResponse(gen(), media_type="text/event-stream",
                             headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"})
