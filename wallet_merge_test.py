import json, time, urllib.request, urllib.error, urllib.parse

BASE = "https://villeconnect-production.up.railway.app/api/trpc"
TS = int(time.time())

def call(method, path, payload=None, token=None):
    if method == "GET":
        url = f"{BASE}/{path}?input={urllib.parse.quote(json.dumps(payload or {}))}"
        req = urllib.request.Request(url, method="GET")
    else:
        url = f"{BASE}/{path}"
        data = json.dumps(payload or {}).encode()
        req = urllib.request.Request(url, data=data, method="POST")
        req.add_header("Content-Type", "application/json")
    req.add_header("Accept", "application/json")
    if token:
        req.add_header("Authorization", f"Bearer {token}")
    try:
        with urllib.request.urlopen(req, timeout=20) as resp:
            body = json.loads(resp.read().decode())
            return body.get("result", {}).get("data"), None
    except urllib.error.HTTPError as e:
        try:
            body = json.loads(e.read().decode())
            return None, body.get("error", {}).get("message", str(e))
        except Exception:
            return None, str(e)

results = []
def check(label, cond, detail=""):
    status = "PASS" if cond else "FAIL"
    results.append((status, label, detail))
    print(f"[{status}] {label} {detail}")

# ============================================================
# TEST 1 : invité avec wallet + mission -> création de compte
# ============================================================
print("\n=== TEST 1: invité avec wallet -> création compte ===")
open_a = f"test-a-{TS}"
w, err = call("GET", "wallet.getWallet", {"openId": open_a, "postalCode": "7370"})
check("T1 guest wallet créé (50 CL bonus)", w and w["available_balance"] == 50, str(w))

devtok, err = call("POST", "auth.deviceLogin", {"openId": open_a})
devtok = devtok["token"] if devtok else None
check("T1 device token obtenu", devtok is not None)

mc, err = call("POST", "wallet.completeMission", {"missionId": 2}, token=devtok)
check("T1 mission 2 complétée en invité (+30)", mc is not None, str(err))

email1 = f"walletcheck1-{TS}@mailinator.com"
password1 = "WalletTest2026!"
reg, err = call("POST", "auth.register", {"email": email1, "password": password1, "deviceOpenId": open_a})
check("T1 register avec deviceOpenId (claim en place)", reg is not None and reg.get("success"), str(err))

login1, err = call("POST", "auth.login", {"email": email1, "password": password1, "deviceOpenId": open_a, "platform": "test"})
check("T1 login juste après register", login1 is not None, str(err))
token1 = login1["accessToken"] if login1 else None

mw, err = call("GET", "wallet.getMyWallet", {}, token=token1)
check("T1 getMyWallet conserve 80 CL (50 bonus + 30 mission)", mw and mw["available_balance"] == 80, str(mw))

# ============================================================
# TEST 2 : compte existant (account2) + invité séparé -> login = FUSION
# ============================================================
print("\n=== TEST 2: invité avec wallet -> login vers un AUTRE compte existant (fusion) ===")
email2 = f"walletcheck2-{TS}@mailinator.com"
password2 = "WalletTest2026!"
reg2, err = call("POST", "auth.register", {"email": email2, "password": password2})
check("T2 compte 2 créé (sans deviceOpenId)", reg2 is not None and reg2.get("success"), str(err))

login2_first, err = call("POST", "auth.login", {"email": email2, "password": password2, "platform": "test"})
check("T2 premier login compte 2 OK", login2_first is not None, str(err))
token2_first = login2_first["accessToken"] if login2_first else None

mw2_first, err = call("GET", "wallet.getMyWallet", {}, token=token2_first)
check("T2 wallet compte 2 = 50 CL (bonus bienvenue)", mw2_first and mw2_first["available_balance"] == 50, str(mw2_first))

# device B : invité indépendant avec wallet + mission différente (mission 3, 20 CL)
open_b = f"test-b-{TS}"
wb, err = call("GET", "wallet.getWallet", {"openId": open_b, "postalCode": "7370"})
check("T2 guest B wallet créé (50 CL)", wb and wb["available_balance"] == 50, str(wb))
devtok_b, err = call("POST", "auth.deviceLogin", {"openId": open_b})
devtok_b = devtok_b["token"] if devtok_b else None
mcb, err = call("POST", "wallet.completeMission", {"missionId": 3}, token=devtok_b)
check("T2 guest B complète mission 3 (+20)", mcb is not None, str(err))

wb2, err = call("GET", "wallet.getWallet", {"openId": open_b, "postalCode": "7370"})
check("T2 guest B solde = 70 avant fusion", wb2 and wb2["available_balance"] == 70, str(wb2))

# LOGIN vers compte 2 en indiquant l'openId de l'appareil B -> doit fusionner
login2_merge, err = call("POST", "auth.login", {"email": email2, "password": password2, "deviceOpenId": open_b, "platform": "test"})
check("T2 login compte 2 avec deviceOpenId=B (déclenche fusion)", login2_merge is not None, str(err))
token2_b = login2_merge["accessToken"] if login2_merge else None

mw2_after, err = call("GET", "wallet.getMyWallet", {}, token=token2_b)
expected = 50 + 70  # bonus compte2 + (bonus+mission de l'invité B)
check(f"T2 wallet compte 2 après fusion = {expected} CL (aucune perte, aucun doublon)",
      mw2_after and mw2_after["available_balance"] == expected, str(mw2_after))

# ============================================================
# TEST 3 : compte existant -> nouveau device SANS activité invité
# ============================================================
print("\n=== TEST 3: compte existant -> connexion sur nouveau device (aucune activité invité) ===")
open_c = f"test-c-{TS}"  # jamais utilisé nulle part
login2_devc, err = call("POST", "auth.login", {"email": email2, "password": password2, "deviceOpenId": open_c, "platform": "test"})
check("T3 login compte 2 depuis device C (jamais vu)", login2_devc is not None, str(err))
token2_c = login2_devc["accessToken"] if login2_devc else None

mw2_devc, err = call("GET", "wallet.getMyWallet", {}, token=token2_c)
check(f"T3 wallet identique sur device C ({expected} CL, pas de wallet fantôme)",
      mw2_devc and mw2_devc["available_balance"] == expected, str(mw2_devc))

# ============================================================
# TEST 4 : mission complétée APRÈS login (device C, compte 2)
# ============================================================
print("\n=== TEST 4: mission complétée après login ===")
mc4, err = call("POST", "wallet.completeMission", {"missionId": 4}, token=token2_c)
check("T4 mission 4 complétée après login (+40)", mc4 is not None, str(err))
mw2_after4, err = call("GET", "wallet.getMyWallet", {}, token=token2_c)
expected4 = expected + 40
check(f"T4 wallet = {expected4} CL après mission post-login",
      mw2_after4 and mw2_after4["available_balance"] == expected4, str(mw2_after4))

# ============================================================
# TEST 5 : double validation mission (doit être refusée)
# ============================================================
print("\n=== TEST 5: double validation mission ===")
mc5, err5 = call("POST", "wallet.completeMission", {"missionId": 4}, token=token2_c)
check("T5 2e validation mission 4 REFUSÉE (CONFLICT)", mc5 is None and err5 and "déjà validée" in err5, str(err5))
mw2_after5, err = call("GET", "wallet.getMyWallet", {}, token=token2_c)
check(f"T5 wallet inchangé après tentative de doublon ({expected4} CL)",
      mw2_after5 and mw2_after5["available_balance"] == expected4, str(mw2_after5))

# ============================================================
# TEST 6 : relance de la même fusion (idempotence)
# ============================================================
print("\n=== TEST 6: relance de la même fusion (idempotence) ===")
login2_replay, err = call("POST", "auth.login", {"email": email2, "password": password2, "deviceOpenId": open_b, "platform": "test"})
check("T6 re-login avec le MÊME deviceOpenId=B déjà fusionné", login2_replay is not None, str(err))
token2_replay = login2_replay["accessToken"] if login2_replay else None
mw2_replay, err = call("GET", "wallet.getMyWallet", {}, token=token2_replay)
check(f"T6 wallet INCHANGÉ après re-fusion ({expected4} CL, pas de double crédit)",
      mw2_replay and mw2_replay["available_balance"] == expected4, str(mw2_replay))

# ============================================================
# TEST 7 : lecture wallet connecté sur 2 appareils
# ============================================================
print("\n=== TEST 7: wallet identique sur 2 appareils (device C et device B/replay) ===")
mw_devB, err = call("GET", "wallet.getMyWallet", {}, token=token2_replay)
mw_devC, err = call("GET", "wallet.getMyWallet", {}, token=token2_c)
check("T7 même solde vu depuis 2 appareils différents du même compte",
      mw_devB and mw_devC and mw_devB["available_balance"] == mw_devC["available_balance"] == expected4,
      f"devB={mw_devB}, devC={mw_devC}")

print("\n\n=== RESUME ===")
passed = sum(1 for s, _, _ in results if s == "PASS")
failed = sum(1 for s, _, _ in results if s == "FAIL")
print(f"{passed} PASS / {failed} FAIL sur {len(results)} verifications")
for s, l, d in results:
    if s == "FAIL":
        print(f"  ECHEC: {l} -> {d}")

# ============================================================
# TEST 8 : getMyTransactions protégé + mode invité non connecté
# ============================================================
print("\n=== TEST 8: getMyTransactions protégé + endpoints invité toujours actifs ===")
tx, err = call("GET", "wallet.getMyTransactions", {"limit": 10}, token=token2_c)
check("T8 getMyTransactions (connecté) retourne l'historique", tx is not None and len(tx) > 0, str(tx)[:200] if tx else str(err))
labels = [t.get("label","") for t in (tx or [])]
check("T8 historique contient la trace de fusion", any("Fusion" in l for l in labels), str(labels))

tx_noauth, err_noauth = call("GET", "wallet.getMyTransactions", {"limit": 5})
check("T8 getMyTransactions SANS token -> refusé (UNAUTHORIZED)", tx_noauth is None and err_noauth is not None, str(err_noauth))

open_guest, err = call("GET", "wallet.getWallet", {"openId": f"test-guest-{TS}", "postalCode": "7370"})
check("T8 endpoint invité wallet.getWallet toujours fonctionnel", open_guest is not None, str(open_guest))
tx_guest, err = call("GET", "wallet.getTransactions", {"openId": f"test-guest-{TS}", "limit": 5})
check("T8 endpoint invité wallet.getTransactions toujours fonctionnel", tx_guest is not None, str(tx_guest))

# ============================================================
# TEST 9 : jamais de fusion entre deux vrais comptes
# ============================================================
print("\n=== TEST 9: aucune fusion entre deux vrais comptes ===")
email3 = f"walletcheck3-{TS}@mailinator.com"
password3 = "WalletTest2026!"
reg3, err = call("POST", "auth.register", {"email": email3, "password": password3})
check("T9 compte 3 créé", reg3 is not None, str(err))
login3, err = call("POST", "auth.login", {"email": email3, "password": password3, "platform": "test"})
token3 = login3["accessToken"] if login3 else None
mw3_before, _ = call("GET", "wallet.getMyWallet", {}, token=token3)

# On récupère l'openId RÉEL du compte 3 (celui stocké en base, retourné via me)
# puis on tente de logguer sur le compte 2 en prétendant que ce openId est le device courant.
me3, err = call("GET", "auth.me", {}, token=token3)
# openId du compte3 n'est pas exposé par auth.me -> on simule autrement : on relance login
# compte3 avec deviceOpenId = openId connu du compte 2 (obtenu plus haut : open_c a été
# rattaché au compte2, donc son openId réel EST open_c désormais si jamais reclaimé -
# on utilise plutôt open_b, qui appartient définitivement (avant fusion) à un flux invité,
# mais qui est maintenant merged_into_user_id=compte2. Un donor déjà fusionné doit rester no-op.
login_cross, err = call("POST", "auth.login", {"email": email3, "password": password3, "deviceOpenId": open_b, "platform": "test"})
check("T9 login compte3 avec openId déjà fusionné (compte2) -> no-op, pas de crash", login_cross is not None, str(err))
mw3_after, _ = call("GET", "wallet.getMyWallet", {}, token=login_cross["accessToken"] if login_cross else None)
check("T9 wallet compte3 INCHANGÉ (aucune fusion croisée vers un autre vrai compte)",
      mw3_before and mw3_after and mw3_before["available_balance"] == mw3_after["available_balance"],
      f"before={mw3_before}, after={mw3_after}")
mw2_untouched, _ = call("GET", "wallet.getMyWallet", {}, token=token2_c)
check("T9 wallet compte2 INTACT (pas pollué par la tentative croisée)",
      mw2_untouched and mw2_untouched["available_balance"] == 160, str(mw2_untouched))

print("\n\n=== RESUME FINAL ===")
passed = sum(1 for s, _, _ in results if s == "PASS")
failed = sum(1 for s, _, _ in results if s == "FAIL")
print(f"{passed} PASS / {failed} FAIL sur {len(results)} verifications")
for s, l, d in results:
    if s == "FAIL":
        print(f"  ECHEC: {l} -> {d}")

print("\nOPEN_IDS_FOR_DB_CHECK", json.dumps({"open_a": open_a, "open_b": open_b, "open_c": open_c}))
