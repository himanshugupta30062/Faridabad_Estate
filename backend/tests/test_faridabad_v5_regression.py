# Faridabad Estates v5 regression: admin stats shape (post l->ld rename), chat budget extraction (1.5 crore -> 15000000),
# chat session persistence via GET /api/chat/{sid}, chat lead budget, neighbourhoods, favourites
import os
import json

import pytest
import requests
from pymongo import MongoClient

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL").rstrip("/")
ADMIN = {"email": "admin@urbannest.in", "password": "UrbanNest@2026"}
VISITOR = {"email": "visitor@test.in", "password": "Visitor@2026"}


def _db():
    env = dict(l.strip().split("=", 1) for l in open("/app/backend/.env") if "=" in l)
    return MongoClient(env["MONGO_URL"].strip('"'))[env["DB_NAME"].strip('"')]


def chat(sid, msg, source_page="/"):
    r = requests.post(f"{BASE_URL}/api/chat/stream", json={"session_id": sid, "message": msg, "source_page": source_page},
                      stream=True, timeout=180)
    assert r.status_code == 200, r.text
    meta, text, done = None, "", None
    for line in r.iter_lines(decode_unicode=True):
        if line and line.startswith("data: "):
            ev = json.loads(line[6:])
            if ev["type"] == "meta":
                meta = ev
            elif ev["type"] == "delta":
                text += ev["content"]
            elif ev["type"] == "done":
                done = ev
    return meta, text, done


@pytest.fixture(scope="module")
def admin_s():
    s = requests.Session()
    r = s.post(f"{BASE_URL}/api/auth/login", json=ADMIN)
    if r.status_code != 200:
        pytest.skip("admin login failed")
    return s


class TestAdminStats:
    def test_stats_shape(self, admin_s):
        r = admin_s.get(f"{BASE_URL}/api/admin/stats")
        assert r.status_code == 200, r.text
        d = r.json()
        for k in ["total", "intent", "temperature", "sources", "status", "recent", "follow_ups", "property_performance", "active_listings"]:
            assert k in d, k
        assert isinstance(d["total"], int) and d["total"] >= 0
        assert isinstance(d["sources"], list) and all({"source", "count"} <= set(x) for x in d["sources"])
        assert sum(x["count"] for x in d["sources"]) == d["total"]
        assert sum(d["status"].values()) == d["total"]
        assert len(d["recent"]) == min(5, d["total"])
        assert all("id" in x and "name" in x for x in d["recent"])
        assert len(d["follow_ups"]) <= 8
        fus = [x["follow_up_date"] for x in d["follow_ups"]]
        assert fus == sorted(fus)
        assert all(x["status"] not in ("Closed", "Lost") for x in d["follow_ups"])

    def test_stats_requires_auth(self):
        assert requests.get(f"{BASE_URL}/api/admin/stats").status_code == 401


class TestChat:
    created_leads = []

    def test_budget_extraction_and_session_restore(self):
        meta, text, done = chat(None, "Find me a 3 BHK in Sector 15 under 1.5 crore")
        assert meta and meta["session_id"]
        assert len(text) > 20
        print("reply:", text[:300])
        print("matches:", [(m["title"], m["price"]) for m in meta["matches"]])
        assert all(m["price"] <= 15000000 for m in meta["matches"])
        sid = meta["session_id"]
        g = requests.get(f"{BASE_URL}/api/chat/{sid}")
        assert g.status_code == 200
        gd = g.json()
        assert any(m["role"] == "user" and "Sector 15" in m["content"] for m in gd["messages"])
        assert gd["messages"][-1]["role"] == "assistant" and gd["messages"][-1]["content"]
        req = _db().chat_sessions.find_one({"session_id": sid}, {"_id": 0, "requirements": 1})["requirements"]
        print("requirements:", req)
        assert req.get("budget_max") == 15000000, req
        TestChat.sid = sid

    def test_lead_budget(self):
        sid = getattr(TestChat, "sid", None)
        if not sid:
            pytest.skip("no session")
        meta, text, done = chat(sid, "My name is TEST_Ravi and my number is 9876500011")
        assert done and done["lead_saved"] is True
        s = _db().chat_sessions.find_one({"session_id": sid}, {"_id": 0, "lead_id": 1})
        lead = _db().leads.find_one({"id": s["lead_id"]}, {"_id": 0, "transcript": 0})
        TestChat.created_leads.append(s["lead_id"])
        print("lead:", {k: lead.get(k) for k in ["name", "budget_min", "budget_max", "budget_label", "location", "temperature"]})
        assert lead["budget_max"] == 15000000
        assert "1.5" in (lead.get("budget_label") or "") or "1.50" in (lead.get("budget_label") or "")

    @classmethod
    def teardown_class(cls):
        if cls.created_leads:
            _db().leads.delete_many({"id": {"$in": cls.created_leads}})

    def test_unknown_session_404(self):
        assert requests.get(f"{BASE_URL}/api/chat/chat_doesnotexist123").status_code == 404


class TestSite:
    def test_neighbourhoods(self):
        r = requests.get(f"{BASE_URL}/api/neighbourhoods")
        assert r.status_code == 200
        d = r.json()
        assert isinstance(d, list) and len(d) > 0
        print(d[0])

    def test_favourites_requires_auth(self):
        assert requests.get(f"{BASE_URL}/api/me/favourites").status_code == 401
