#!/usr/bin/env python3
"""Create 7 test users in Firebase Auth via REST API"""

import urllib.request
import json

API_KEY = "AIzaSyBDPzU71h81re9leLkWzqqqG9Nz-Oqn1x0"
PASSWORD = "EverBright2026!"

USERS = [
    ("admin@everbright.co.nz", "Admin User", "admin"),
    ("manager@everbright.co.nz", "Manager User", "management"),
    ("james@everbright.co.nz", "James Chen", "adviser"),
    ("sarah@everbright.co.nz", "Sarah Williams", "adviser"),
    ("michael@everbright.co.nz", "Michael Zhang", "adviser"),
    ("emma@everbright.co.nz", "Emma Johnson", "adviser"),
    ("david@everbright.co.nz", "David Liu", "adviser"),
]

CREATED = 0
FAILED = 0
UIDS = {}

for email, display_name, role in USERS:
    # Sign up
    req = urllib.request.Request(
        f"https://identitytoolkit.googleapis.com/v1/accounts:signUp?key={API_KEY}",
        data=json.dumps({
            "email": email,
            "password": PASSWORD,
            "returnSecureToken": True,
        }).encode(),
        headers={"Content-Type": "application/json"},
    )
    try:
        resp = json.loads(urllib.request.urlopen(req).read())
    except urllib.error.HTTPError as e:
        resp = json.loads(e.read())

    if "idToken" in resp:
        uid = resp["localId"]
        id_token = resp["idToken"]
        print(f"✅ Created: {email} (uid: {uid}, role: {role})")

        # Update display name
        req2 = urllib.request.Request(
            f"https://identitytoolkit.googleapis.com/v1/accounts:update?key={API_KEY}",
            data=json.dumps({
                "idToken": id_token,
                "displayName": display_name,
                "returnSecureToken": True,
            }).encode(),
            headers={"Content-Type": "application/json"},
        )
        urllib.request.urlopen(req2)
        UIDS[email] = uid
        CREATED += 1

    elif "EMAIL_EXISTS" in str(resp.get("error", {}).get("message", "")):
        print(f"⏭️  Already exists: {email}")
        # Need to sign in to get UID
        req3 = urllib.request.Request(
            f"https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key={API_KEY}",
            data=json.dumps({
                "email": email,
                "password": PASSWORD,
                "returnSecureToken": True,
            }).encode(),
            headers={"Content-Type": "application/json"},
        )
        try:
            resp3 = json.loads(urllib.request.urlopen(req3).read())
            UIDS[email] = resp3["localId"]
            print(f"   UID retrieved: {resp3['localId']}")
        except:
            pass
    else:
        err = resp.get("error", {}).get("message", "unknown")
        print(f"❌ Failed: {email} — {err}")
        FAILED += 1

print(f"\n=== Summary: {CREATED} created, {FAILED} failed ===")

# Output UIDs for seeding Firestore
print("\n# UIDs for seed script:")
for email, uid in UIDS.items():
    print(f"  {email}: {uid}")
