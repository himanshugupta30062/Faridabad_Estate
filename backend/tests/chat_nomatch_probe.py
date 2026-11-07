# Manual probe: chatbot no-match behaviour over multiple turns
import os, sys
sys.path.insert(0, os.path.dirname(__file__))
from test_propmitra_api import chat

meta, t1, _ = chat(None, "I want to rent a 2 BHK in Kokapet under 20000 per month")
sid = meta["session_id"]
print("T1 matches:", meta["matches"], "\n", t1, "\n----")
meta, t2, _ = chat(sid, "Apartment, no preference on possession")
print("T2 matches:", meta["matches"], "\n", t2, "\n----")
meta, t3, _ = chat(None, "I want to buy a 3 BHK in Kondapur under 1.3 crore. Do you have something with a swimming pool and RERA approval?")
print("T3 matches:", [m["title"] for m in meta["matches"]], "\n", t3)
