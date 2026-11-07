# Probe: deactivated listing excluded from chatbot matching; then restore Kondapur listing
import os, sys, requests
sys.path.insert(0, os.path.dirname(__file__))
from test_propmitra_api import chat, BASE_URL, ADMIN

KID = "91e5eec8-6456-4c51-ba08-4673a7fcac5d"
s = requests.Session(); s.post(f"{BASE_URL}/api/auth/login", json=ADMIN)
p = [x for x in s.get(f"{BASE_URL}/api/admin/properties").json() if x["id"] == KID][0]
print("kondapur active:", p["is_active"])
meta, text, _ = chat(None, "I want to buy a 3 BHK apartment in Kondapur under 1.3 crore, ready to move")
print("matches while inactive:", meta["matches"]); print(text)
leads = s.get(f"{BASE_URL}/api/admin/leads", params={"q": "9012345678"}).json()
lead = s.get(f"{BASE_URL}/api/admin/leads/{leads[0]['id']}").json()
print("lead matched is_active:", [m["is_active"] for m in lead["matched_properties"]])
r = s.patch(f"{BASE_URL}/api/admin/properties/{KID}/active", json={"is_active": True})
print("restored:", r.json()["is_active"])
print("public count:", len(requests.get(f"{BASE_URL}/api/properties").json()))
