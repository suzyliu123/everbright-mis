#!/usr/bin/env python3
"""Create a management-role account for suzy.liu@everbright.co.nz and write its
Firestore user doc (role=management). Mirrors the existing seeding logic."""

import urllib.request
import json

API_KEY = "AIzaSyBDPzU71h81re9leLkWzqqqG9Nz-Oqn1x0"
PROJECT = "everbright-mis-dev"
FIRESTORE_URL = f"https://firestore.googleapis.com/v1/projects/{PROJECT}/databases/(default)/documents"
PASSWORD = "EverBright2026!"
SUZY_EMAIL = "suzy.liu@everbright.co.nz"
SUZY_NAME = "Suzy Liu"
ADMIN_EMAIL = "admin@everbright.co.nz"

def post(url, payload):
    req = urllib.request.Request(
        url, data=json.dumps(payload).encode(),
        headers={"Content-Type": "application/json"})
    try:
        return json.loads(urllib.request.urlopen(req).read())
    except urllib.error.HTTPError as e:
        return json.loads(e.read())

def signup(email, password):
    return post(
        f"https://identitytoolkit.googleapis.com/v1/accounts:signUp?key={API_KEY}",
        {"email": email, "password": password, "returnSecureToken": True})

def signin(email, password):
    return post(
        f"https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key={API_KEY}",
        {"email": email, "password": password, "returnSecureToken": True})

def lookup_uid_by_email(id_token, email):
    """Query Firestore users collection for a doc with this email."""
    url = (f"{FIRESTORE_URL}/users:runQuery")
    body = {
        "structuredQuery": {
            "from": [{"collectionId": "users"}],
            "where": {"fieldFilter": {
                "field": {"fieldPath": "email"},
                "op": "EQUAL",
                "value": {"stringValue": email}}},
            "limit": 1,
        }
    }
    req = urllib.request.Request(
        url, data=json.dumps(body).encode(),
        headers={"Authorization": f"Bearer {id_token}",
                 "Content-Type": "application/json"})
    try:
        resp = json.loads(urllib.request.urlopen(req).read())
    except urllib.error.HTTPError as e:
        print("   query error:", e.code, e.read())
        return None
    for row in resp:
        if "document" in row:
            return row["document"]["name"].split("/")[-1]
    return None

# ---- Step 1: try to create suzy Auth account (signUp) ----
print(f"🔐 Creating Auth account for {SUZY_EMAIL} ...")
r = signup(SUZY_EMAIL, PASSWORD)
if "idToken" in r:
    suzy_uid = r["localId"]
    print(f"✅ Auth account created (uid: {suzy_uid})")
elif "EMAIL_EXISTS" in str(r.get("error", {}).get("message", "")):
    print("   email already exists -> looking up existing UID ...")
    # Sign in as admin to query Firestore for the existing user doc
    ar = signin(ADMIN_EMAIL, PASSWORD)
    if "idToken" not in ar:
        print("❌ Admin sign-in failed:", ar)
        raise SystemExit(1)
    admin_token = ar["idToken"]
    suzy_uid = lookup_uid_by_email(admin_token, SUZY_EMAIL)
    if not suzy_uid:
        print("❌ Could not find existing user doc and cannot sign in as suzy "
              "(unknown password). Please tell me the password you used, or "
              "I can reset it.")
        raise SystemExit(1)
    print(f"✅ Found existing Auth account (uid: {suzy_uid})")
else:
    print("❌ Unexpected error:", r)
    raise SystemExit(1)

# ---- Step 2: sign in as admin to get a privileged token ----
print(f"🔐 Signing in as {ADMIN_EMAIL} ...")
ar = signin(ADMIN_EMAIL, PASSWORD)
if "idToken" not in ar:
    print("❌ Admin sign-in failed:", ar)
    raise SystemExit(1)
ID_TOKEN = ar["idToken"]

# ---- Step 3: write Firestore user doc with role=management ----
def fs_value(v):
    if isinstance(v, str): return {"stringValue": v}
    return {"stringValue": str(v)}

fields = {
    "uid": fs_value(suzy_uid),
    "email": fs_value(SUZY_EMAIL),
    "displayName": fs_value(SUZY_NAME),
    "role": fs_value("management"),
    "type": fs_value(""),
    "createdAt": fs_value("2026-07-31T00:00:00Z"),
}
url = f"{FIRESTORE_URL}/users/{suzy_uid}"
data = json.dumps({"fields": fields}).encode()
headers = {"Authorization": f"Bearer {ID_TOKEN}", "Content-Type": "application/json"}
req = urllib.request.Request(url, data=data, method="PATCH")
for k, v in headers.items():
    req.add_header(k, v)
try:
    urllib.request.urlopen(req)
    print(f"✅ Firestore user doc written (role=management)")
except urllib.error.HTTPError as e:
    print(f"❌ Firestore write failed: {e.code} {json.loads(e.read())}")

print("\n🎉 Done.")
print(f"   Login: {SUZY_EMAIL} / {PASSWORD}")
