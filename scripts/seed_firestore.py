#!/usr/bin/env python3
"""Seed Firestore with test data using Firebase Auth + Firestore REST API"""

import urllib.request
import json
import time

API_KEY = "AIzaSyBDPzU71h81re9leLkWzqqqG9Nz-Oqn1x0"
PROJECT = "everbright-mis-dev"
FIRESTORE_URL = f"https://firestore.googleapis.com/v1/projects/{PROJECT}/databases/(default)/documents"

# ---- Step 1: Sign in as admin to get ID token ----
print("🔐 Signing in as admin...")
req = urllib.request.Request(
    f"https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key={API_KEY}",
    data=json.dumps({
        "email": "admin@everbright.co.nz",
        "password": "EverBright2026!",
        "returnSecureToken": True,
    }).encode(),
    headers={"Content-Type": "application/json"},
)
resp = json.loads(urllib.request.urlopen(req).read())
ID_TOKEN = resp["idToken"]
print(f"✅ Got ID token (expires in {resp['expiresIn']}s)")

def firestore_patch(path, fields):
    """Create/update a Firestore document"""
    url = f"{FIRESTORE_URL}/{path}"
    data = json.dumps({"fields": fields}).encode()
    headers = {
        "Authorization": f"Bearer {ID_TOKEN}",
        "Content-Type": "application/json",
    }
    req = urllib.request.Request(url, data=data, method="PATCH")
    for k, v in headers.items():
        req.add_header(k, v)
    try:
        urllib.request.urlopen(req)
        return True
    except urllib.error.HTTPError as e:
        print(f"  ❌ Error: {e.code} {json.loads(e.read())}")
        return False

def fs_value(v):
    """Convert Python value to Firestore field value"""
    if isinstance(v, str):
        return {"stringValue": v}
    elif isinstance(v, bool):
        return {"booleanValue": v}
    elif isinstance(v, int):
        return {"integerValue": str(v)}
    elif isinstance(v, float):
        return {"doubleValue": v}
    elif isinstance(v, dict):
        return {
            "mapValue": {
                "fields": {k: fs_value(v2) for k, v2 in v.items()}
            }
        }
    elif isinstance(v, list):
        return {
            "arrayValue": {
                "values": [fs_value(item) for item in v]
            }
        }
    return {"stringValue": str(v)}

# ---- Step 2: Seed Users ----
UID_MAP = {
    "admin@everbright.co.nz": "OHRev42Z2rYImPLCIOn6LeI8EVg2",
    "manager@everbright.co.nz": "x4Dwy6P8T5SPd3JGLPPNNlKztgn2",
    "james@everbright.co.nz": "RRG8D0MyEjYCwT1Nmk7jeCupcfw1",
    "sarah@everbright.co.nz": "pbpZ6jL6L0Y6Sswp6hRXVh2vko83",
    "michael@everbright.co.nz": "JPR8vzKysGNWnW364VrRyMItdWC2",
    "emma@everbright.co.nz": "H8sEth91EvhOq0DnK43710M7lpg1",
    "david@everbright.co.nz": "7qk7KSkO7QYskTdZhAD39ebg5Vw1",
}

USERS = [
    ("admin@everbright.co.nz", "Admin User", "admin"),
    ("manager@everbright.co.nz", "Manager User", "management"),
    ("james@everbright.co.nz", "James Chen", "adviser", "Mortgage"),
    ("sarah@everbright.co.nz", "Sarah Williams", "adviser", "Insurance"),
    ("michael@everbright.co.nz", "Michael Zhang", "adviser", "Mortgage"),
    ("emma@everbright.co.nz", "Emma Johnson", "adviser", "Both"),
    ("david@everbright.co.nz", "David Liu", "adviser", "Mortgage"),
]

print("\n👥 Seeding users...")
for email, name, role, *rest in USERS:
    uid = UID_MAP[email]
    fields = {
        "uid": fs_value(uid),
        "email": fs_value(email),
        "displayName": fs_value(name),
        "role": fs_value(role),
        "type": fs_value(rest[0] if rest else ""),
        "createdAt": fs_value("2026-01-15T00:00:00Z"),
    }
    ok = firestore_patch(f"users/{uid}", fields)
    if ok: print(f"  ✅ {email} ({role})")

# ---- Step 3: Seed Activities ----
ACTIVITIES = [
    {"id": "act1", "name": "Auckland Property Expo 2026", "category": "event", "status": "completed",
     "startDate": "2026-03-15", "endDate": "2026-03-16", "location": "Auckland Showgrounds",
     "qrCodeId": "EB-EXPO-AKL-001", "budget": 3500},
    {"id": "act2", "name": "First Home Buyer Seminar", "category": "event", "status": "completed",
     "startDate": "2026-05-20", "endDate": "2026-05-20", "location": "Christchurch Town Hall",
     "qrCodeId": "EB-SEM-CHC-001", "budget": 1200},
    {"id": "act3", "name": "Facebook Ads — Q2 Campaign", "category": "ongoing", "status": "active",
     "startDate": "2026-04-01", "endDate": "", "location": "",
     "qrCodeId": "", "budget": 2500},
    {"id": "act4", "name": "Google Ads — Mortgage", "category": "ongoing", "status": "active",
     "startDate": "2026-01-01", "endDate": "", "location": "",
     "qrCodeId": "", "budget": 3000},
    {"id": "act5", "name": "WeChat Official Account", "category": "ongoing", "status": "active",
     "startDate": "2026-02-01", "endDate": "", "location": "",
     "qrCodeId": "EB-WECHAT-001", "budget": 500},
]

print("\n📅 Seeding activities...")
for act in ACTIVITIES:
    aid = act.pop("id")
    fields = {k: fs_value(v) for k, v in act.items()}
    ok = firestore_patch(f"activities/{aid}", fields)
    if ok: print(f"  ✅ {act['name']}")

# ---- Step 4: Seed Leads ----
ADVISER_UIDS = {u[0]: UID_MAP[u[0]] for u in USERS if u[2] == "adviser"}

LEADS = [
    {"id": "lead1", "name": "John Smith", "phone": "021-111-2222", "email": "john.smith@email.com",
     "interest": "Loan", "status": "settled", "activityId": "act1",
     "assignedAdviser": ADVISER_UIDS["james@everbright.co.nz"],
     "firstTouch": {"channel": "QR Code", "date": "2026-03-15"},
     "settlementAmount": 850000, "lender": "ANZ"},
    {"id": "lead2", "name": "Lisa Wang", "phone": "027-333-4444", "email": "lisa.wang@email.com",
     "interest": "Both", "status": "submitted", "activityId": "act1",
     "assignedAdviser": ADVISER_UIDS["james@everbright.co.nz"],
     "firstTouch": {"channel": "QR Code", "date": "2026-03-16"},
     "settlementAmount": 620000, "lender": "ASB"},
    {"id": "lead3", "name": "Mike Taylor", "phone": "022-555-6666", "email": "mike.t@email.com",
     "interest": "Loan", "status": "settled", "activityId": "act1",
     "assignedAdviser": ADVISER_UIDS["sarah@everbright.co.nz"],
     "firstTouch": {"channel": "QR Code", "date": "2026-03-15"},
     "settlementAmount": 420000, "lender": "Westpac"},
    {"id": "lead4", "name": "Amy Chen", "phone": "021-777-8888", "email": "amy.chen@email.com",
     "interest": "Insurance", "status": "settled", "activityId": "act1",
     "assignedAdviser": ADVISER_UIDS["sarah@everbright.co.nz"],
     "firstTouch": {"channel": "QR Code", "date": "2026-03-16"},
     "annualPremium": 2400, "insurer": "AIA"},
    {"id": "lead5", "name": "Tom Brown", "phone": "027-999-0000", "email": "tom.brown@email.com",
     "interest": "Loan", "status": "active", "activityId": "act2",
     "assignedAdviser": ADVISER_UIDS["michael@everbright.co.nz"],
     "firstTouch": {"channel": "Event Sign-up", "date": "2026-05-20"}},
    {"id": "lead6", "name": "Grace Lee", "phone": "021-121-1314", "email": "grace.lee@email.com",
     "interest": "Loan", "status": "settled", "activityId": "act2",
     "assignedAdviser": ADVISER_UIDS["michael@everbright.co.nz"],
     "firstTouch": {"channel": "Event Sign-up", "date": "2026-05-20"},
     "settlementAmount": 550000, "lender": "BNZ"},
    {"id": "lead7", "name": "David Park", "phone": "022-151-1617", "email": "david.park@email.com",
     "interest": "Loan", "status": "lost", "activityId": "act2",
     "assignedAdviser": ADVISER_UIDS["james@everbright.co.nz"],
     "firstTouch": {"channel": "Event Sign-up", "date": "2026-05-20"}},
    {"id": "lead8", "name": "Sophie White", "phone": "027-181-9202", "email": "sophie.w@email.com",
     "interest": "Insurance", "status": "submitted", "activityId": "act2",
     "assignedAdviser": ADVISER_UIDS["sarah@everbright.co.nz"],
     "firstTouch": {"channel": "Referral", "date": "2026-05-21"},
     "annualPremium": 3100, "insurer": "Southern Cross"},
    {"id": "lead9", "name": "Kevin Hu", "phone": "021-222-3333", "email": "kevin.hu@email.com",
     "interest": "Loan", "status": "settled", "activityId": "act3",
     "assignedAdviser": ADVISER_UIDS["david@everbright.co.nz"],
     "firstTouch": {"channel": "Facebook", "date": "2026-04-15"},
     "settlementAmount": 720000, "lender": "ANZ"},
    {"id": "lead10", "name": "Rachel Kim", "phone": "027-444-5555", "email": "rachel.kim@email.com",
     "interest": "Both", "status": "submitted", "activityId": "act3",
     "assignedAdviser": ADVISER_UIDS["emma@everbright.co.nz"],
     "firstTouch": {"channel": "Facebook", "date": "2026-05-10"},
     "settlementAmount": 480000, "lender": "ASB"},
    {"id": "lead11", "name": "Oliver Zhang", "phone": "022-666-7777", "email": "oliver.z@email.com",
     "interest": "Loan", "status": "active", "activityId": "act4",
     "assignedAdviser": ADVISER_UIDS["michael@everbright.co.nz"],
     "firstTouch": {"channel": "Google", "date": "2026-06-01"}},
    {"id": "lead12", "name": "Emma Watson", "phone": "021-888-9999", "email": "emma.w@email.com",
     "interest": "Insurance", "status": "settled", "activityId": "act4",
     "assignedAdviser": ADVISER_UIDS["sarah@everbright.co.nz"],
     "firstTouch": {"channel": "Google", "date": "2026-03-20"},
     "annualPremium": 1800, "insurer": "AIA"},
    {"id": "lead13", "name": "James Li", "phone": "027-101-1112", "email": "james.li@email.com",
     "interest": "Loan", "status": "lost", "activityId": "act4",
     "assignedAdviser": ADVISER_UIDS["david@everbright.co.nz"],
     "firstTouch": {"channel": "Google", "date": "2026-05-05"}},
    {"id": "lead14", "name": "Lucy Zhao", "phone": "022-131-1415", "email": "lucy.z@email.com",
     "interest": "Both", "status": "active", "activityId": "act5",
     "assignedAdviser": ADVISER_UIDS["emma@everbright.co.nz"],
     "firstTouch": {"channel": "WeChat", "date": "2026-06-20"}},
    {"id": "lead15", "name": "Ryan Patel", "phone": "021-161-1718", "email": "ryan.p@email.com",
     "interest": "Loan", "status": "settled", "activityId": "act5",
     "assignedAdviser": ADVISER_UIDS["james@everbright.co.nz"],
     "firstTouch": {"channel": "WeChat", "date": "2026-04-10"},
     "settlementAmount": 390000, "lender": "BNZ"},
]

print("\n📝 Seeding leads...")
for lead in LEADS:
    lid = lead.pop("id")
    fields = {k: fs_value(v) for k, v in lead.items()}
    ok = firestore_patch(f"leads/{lid}", fields)
    if ok: print(f"  ✅ {lead['name']} ({lead['status']})")

# ---- Step 5: Seed WeChat Records ----
WECHAT = [
    {"act1": {"james": 30, "sarah": 28, "michael": 27}},
    {"act2": {"michael": 15, "sarah": 22, "james": 18}},
    {"act3": {"david": 45, "emma": 50}},
    {"act4": {"michael": 35, "sarah": 40, "david": 25}},
    {"act5": {"emma": 55, "james": 60}},
]

print("\n💬 Seeding WeChat records...")
for entry in WECHAT:
    for activity, advisers in entry.items():
        for adviser_name, count in advisers.items():
            uid = ADVISER_UIDS.get(f"{adviser_name}@everbright.co.nz", "")
            wid = f"wc_{activity}_{adviser_name}"
            fields = {
                "activityId": fs_value(activity),
                "adviserId": fs_value(uid),
                "count": fs_value(count),
                "dateAdded": fs_value("2026-06-01"),
            }
            ok = firestore_patch(f"wechat_records/{wid}", fields)
            if ok: print(f"  ✅ {activity}/{adviser_name}: {count} WeChat")

print("\n🎉 Seed complete!")
print("Test accounts:")
print("  admin@everbright.co.nz / EverBright2026! (admin)")
print("  manager@everbright.co.nz / EverBright2026! (management)")
print("  james@everbright.co.nz / EverBright2026! (adviser)")
