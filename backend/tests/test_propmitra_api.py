# PropMitra backend regression tests: public listings, enquiries, auth, admin, chat SSE, upload
import io
import json
import os
import uuid

import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL").rstrip("/")
ADMIN = {"email": "admin@urbannest.in", "password": "UrbanNest@2026"}


@pytest.fixture(scope="module")
def admin_s():
    s = requests.Session()
    r = s.post(f"{BASE_URL}/api/auth/login", json=ADMIN)
    if r.status_code != 200:
        pytest.skip(f"admin login failed {r.status_code} {r.text}")
    return s


def chat(sid, msg):
    r = requests.post(f"{BASE_URL}/api/chat/stream", json={"session_id": sid, "message": msg}, stream=True, timeout=120)
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


# ---------- Public listings ----------
class TestPublic:
    def test_all_listings(self):
        d = requests.get(f"{BASE_URL}/api/properties").json()
        assert len(d) >= 8
        assert all("_id" not in p for p in d)

    def test_rent(self):
        d = requests.get(f"{BASE_URL}/api/properties", params={"listing_type": "rent"}).json()
        assert {p["location"] for p in d} >= {"Madhapur", "Financial District"}
        assert all(p["listing_type"] == "rent" for p in d)

    def test_buy_villa(self):
        d = requests.get(f"{BASE_URL}/api/properties", params={"listing_type": "buy", "property_type": "Villa"}).json()
        assert {p["location"] for p in d} == {"Tellapur", "Narsingi"}

    def test_buy_under_1cr(self):
        d = requests.get(f"{BASE_URL}/api/properties", params={"listing_type": "buy", "min_price": 0, "max_price": 10000000}).json()
        assert {p["location"] for p in d} == {"Gachibowli", "Miyapur"}

    def test_bedrooms_4plus_and_location(self):
        d = requests.get(f"{BASE_URL}/api/properties", params={"bedrooms": 4}).json()
        assert all(p["bedrooms"] >= 4 for p in d) and len(d) >= 2
        d = requests.get(f"{BASE_URL}/api/properties", params={"location": "kondapur"}).json()
        assert [p["title"] for p in d] == ["Kondapur Greens 3 BHK"]

    def test_empty(self):
        d = requests.get(f"{BASE_URL}/api/properties", params={"listing_type": "rent", "location": "Kokapet"}).json()
        assert d == []

    def test_locations_and_404(self):
        locs = requests.get(f"{BASE_URL}/api/locations").json()
        assert "Gachibowli" in locs
        assert requests.get(f"{BASE_URL}/api/properties/nonexistent").status_code == 404


# ---------- Enquiries ----------
class TestEnquiry:
    def test_invalid_phone(self):
        r = requests.post(f"{BASE_URL}/api/enquiries", json={"name": "TEST_x", "phone": "12345", "intent": "buy"})
        assert r.status_code == 422

    def test_short_name(self):
        r = requests.post(f"{BASE_URL}/api/enquiries", json={"name": "A", "phone": "9876543210", "intent": "buy"})
        assert r.status_code == 422

    def test_create_and_visible_in_admin(self, admin_s):
        r = requests.post(f"{BASE_URL}/api/enquiries", json={"name": "TEST_Enquiry", "phone": "+91 98765 43210",
                                                             "intent": "buy", "location": "Gachibowli",
                                                             "budget": "1 crore", "message": "2 BHK ready to move"}, timeout=60)
        assert r.status_code == 200 and r.json()["ok"]
        lid = r.json()["id"]
        lead = admin_s.get(f"{BASE_URL}/api/admin/leads/{lid}").json()
        assert lead["name"] == "TEST_Enquiry" and lead["phone"] == "9876543210"
        assert lead["source"] == "website_form" and lead["temperature"] in ("Hot", "Warm", "Cold")
        assert "Gachibowli" in lead["location"]


# ---------- Auth ----------
class TestAuth:
    def test_admin_requires_auth(self):
        for p in ["stats", "leads", "properties"]:
            assert requests.get(f"{BASE_URL}/api/admin/{p}").status_code == 401
        assert requests.post(f"{BASE_URL}/api/admin/upload").status_code == 401

    def test_wrong_password(self):
        r = requests.post(f"{BASE_URL}/api/auth/login", json={"email": "test_nouser_x@urbannest.in", "password": "bad"})
        assert r.status_code == 401

    def test_login_cookies_me(self):
        s = requests.Session()
        r = s.post(f"{BASE_URL}/api/auth/login", json=ADMIN)
        assert r.status_code == 200 and r.json()["email"] == ADMIN["email"]
        sc = r.headers.get("set-cookie", "")
        assert "access_token" in sc and "HttpOnly" in sc
        assert s.get(f"{BASE_URL}/api/auth/me").json()["role"] == "admin"
        assert s.post(f"{BASE_URL}/api/auth/refresh").status_code == 200

    def test_bruteforce_lockout(self):
        email = f"test_lock_{uuid.uuid4().hex[:6]}@urbannest.in"
        codes = [requests.post(f"{BASE_URL}/api/auth/login", json={"email": email, "password": "x"}).status_code
                 for _ in range(6)]
        assert codes[:5] == [401] * 5 and codes[5] == 429


# ---------- Admin ----------
class TestAdmin:
    def test_stats(self, admin_s):
        d = admin_s.get(f"{BASE_URL}/api/admin/stats").json()
        for k in ["total", "intent", "temperature", "top_locations", "budget_distribution", "active_listings"]:
            assert k in d
        assert set(d["intent"]) == {"buy", "rent", "sell"}

    def test_leads_filter_search_patch(self, admin_s):
        hot = admin_s.get(f"{BASE_URL}/api/admin/leads", params={"temperature": "Hot"}).json()
        assert all(l["temperature"] == "Hot" for l in hot)
        res = admin_s.get(f"{BASE_URL}/api/admin/leads", params={"q": "TEST_Enquiry"}).json()
        assert res, "search returned nothing"
        lid = res[0]["id"]
        r = admin_s.patch(f"{BASE_URL}/api/admin/leads/{lid}", json={"temperature": "Cold", "status": "Contacted"})
        assert r.status_code == 200 and r.json()["temperature"] == "Cold"
        assert admin_s.get(f"{BASE_URL}/api/admin/leads/{lid}").json()["status"] == "Contacted"
        assert admin_s.patch(f"{BASE_URL}/api/admin/leads/{lid}", json={"temperature": "Boiling"}).status_code == 422
        assert admin_s.patch(f"{BASE_URL}/api/admin/leads/nope", json={"status": "New"}).status_code == 404

    def test_property_crud_and_deactivate(self, admin_s):
        assert admin_s.post(f"{BASE_URL}/api/admin/properties", json={}).status_code == 422
        body = {"title": "TEST_Listing Kukatpally", "listing_type": "buy", "location": "Kukatpally", "property_type": "Apartment",
                "bedrooms": 2, "bathrooms": 2, "area_sqft": 1100, "price": 7000000, "possession": "Ready to move",
                "image_url": "https://images.unsplash.com/photo-1702295297205-700e205030d0", "description": "Test listing description"}
        r = admin_s.post(f"{BASE_URL}/api/admin/properties", json=body)
        assert r.status_code == 200
        pid = r.json()["id"]
        assert requests.get(f"{BASE_URL}/api/properties/{pid}").status_code == 200
        r = admin_s.put(f"{BASE_URL}/api/admin/properties/{pid}", json={**body, "price": 7200000})
        assert r.json()["price"] == 7200000
        r = admin_s.patch(f"{BASE_URL}/api/admin/properties/{pid}/active", json={"is_active": False})
        assert r.json()["is_active"] is False
        assert requests.get(f"{BASE_URL}/api/properties/{pid}").status_code == 404
        assert pid not in [p["id"] for p in requests.get(f"{BASE_URL}/api/properties").json()]

    def test_upload(self, admin_s):
        png = (b"\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01\x08\x06\x00\x00\x00\x1f\x15\xc4\x89"
               b"\x00\x00\x00\rIDATx\x9cc\xf8\x0f\x00\x00\x01\x01\x00\x05\x18\xd8N\x00\x00\x00\x00IEND\xaeB`\x82")
        r = admin_s.post(f"{BASE_URL}/api/admin/upload", files={"file": ("TEST.png", io.BytesIO(png), "image/png")})
        assert r.status_code == 200, r.text
        url = r.json()["url"]
        assert url.startswith("/api/files/")
        g = requests.get(f"{BASE_URL}{url}")
        assert g.status_code == 200 and g.headers["content-type"].startswith("image/png")
        bad = admin_s.post(f"{BASE_URL}/api/admin/upload", files={"file": ("x.txt", io.BytesIO(b"hi"), "text/plain")})
        assert bad.status_code == 422


# ---------- Chat ----------
class TestChat:
    def test_empty_message(self):
        assert requests.post(f"{BASE_URL}/api/chat/stream", json={"message": ""}).status_code == 422

    def test_full_match_flow(self, admin_s):
        meta, text, _ = chat(None, "I want to buy a 3 BHK apartment in Kondapur under 1.3 crore, ready to move")
        sid = meta["session_id"]
        titles = [m["title"] for m in meta["matches"]]
        print("REPLY1:", text, titles)
        assert titles == ["Kondapur Greens 3 BHK"]
        assert text.strip()
        meta, text, done = chat(sid, "My name is TEST_Chat Ravi, phone 9123456789")
        print("REPLY2:", text)
        assert done["lead_saved"] is True
        h = requests.get(f"{BASE_URL}/api/chat/{sid}").json()
        assert h["lead_saved"] and len(h["messages"]) == 5
        leads = admin_s.get(f"{BASE_URL}/api/admin/leads", params={"q": "9123456789"}).json()
        lead = admin_s.get(f"{BASE_URL}/api/admin/leads/{leads[0]['id']}").json()
        assert lead["source"] == "chatbot" and lead["summary"]
        assert [p["title"] for p in lead["matched_properties"]] == ["Kondapur Greens 3 BHK"]
        assert len(lead["transcript"]) == 5

    def test_no_match(self):
        meta, text, done = chat(None, "I want to rent a 2 BHK in Kokapet under 20000 per month")
        print("NOMATCH REPLY:", text)
        assert meta["matches"] == []
        assert "Kondapur" not in text and "Madhapur Urban" not in text
        assert done["lead_saved"] is False
