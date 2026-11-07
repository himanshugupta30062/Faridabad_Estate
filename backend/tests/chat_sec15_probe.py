# Probe: chat requirement extraction for 'sec 15 builder floor' (repeat 3x to gauge flakiness)
import os, sys, json
sys.path.insert(0, os.path.dirname(__file__))
from test_faridabad_v3 import chat, BASE_URL
import requests

for i in range(3):
    meta, text, done = chat(None, "Need a 3 BHK builder floor in sec 15 under 1.5 crore", "/properties")
    s = requests.get(f"{BASE_URL}/api/chat/{meta['session_id']}").json()
    print(i, [m["title"] for m in meta["matches"]], "| reply:", text[:200].replace("\n", " "))
    print("   stored matches:", [m["title"] for m in s["matches"]])
