# UrbanNest v2 regression: search filters, detail/similar, neighbourhoods, insights, favourites, visitor auth,
# enquiries (visit), chat (match/no-match/handoff/status), admin (notes, status, CSV, listings), sitemap/robots
import json
import os
import uuid

import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL").rstrip("/")
ADMIN = {"email": "admin@urbannest.in", "password": "UrbanNest@2026"}
KONDAPUR_SLUG = "kondapur-greens-3-bhk-91e5ee"


@pytest.fixture(scope="module")
def admin_s():
    s = requests.Session()
    r = s.post(f"{BASE_URL}/api/auth/login", json=ADMIN)
    if r.status_code != 200:
        pytest.skip(f"admin login failed {r.status_code} {r.text}")
    return s


@pytest.fixture(scope="module")
def visitor_s():
    s = requests.Session()
    email = f"test_{uuid.uuid4().hex[:8]}@example.com"
    r = s.post(f"{BASE_URL}/api/auth/register", json={"email": email, "password": "Visitor@2026", "name": "TEST_Visitor"})
    if r.status_code != 200:
        pytest.skip(f"register failed {r.status_code} {r.text}")
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


def search(**p):
    r = requests.get(f"{BASE_URL}/api/properties", params=p)
    assert r.status_code == 200, r.text
    return r.json()


# ---------- Search filters ----------
class TestSearch:
    def test_3bhk_under_15cr(self):
        titles = {p["title"] for p in search(bedrooms=3, max_price=15000000, listing_type="buy")}
        assert titles == {"Kondapur Greens 3 BHK", "Miyapur Comfort 3 BHK"}

    def test_bathrooms(self):
        res = search(bathrooms=5)
        assert res and all(p["bathrooms"] >= 5 for p in res)

    def test_area(self):
        res = search(min_area=1500, max_area=2100)
        assert res and all(1500 <= p["area_sqft"] <= 2100 for p in res)

    def test_furnishing_semi(self):
        res = search(furnishing="Semi-furnished")
        assert len(res) == 2 and all(p["listing_type"] == "rent" for p in res)

    def test_possession(self):
        res = search(possession="Under construction")
        assert res and all(p["possession"] == "Under construction" for p in res)

    def test_sort(self):
        asc = [p["price"] for p in search(sort="price_asc", listing_type="buy")]
        desc = [p["price"] for p in search(sort="price_desc", listing_type="buy")]
        assert asc == sorted(asc) and desc == sorted(desc, reverse=True)

    def test_keyword(self):
        assert all(p["property_type"] == "Villa" or "villa" in p["title"].lower() for p in search(q="villa"))
        assert search(q="villa")
        n = search(q="Narsingi")
        assert n and n[0]["location"] == "Narsingi"

    def test_empty(self):
        assert search(q="zzznomatch") == []


# ---------- Detail / neighbourhoods / insights ----------
class TestDetail:
    def test_detail_by_slug_and_similar(self):
        r = requests.get(f"{BASE_URL}/api/properties/{KONDAPUR_SLUG}", params={"track": "true"})
        assert r.status_code == 200
        p = r.json()
        assert p["title"] == "Kondapur Greens 3 BHK" and len(p["images"]) >= 2 and p["latitude"]
        s = requests.get(f"{BASE_URL}/api/properties/{p['id']}/similar")
        assert s.status_code == 200 and all(x["id"] != p["id"] for x in s.json())

    def test_404(self):
        assert requests.get(f"{BASE_URL}/api/properties/no-such-slug").status_code == 404

    def test_neighbourhoods(self):
        r = requests.get(f"{BASE_URL}/api/neighbourhoods/kondapur").json()
        assert r["name"] == "Kondapur" and r["listings"] >= 1 and r["properties"][0]["location"] == "Kondapur"
        fd = requests.get(f"{BASE_URL}/api/neighbourhoods/financial-district").json()
        assert fd["listings"] >= 1 and fd["min_rent"]
        assert requests.get(f"{BASE_URL}/api/neighbourhoods/nowhere").status_code == 404
        assert len(requests.get(f"{BASE_URL}/api/neighbourhoods").json()) == 8

    def test_insights(self):
        r = requests.get(f"{BASE_URL}/api/insights").json()
        assert r and "avg_price_per_sqft" in r[0]


# ---------- Visitor auth / favourites / admin guard ----------
class TestVisitor:
    def test_favourites(self, visitor_s):
        p = search(q="Kondapur")[0]
        assert requests.get(f"{BASE_URL}/api/me/favourites").status_code == 401
        assert visitor_s.post(f"{BASE_URL}/api/me/favourites/{p['id']}").status_code == 200
        favs = visitor_s.get(f"{BASE_URL}/api/me/favourites").json()
        assert p["id"] in favs["ids"]
        assert visitor_s.delete(f"{BASE_URL}/api/me/favourites/{p['id']}").status_code == 200
        assert p["id"] not in visitor_s.get(f"{BASE_URL}/api/me/favourites").json()["ids"]

    def test_visitor_forbidden_admin(self, visitor_s):
        assert visitor_s.get(f"{BASE_URL}/api/auth/me").json()["role"] == "visitor"
        for path in ["stats", "leads", "properties", "export/leads.csv"]:
            assert visitor_s.get(f"{BASE_URL}/api/admin/{path}").status_code == 403, path

    def test_duplicate_register(self, visitor_s):
        me = visitor_s.get(f"{BASE_URL}/api/auth/me").json()
        r = requests.post(f"{BASE_URL}/api/auth/register", json={"email": me["email"], "password": "Visitor@2026", "name": "TEST_Dup"})
        assert r.status_code in (400, 409)


# ---------- Enquiry + admin lead workflow ----------
class TestLeads:
    def test_visit_enquiry_notes_status_csv(self, admin_s):
        p = requests.get(f"{BASE_URL}/api/properties/{KONDAPUR_SLUG}").json()
        r = requests.post(f"{BASE_URL}/api/enquiries", json={
            "name": "TEST_Visit User", "phone": "9876500011", "intent": "buy", "location": "Kondapur",
            "property_id": p["id"], "enquiry_type": "visit", "preferred_date": "2026-02-10",
            "source_page": f"/property/{KONDAPUR_SLUG}"})
        assert r.status_code == 200, r.text
        lid = r.json()["id"]
        lead = admin_s.get(f"{BASE_URL}/api/admin/leads/{lid}").json()
        assert lead["property_id"] == p["id"] and lead["enquiry_type"] == "Site visit request"
        assert lead["preferred_date"] == "2026-02-10" and lead["source_page"].startswith("/property/")
        assert lead["matched_properties"][0]["id"] == p["id"] and lead["whatsapp_message"]
        n = admin_s.post(f"{BASE_URL}/api/admin/leads/{lid}/notes", json={"text": "TEST note"})
        assert n.status_code == 200
        assert admin_s.patch(f"{BASE_URL}/api/admin/leads/{lid}", json={"status": "Contacted"}).json()["status"] == "Contacted"
        lead = admin_s.get(f"{BASE_URL}/api/admin/leads/{lid}").json()
        assert lead["status"] == "Contacted" and lead["notes"][-1]["text"] == "TEST note"
        assert admin_s.patch(f"{BASE_URL}/api/admin/leads/{lid}", json={"status": "Bogus"}).status_code == 422
        csv = admin_s.get(f"{BASE_URL}/api/admin/export/leads.csv")
        assert csv.status_code == 200 and "text/csv" in csv.headers["content-type"] and "TEST_Visit User" in csv.text
        st = admin_s.get(f"{BASE_URL}/api/admin/stats").json()
        assert st["sources"] and st["property_performance"] and "status" in st

    def test_enquiry_validation(self):
        r = requests.post(f"{BASE_URL}/api/enquiries", json={"name": "TEST", "phone": "12345", "intent": "buy"})
        assert r.status_code == 422


# ---------- Admin listings ----------
class TestListings:
    def test_create_two_images_deactivate(self, admin_s):
        body = {"title": "TEST_Listing Two Images", "listing_type": "buy", "location": "Kondapur", "property_type": "Apartment",
                "bedrooms": 2, "bathrooms": 2, "area_sqft": 1100, "price": 7000000, "furnishing": "Semi-furnished",
                "images": ["https://images.unsplash.com/photo-1650363700594-8e149ed80eec", "https://images.unsplash.com/photo-1628592102751-ba83b0314276"],
                "highlights": ["Near metro"], "latitude": 17.46, "longitude": 78.35, "is_sample": True,
                "description": "TEST listing created by testing agent."}
        r = admin_s.post(f"{BASE_URL}/api/admin/properties", json=body)
        assert r.status_code == 200, r.text
        d = r.json()
        assert len(d["images"]) == 2 and d["image_url"] == body["images"][0]
        # make cover = reorder
        body["images"] = body["images"][::-1]
        u = admin_s.put(f"{BASE_URL}/api/admin/properties/{d['id']}", json=body).json()
        assert u["image_url"] == body["images"][0]
        assert any(p["id"] == d["id"] for p in search(q="TEST_Listing"))
        admin_s.patch(f"{BASE_URL}/api/admin/properties/{d['id']}/active", json={"is_active": False})
        assert not any(p["id"] == d["id"] for p in search(q="TEST_Listing"))
        assert requests.get(f"{BASE_URL}/api/properties/{d['slug']}").status_code == 404

    def test_validation(self, admin_s):
        r = admin_s.post(f"{BASE_URL}/api/admin/properties", json={"title": "x", "images": ["http://bad"]})
        assert r.status_code == 422


# ---------- SEO ----------
class TestSeo:
    def test_sitemap(self):
        r = requests.get(f"{BASE_URL}/api/sitemap.xml")
        assert r.status_code == 200 and "/property/" in r.text and KONDAPUR_SLUG in r.text

    def test_robots(self):
        r = requests.get(f"{BASE_URL}/robots.txt")
        assert r.status_code == 200 and "user-agent" in r.text.lower()


# ---------- Chat ----------
class TestChat:
    def test_status(self):
        assert requests.get(f"{BASE_URL}/api/chat/status").json()["configured"] is True

    def test_match_and_lead(self, admin_s):
        sid = f"test_{uuid.uuid4().hex}"
        meta, text, _ = chat(sid, "Find me a 3 BHK in Kondapur under ₹1.5 crore", "/properties")
        assert meta["matches"] and meta["matches"][0]["slug"] == KONDAPUR_SLUG and meta["matches"][0]["reasons"]
        meta, text, done = chat(sid, "My name is TEST_Chat Ravi, phone 9876500022")
        assert done["lead_saved"] is True
        leads = admin_s.get(f"{BASE_URL}/api/admin/leads", params={"q": "TEST_Chat Ravi"}).json()
        assert leads and leads[0]["source"] == "chatbot" and leads[0]["source_page"] == "/properties"
        full = admin_s.get(f"{BASE_URL}/api/admin/leads/{leads[0]['id']}").json()
        assert full["transcript"] and full["summary"] and full["matched_properties"]

    def test_no_match_honest(self):
        sid = f"test_{uuid.uuid4().hex}"
        meta, text, _ = chat(sid, "I want to buy a 4 BHK villa in Miyapur under 50 lakh")
        assert not meta["matches"]
        print("NO-MATCH REPLY:", text)
        assert any(w in text.lower() for w in ["no ", "don't", "do not", "not have", "couldn't", "none"])

    def test_handoff(self, admin_s):
        sid = f"test_{uuid.uuid4().hex}"
        chat(sid, "I want to rent in Madhapur, budget 30k. I'm TEST_Handoff Sita, 9876500033")
        meta, text, done = chat(sid, "I'd like to talk to a human advisor, please.")
        assert done["lead_saved"]
        leads = admin_s.get(f"{BASE_URL}/api/admin/leads", params={"q": "TEST_Handoff"}).json()
        assert leads and leads[0].get("handoff_requested") is True, leads[0] if leads else None
