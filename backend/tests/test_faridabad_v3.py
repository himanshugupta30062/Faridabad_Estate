# PropMitra Faridabad iteration: listings/seed, search (keyword, groups, filters, sort), search-meta, plot,
# neighbourhoods, detail/similar, visitor auth & favourites, admin RBAC, enquiries (visit), admin (notes/status/CSV/
# listings edit/create plot/deactivate), chat (match, rental, no-match, handoff lead)
import json
import os
import uuid

import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL").rstrip("/")
ADMIN = {"email": "admin@urbannest.in", "password": "UrbanNest@2026"}
VISITOR = {"email": "visitor@test.in", "password": "Visitor@2026"}
BANNED = ["hyderabad", "telangana", "gachibowli", "kondapur", "kokapet", "madhapur", "hitech", "jubilee", "banjara"]


def get(path, **params):
    r = requests.get(f"{BASE_URL}/api{path}", params=params, timeout=30)
    assert r.status_code == 200, r.text
    return r.json()


def titles(rows):
    return [p["title"] for p in rows]


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


# --- Listings & seed
class TestListings:
    def test_13_samples(self):
        d = get("/properties")
        assert len(d) == 13
        for p in d:
            assert p["is_sample"] is True and p["images"] and p["latitude"] and p["longitude"]
            assert not any(b in json.dumps(p).lower() for b in BANNED)
        assert d[0]["location"] == "Sector 10 HBC" and d[1]["location"] == "Sector 10 HBC"

    def test_search_meta(self):
        m = get("/search-meta")
        assert m["center"]["name"].startswith("Sector 10 HBC")
        assert "Sectors 14–17" in m["suggestions"] and "Sector 15" in m["suggestions"]

    def test_keyword_sector15(self):
        assert titles(get("/properties", q="Sector 15")) [0] == "Sector 15 3 BHK Builder Floor"

    def test_group_14_17(self):
        assert sorted(p["location"] for p in get("/properties", q="Sectors 14–17")) == ["Sector 15", "Sector 16"]

    def test_greater_faridabad(self):
        g = "Greater Faridabad (Sectors 75–89)"
        assert [p["location"] for p in get("/properties", q=g, listing_type="buy")] == ["Sector 82"]
        assert [p["location"] for p in get("/properties", q=g, listing_type="rent")] == ["Sector 86"]

    def test_filters(self):
        assert all(p["property_type"] == "Builder Floor" for p in get("/properties", property_type="Builder Floor"))
        r = get("/properties", bedrooms=3, max_price=15000000, listing_type="buy")
        assert r and all(p["bedrooms"] == 3 and p["price"] <= 15000000 for p in r)
        assert len(get("/properties", listing_type="rent")) == 4
        assert all(p["furnishing"] == "Fully furnished" for p in get("/properties", furnishing="Fully furnished"))
        assert titles(get("/properties", possession="Under construction")) == ["Sector 82 3 BHK Apartment"]
        assert all(p["area_sqft"] >= 2000 for p in get("/properties", min_area=2000))
        assert get("/properties", q="zzznothing") == []

    def test_sort(self):
        a = [p["price"] for p in get("/properties", listing_type="buy", sort="price_asc")]
        assert a == sorted(a)
        d = [p["price"] for p in get("/properties", listing_type="buy", sort="price_desc")]
        assert d == sorted(d, reverse=True)

    def test_plot(self):
        p = get("/properties", property_type="Plot")[0]
        assert p["bedrooms"] == 0 and p["bathrooms"] == 0 and p["title"] == "Sector 21D Residential Plot"

    def test_detail_similar(self):
        p = get("/properties/sector-15-3-bhk-builder-floor-5e21c4")
        assert p["location"] == "Sector 15"
        assert isinstance(get(f"/properties/{p['id']}/similar"), list)
        assert requests.get(f"{BASE_URL}/api/properties/nope-xyz").status_code == 404

    @pytest.mark.parametrize("slug,locs", [("sector-10-hbc", {"Sector 10 HBC"}), ("greater-faridabad", {"Sector 82", "Sector 86"}),
                                           ("sectors-21c-21d", {"Sector 21C", "Sector 21D"})])
    def test_neighbourhood(self, slug, locs):
        n = get(f"/neighbourhoods/{slug}")
        assert {p["location"] for p in n["properties"]} == locs

    def test_no_hyderabad_public_endpoints(self):
        for path in ["/neighbourhoods", "/insights", "/locations", "/search-meta"]:
            assert not any(b in json.dumps(get(path)).lower() for b in BANNED), path


# --- Visitor auth / favourites / RBAC
class TestVisitor:
    def test_fav_requires_login(self):
        pid = get("/properties")[0]["id"]
        assert requests.post(f"{BASE_URL}/api/me/favourites/{pid}").status_code == 401

    def test_fav_flow(self, visitor_s):
        pid = get("/properties")[0]["id"]
        assert visitor_s.post(f"{BASE_URL}/api/me/favourites/{pid}").status_code == 200
        assert pid in visitor_s.get(f"{BASE_URL}/api/me/favourites").json()["ids"]
        visitor_s.delete(f"{BASE_URL}/api/me/favourites/{pid}")
        assert pid not in visitor_s.get(f"{BASE_URL}/api/me/favourites").json()["ids"]

    def test_visitor_forbidden(self, visitor_s):
        assert visitor_s.get(f"{BASE_URL}/api/admin/stats").status_code == 403


# --- Enquiries + admin CRM
class TestAdmin:
    def test_visit_enquiry_and_crm(self, admin_s):
        p = get("/properties", q="Sector 15")[0]
        r = requests.post(f"{BASE_URL}/api/enquiries", json={
            "name": "TEST_Visit", "phone": "9876500011", "intent": "buy", "location": "Sector 15",
            "property_id": p["id"], "enquiry_type": "visit", "preferred_date": "2026-03-10",
            "source_page": f"/property/{p['slug']}"}, timeout=60)
        assert r.status_code == 200
        lid = r.json()["id"]
        lead = admin_s.get(f"{BASE_URL}/api/admin/leads/{lid}").json()
        assert lead["enquiry_type"] == "Site visit request" and lead["preferred_date"] == "2026-03-10"
        assert lead["property_id"] == p["id"] and lead["source_page"].startswith("/property/")
        assert admin_s.post(f"{BASE_URL}/api/admin/leads/{lid}/notes", json={"text": "TEST note"}).status_code == 200
        assert admin_s.patch(f"{BASE_URL}/api/admin/leads/{lid}", json={"status": "Visit scheduled"}).json()["status"] == "Visit scheduled"
        csv = admin_s.get(f"{BASE_URL}/api/admin/export/leads.csv")
        assert csv.status_code == 200 and "TEST_Visit" in csv.text and "attachment" in csv.headers["content-disposition"]
        st = admin_s.get(f"{BASE_URL}/api/admin/stats").json()
        for k in ["sources", "status", "recent", "property_performance"]:
            assert k in st
        assert st["active_listings"] == 13

    def test_edit_listing_and_restore(self, admin_s):
        props = admin_s.get(f"{BASE_URL}/api/admin/properties").json()
        p = next(x for x in props if x["title"] == "Sainik Colony 3 BHK Builder Floor")
        keys = ["title", "listing_type", "location", "property_type", "bedrooms", "bathrooms", "area_sqft", "price", "possession",
                "furnishing", "images", "highlights", "latitude", "longitude", "is_sample", "description", "is_active"]
        orig = {k: p.get(k) for k in keys}
        new_img = "https://images.unsplash.com/photo-1600489000022-c2086d79f9d4?w=1200"
        try:
            body = {**orig, "price": 9900000, "images": [new_img] + orig["images"]}
            assert admin_s.put(f"{BASE_URL}/api/admin/properties/{p['id']}", json=body).status_code == 200
            pub = get(f"/properties/{p['slug']}")
            assert pub["price"] == 9900000 and pub["image_url"] == new_img
        finally:
            r = admin_s.put(f"{BASE_URL}/api/admin/properties/{p['id']}", json=orig)
            assert r.status_code == 200 and r.json()["price"] == orig["price"]

    def test_create_plot_and_deactivate(self, admin_s):
        body = {"title": "TEST_Plot Sector 21D", "listing_type": "buy", "location": "Sector 21D", "property_type": "Plot",
                "bedrooms": 0, "bathrooms": 0, "area_sqft": 1800, "price": 15000000, "images": ["https://images.unsplash.com/photo-1773215023063-e662ea91a69c"],
                "description": "Test plot listing for QA only", "is_sample": False}
        r = admin_s.post(f"{BASE_URL}/api/admin/properties", json=body)
        assert r.status_code == 200, r.text
        pid, slug = r.json()["id"], r.json()["slug"]
        try:
            assert get(f"/properties/{slug}")["bedrooms"] == 0
            admin_s.patch(f"{BASE_URL}/api/admin/properties/{pid}/active", json={"is_active": False})
            assert requests.get(f"{BASE_URL}/api/properties/{slug}").status_code == 404
            assert pid not in [p["id"] for p in get("/properties")]
        finally:
            admin_s.patch(f"{BASE_URL}/api/admin/properties/{pid}/active", json={"is_active": False})


# --- Chatbot
class TestChat:
    def test_greeting_faridabad(self):
        meta, text, done = chat(None, "Hi")
        s = requests.get(f"{BASE_URL}/api/chat/{meta['session_id']}").json()
        g = s["messages"][0]["content"]
        assert "Faridabad" in g and "Hyderabad" not in g

    def test_builder_floor_sec15(self):
        meta, text, _ = chat(None, "Need a 3 BHK builder floor in sec 15 under 1.5 crore", "/properties")
        assert [m["title"] for m in meta["matches"]] == ["Sector 15 3 BHK Builder Floor"]
        assert meta["matches"][0]["reasons"] and meta["matches"][0]["slug"]

    def test_rental_hbc(self):
        meta, text, _ = chat(None, "rental near Sector 10 HBC under 25000")
        assert meta["matches"] and meta["matches"][0]["title"] == "Sector 10 HBC 3 BHK Floor Rental"

    def test_no_match(self):
        meta, text, _ = chat(None, "I want to buy a villa in NIT under 50 lakh")
        assert meta["matches"] == []
        assert "Sector" not in text or "no" in text.lower()

    def test_handoff_lead(self, admin_s):
        sid = f"chat_test_{uuid.uuid4().hex}"
        chat(sid, "I want to buy a 3 BHK in Sector 15 under 1.5 crore", "/property/sector-15")
        meta, text, done = chat(sid, "I want to talk to a human. My name is TEST_Handoff, phone 9876500022", "/property/sector-15")
        assert done["lead_saved"] is True
        leads = admin_s.get(f"{BASE_URL}/api/admin/leads", params={"q": "TEST_Handoff"}).json()
        lead = next(l for l in leads if l.get("session_id") == sid)
        assert lead["handoff_requested"] is True and lead["source_page"] == "/property/sector-15"
