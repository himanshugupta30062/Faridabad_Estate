# Faridabad Estates v4 (rebrand): listings/seed, search (keyword/groups/filters/sort), explore pills, neighbourhoods,
# visitor auth & favourites, admin RBAC (401/403), enquiries, admin CRM (follow-up, notes, status, CSV, stats),
# listings CRUD (price edit + restore, plot 0 bed, deactivate/reactivate), chat (greeting, match, handoff lead)
import json
import os
import uuid

import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL").rstrip("/")
ADMIN = {"email": "admin@urbannest.in", "password": "UrbanNest@2026"}
VISITOR = {"email": "visitor@test.in", "password": "Visitor@2026"}
BANNED = ["hyderabad", "urbannest", "property mitra", "propmitra", "gachibowli", "kondapur"]


def get(path, **params):
    r = requests.get(f"{BASE_URL}/api{path}", params=params, timeout=30)
    assert r.status_code == 200, r.text
    return r.json()


def locs(rows):
    return sorted(p["location"] for p in rows)


@pytest.fixture(scope="module")
def admin_s():
    s = requests.Session()
    r = s.post(f"{BASE_URL}/api/auth/login", json=ADMIN)
    if r.status_code != 200:
        pytest.skip(f"admin login failed {r.status_code}")
    return s


@pytest.fixture(scope="module")
def visitor_s():
    s = requests.Session()
    r = s.post(f"{BASE_URL}/api/auth/login", json=VISITOR)
    if r.status_code != 200:
        r = s.post(f"{BASE_URL}/api/auth/register", json={**VISITOR, "name": "Test Visitor"})
    if r.status_code != 200:
        pytest.skip(f"visitor login failed {r.status_code} {r.text}")
    return s


def chat(sid, msg, source_page=None):
    r = requests.post(f"{BASE_URL}/api/chat/stream", json={"session_id": sid, "message": msg, "source_page": source_page},
                      stream=True, timeout=120)
    assert r.status_code == 200
    meta, text, done = None, "", None
    for line in r.iter_lines(decode_unicode=True):
        if not line or not line.startswith("data: "):
            continue
        ev = json.loads(line[6:])
        if ev["type"] == "meta":
            meta = ev
        elif ev["type"] == "delta":
            text += ev["content"]
        elif ev["type"] == "done":
            done = ev
    return meta, text, done


# --- Listings / search
class TestSearch:
    def test_13_samples_sorted_by_distance(self):
        d = get("/properties")
        assert len(d) == 13
        assert d[0]["location"] == "Sector 10" and d[1]["location"] == "Sector 10"
        assert not any(b in json.dumps(d).lower() for b in BANNED)

    def test_search_meta(self):
        m = get("/search-meta")
        assert m["center"]["name"] == "Sector 10, Faridabad"
        assert "Sector 15" in m["suggestions"] and "Greater Faridabad (Sectors 75–89)" in m["suggestions"]

    def test_keyword_group(self):
        assert get("/properties", q="Sector 15")[0]["title"] == "Sector 15 3 BHK Builder Floor"
        assert locs(get("/properties", q="Greater Faridabad (Sectors 75–89)")) == ["Sector 82", "Sector 86"]
        assert locs(get("/properties", q="Sectors 21C & 21D")) == ["Sector 21C", "Sector 21D"]

    def test_filters(self):
        r = get("/properties", bedrooms=3, max_price=15000000, listing_type="buy")
        assert "Sector 15 3 BHK Builder Floor" in [p["title"] for p in r]
        assert all(p["bedrooms"] == 3 and p["price"] <= 15000000 for p in r)
        assert all(p["property_type"] == "Builder Floor" for p in get("/properties", property_type="Builder Floor"))
        plot = get("/properties", property_type="Plot")
        assert [p["title"] for p in plot] == ["Sector 21D Residential Plot"] and plot[0]["bedrooms"] == 0
        assert get("/properties", q="zzznothing") == []

    def test_sort(self):
        a = [p["price"] for p in get("/properties", listing_type="buy", sort="price_asc")]
        assert a == sorted(a)

    # Explore pills on home: pills without listing_type are rendered by SearchPage with listing_type=buy default
    @pytest.mark.parametrize("q", ["Sector 10", "Sector 15", "Sector 16", "Sector 21C", "Sainik Colony", "Greenfield Colony",
                                   "Charmwood Village", "NIT", "Greater Faridabad (Sectors 75–89)"])
    def test_explore_locality_pill_buy_default(self, q):
        assert get("/properties", q=q, listing_type="buy"), f"pill '{q}' shows empty results on /properties (buy default)"

    @pytest.mark.parametrize("slug", ["sector-10", "sectors-14-17", "greater-faridabad", "sectors-21c-21d", "nit"])
    def test_neighbourhood(self, slug):
        n = get(f"/neighbourhoods/{slug}")
        assert n["properties"] and not any(b in json.dumps(n).lower() for b in BANNED)


# --- Auth / RBAC
class TestAuth:
    def test_admin_401_without_auth(self):
        for p in ["stats", "leads", "properties", "export/leads.csv"]:
            assert requests.get(f"{BASE_URL}/api/admin/{p}").status_code == 401, p

    def test_admin_403_visitor(self, visitor_s):
        for p in ["stats", "leads", "properties"]:
            assert visitor_s.get(f"{BASE_URL}/api/admin/{p}").status_code == 403, p

    def test_login_cookies_httponly(self):
        r = requests.post(f"{BASE_URL}/api/auth/login", json=ADMIN)
        assert r.status_code == 200 and r.json().get("role") in ("admin", None) or "user" in r.json()
        sc = r.headers.get("set-cookie", "").lower()
        assert "httponly" in sc

    def test_fav_flow(self, visitor_s):
        pid = get("/properties", q="Sector 15")[0]["id"]
        assert requests.post(f"{BASE_URL}/api/me/favourites/{pid}").status_code == 401
        assert visitor_s.post(f"{BASE_URL}/api/me/favourites/{pid}").status_code == 200
        assert pid in visitor_s.get(f"{BASE_URL}/api/me/favourites").json()["ids"]
        visitor_s.delete(f"{BASE_URL}/api/me/favourites/{pid}")


# --- Enquiry + CRM
class TestCRM:
    def test_enquiry_followup_notes_csv(self, admin_s):
        p = get("/properties", q="Sector 15")[0]
        r = requests.post(f"{BASE_URL}/api/enquiries", json={
            "name": "TEST_V4Visit", "phone": "9876500041", "intent": "buy", "location": "Sector 15",
            "property_id": p["id"], "enquiry_type": "visit", "preferred_date": "2026-03-10",
            "source_page": f"/property/{p['slug']}"}, timeout=60)
        assert r.status_code == 200
        lid = r.json()["id"]
        assert requests.post(f"{BASE_URL}/api/enquiries", json={"name": "X", "phone": "123", "intent": "buy"}).status_code == 422
        u = admin_s.patch(f"{BASE_URL}/api/admin/leads/{lid}", json={"follow_up_date": "2026-02-01", "status": "Contacted",
                                                                     "temperature": "Hot"}).json()
        assert u["follow_up_date"] == "2026-02-01" and u["status"] == "Contacted" and u["temperature"] == "Hot"
        assert admin_s.post(f"{BASE_URL}/api/admin/leads/{lid}/notes", json={"text": "TEST v4 note"}).status_code == 200
        lead = admin_s.get(f"{BASE_URL}/api/admin/leads/{lid}").json()
        assert lead["notes"][-1]["text"] == "TEST v4 note" and lead["matched_properties"]
        st = admin_s.get(f"{BASE_URL}/api/admin/stats").json()
        assert any(f["id"] == lid for f in st["follow_ups"])
        csv = admin_s.get(f"{BASE_URL}/api/admin/export/leads.csv")
        assert csv.status_code == 200 and "TEST_V4Visit" in csv.text
        admin_s.patch(f"{BASE_URL}/api/admin/leads/{lid}", json={"status": "Lost"})

    def test_edit_price_and_restore(self, admin_s):
        p = next(x for x in admin_s.get(f"{BASE_URL}/api/admin/properties").json() if x["title"] == "Charmwood Village 3 BHK Apartment")
        keys = ["title", "listing_type", "location", "property_type", "bedrooms", "bathrooms", "area_sqft", "price", "possession",
                "furnishing", "images", "highlights", "latitude", "longitude", "is_sample", "description", "is_active"]
        orig = {k: p.get(k) for k in keys}
        try:
            assert admin_s.put(f"{BASE_URL}/api/admin/properties/{p['id']}", json={**orig, "price": 11600000}).status_code == 200
            assert get(f"/properties/{p['slug']}")["price"] == 11600000
        finally:
            assert admin_s.put(f"{BASE_URL}/api/admin/properties/{p['id']}", json=orig).json()["price"] == orig["price"]

    def test_create_plot_deactivate_reactivate(self, admin_s):
        body = {"title": "TEST_V4 Plot Sector 21D", "listing_type": "buy", "location": "Sector 21D", "property_type": "Plot",
                "bedrooms": 0, "bathrooms": 0, "area_sqft": 1800, "price": 15000000,
                "images": ["https://images.unsplash.com/photo-1773215023063-e662ea91a69c"], "description": "Test plot listing for QA only"}
        r = admin_s.post(f"{BASE_URL}/api/admin/properties", json=body)
        assert r.status_code == 200, r.text
        pid, slug = r.json()["id"], r.json()["slug"]
        try:
            assert get(f"/properties/{slug}")["bedrooms"] == 0
            admin_s.patch(f"{BASE_URL}/api/admin/properties/{pid}/active", json={"is_active": False})
            assert requests.get(f"{BASE_URL}/api/properties/{slug}").status_code == 404
            admin_s.patch(f"{BASE_URL}/api/admin/properties/{pid}/active", json={"is_active": True})
            assert get(f"/properties/{slug}")["id"] == pid
        finally:
            admin_s.patch(f"{BASE_URL}/api/admin/properties/{pid}/active", json={"is_active": False})


# --- Chat
class TestChat:
    def test_greeting(self):
        meta, _, _ = chat(None, "Hi")
        g = requests.get(f"{BASE_URL}/api/chat/{meta['session_id']}").json()["messages"][0]["content"]
        assert "Estate Mitra" in g and not any(b in g.lower() for b in BANNED)

    def test_match_and_handoff_lead(self, admin_s):
        sid = f"chat_test_{uuid.uuid4().hex}"
        meta, text, _ = chat(sid, "3 BHK builder floor in sector 15 under 1.5 crore", "/")
        assert [m["title"] for m in meta["matches"]] == ["Sector 15 3 BHK Builder Floor"]
        assert meta["matches"][0]["slug"]
        assert not any(b in text.lower() for b in BANNED)
        _, _, done = chat(sid, "I want to talk to a human. My name is TEST_V4Chat, phone 9876500042", "/")
        assert done["lead_saved"] is True
        lead = next(l for l in admin_s.get(f"{BASE_URL}/api/admin/leads", params={"q": "TEST_V4Chat"}).json() if l.get("session_id") == sid)
        full = admin_s.get(f"{BASE_URL}/api/admin/leads/{lead['id']}").json()
        assert full["handoff_requested"] is True and full["transcript"] and full["summary"]
        assert any(m["title"] == "Sector 15 3 BHK Builder Floor" for m in full["matched_properties"])
        admin_s.patch(f"{BASE_URL}/api/admin/leads/{lead['id']}", json={"status": "Lost"})
