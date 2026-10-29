# Offline probe: owner login, invite a member, member accepts, member login, tracker session start.
import json, time, urllib.request as u, urllib.parse as p
E = "http://127.0.0.1"
class NoRedirect(u.HTTPRedirectHandler):
    def redirect_request(self, *a, **k): return None
op = u.build_opener(NoRedirect)
def call(method, path, body=None, jwt=None):
    r = u.Request(E + path, method=method, data=json.dumps(body).encode() if body else None,
                  headers={"Content-Type": "application/json", "User-Agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/120.0 Safari/537.36", **({"Authorization": f"Bearer {jwt}"} if jwt else {})})
    try: resp = op.open(r)
    except u.HTTPError as e: resp = e
    return resp.status, resp.headers, resp.read()
owner = json.loads(call("POST", "/api/login", {"email": "admin@example.com", "password": "Password123!"})[2])["jwt"]
proj = json.loads(call("GET", "/api/projects", jwt=owner)[2])["data"][0]
email = f"member{int(time.time())}@example.com"
inv = json.loads(call("POST", "/api/client/members", {"email": email, "name": "M", "admin": False}, owner)[2])["data"]["invitationLink"]
tok = p.parse_qs(p.urlparse(inv).query)["token"][0]
st, h, _ = call("GET", "/api/users/invitation?token=" + tok)
q = p.parse_qs(p.urlparse(h["location"]).query)
r = json.loads(call("POST", "/api/password/reset", {"invitation": q["invitation"][0], "pass": q["pass"][0], "password": "Member12345!"})[2])
m = json.loads(call("POST", "/api/login", {"email": email, "password": "Member12345!"})[2])
assert m.get("jwt"), m
st, _, b = call("GET", "/api/client/members", jwt=m["jwt"])
s = json.loads(call("POST", "/ingest/v1/web/start", {"projectKey": proj["projectKey"], "trackerVersion": "16.0.0", "revID": "",
     "timestamp": int(time.time() * 1000), "userAgent": "Mozilla/5.0 Chrome/120", "doNotTrack": False})[2])
assert s.get("token"), s
assert st in (401, 403), f"member reached an admin route: {st}"
print(f"OK owner+member({email}) login; member GET /client/members -> {st} (admin-only); session {s['sessionID']}")
