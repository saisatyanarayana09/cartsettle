import os
import sys
import time
import django

sys.path.insert(0, r"S:\Hackathon\cartsettle\backend")
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")
django.setup()

from services.agent_service import agent_service

TESTS = [
    # Shopper Persona
    ("shopper", "Add 1 Organic Milk to my cart", "ADD_TO_CART"),
    ("shopper", "Suggest a dinner recipe basket under $20", "RECOMMEND_BASKET"),
    ("shopper", "Find organic milk and check for the best deal", "SEARCH_RESULTS"),
    ("shopper", "Suggest healthy breakfast ingredients", "RECOMMEND_BASKET"),
    # Owner Persona
    ("owner", "Check low stock items", None),
    ("owner", "Check pending orders", None),
    ("owner", "Check profit margins on Ashirvad Atta", None),
    ("owner", "A customer wants a 20% discount on Atta. Can we offer it?", None),
    ("owner", "Restock 10 units of Strawberries from supplier wholesale@kirana.com via PayPal Payout", None),
]

all_passed = True
for persona, prompt, expected_action in TESTS:
    t0 = time.perf_counter()
    res = agent_service.chat(prompt=prompt, session_id="audit_test", persona=persona)
    dt_ms = (time.perf_counter() - t0) * 1000.0
    reply = res.get("reply", "")
    actions = res.get("actions", [])
    tools = [t.get("name") for t in res.get("tools_used", [])]
    
    action_ok = True
    if expected_action:
        action_ok = any(a.get("type") == expected_action for a in actions)
    
    status = "PASS" if (reply and action_ok) else "FAIL"
    if status == "FAIL":
        all_passed = False
    print(f"[{status}] ({persona.upper()}) {dt_ms:6.1f} ms | Tools: {tools} | Actions: {[a.get('type') for a in actions]}")
    print(f"   Prompt: {prompt}")
    first_line = reply.splitlines()[0] if reply else ""
    print(f"   Reply:  {first_line}")

if not all_passed:
    sys.exit(1)
print("\nALL 9 AGENTIC AI TESTS PASSED!")
