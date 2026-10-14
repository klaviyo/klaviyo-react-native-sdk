#!/usr/bin/env bash
# Mock tests for play-publish.sh: a stub `gcloud` prints a fake token and a
# local python http.server stands in for the Play API (via PLAY_API_BASE /
# PLAY_UPLOAD_API_BASE). No network.
# Usage: test-play-publish.sh  (run from anywhere; requires python3, jq, curl)
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
SCRIPT="$REPO_ROOT/.github/scripts/play-publish.sh"
export PACKAGE_NAME=com.example.app

WORK=$(mktemp -d)
trap 'kill "$SERVER_PID" 2>/dev/null || true; rm -rf "$WORK"' EXIT

# Stub gcloud: only the token print matters.
mkdir -p "$WORK/bin"
cat > "$WORK/bin/gcloud" <<'EOF'
#!/usr/bin/env bash
echo fake-token
EOF
chmod +x "$WORK/bin/gcloud"
export PATH="$WORK/bin:$PATH"

# Mock Play API. State lives in $WORK/state so the scenario can change
# between calls within one test (e.g. upload succeeds but commit conflicts).
mkdir -p "$WORK/state"
cat > "$WORK/server.py" <<'EOF'
import json
import os
import re
from http.server import BaseHTTPRequestHandler, HTTPServer

STATE = os.environ["MOCK_STATE_DIR"]
PKG = os.environ["PACKAGE_NAME"]


def read_state(name, default):
    try:
        with open(os.path.join(STATE, name)) as fh:
            return json.load(fh)
    except (OSError, ValueError):
        return default


class Handler(BaseHTTPRequestHandler):
    def log_message(self, *args):
        pass

    def _send(self, body, status=200):
        data = json.dumps(body).encode()
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(data)))
        self.end_headers()
        self.wfile.write(data)

    def _body(self):
        length = int(self.headers.get("Content-Length") or 0)
        return self.rfile.read(length)

    def _route(self, method):
        path = self.path.split("?", 1)[0]
        if method == "POST" and re.fullmatch(rf"/androidpublisher/v3/applications/{PKG}/edits", path):
            self._send({"id": "edit-1"})
        elif method == "GET" and path.endswith("/edits/edit-1/bundles"):
            highest = read_state("highest", [100, 250])
            self._send({"bundles": [{"versionCode": c} for c in highest]})
        elif method == "POST" and path.endswith("/edits/edit-1/bundles"):
            scenario = read_state("scenario", {})
            if scenario.get("upload_conflict"):
                self._send({"error": {"message": "Version code 300 has already been used"}}, 403)
                return
            self._send({"versionCode": scenario.get("reported_code", 300)})
        elif method == "PUT" and "/tracks/" in path:
            self._send({})
        elif method == "POST" and path.endswith(":commit"):
            scenario = read_state("scenario", {})
            if scenario.get("commit_conflict"):
                self._send({"error": {"message": "apkUpgradeVersionConflict"}}, 400)
                return
            self._send({})
        elif method == "DELETE" and "/edits/" in path:
            self._send({})
        elif method == "POST" and "/internalappsharing/" in path and path.endswith("/artifacts/bundle"):
            self._send({"downloadUrl": "https://play.google.com/apps/test/RQ fake/1"})
        else:
            self._send({"error": {"message": f"no route {method} {path}"}}, 404)

    def do_GET(self):
        self._route("GET")

    def do_POST(self):
        self._body()  # drain so the connection stays usable
        self._route("POST")

    def do_PUT(self):
        self._body()
        self._route("PUT")

    def do_DELETE(self):
        self._route("DELETE")


server = HTTPServer(("127.0.0.1", 0), Handler)
with open(os.path.join(STATE, "port"), "w") as fh:
    fh.write(str(server.server_address[1]))
server.serve_forever()
EOF

export MOCK_STATE_DIR="$WORK/state"
python3 -I "$WORK/server.py" &
SERVER_PID=$!
for _ in $(seq 1 50); do
  [ -f "$WORK/state/port" ] && break
  sleep 0.1
done
PORT=$(cat "$WORK/state/port")
export PLAY_API_BASE="http://127.0.0.1:$PORT/androidpublisher/v3"
export PLAY_UPLOAD_API_BASE="http://127.0.0.1:$PORT/upload/androidpublisher/v3"

touch "$WORK/app.aab"
fail_count=0

fail() { echo "FAIL: $1"; fail_count=$((fail_count + 1)); }
pass() { echo "PASS: $1"; }

set_scenario() { printf '%s' "$1" > "$WORK/state/scenario"; }

# 1. highest-version-code returns the max.
out=$("$SCRIPT" highest-version-code)
if [ "$out" = "250" ]; then pass "highest-version-code"; else fail "highest-version-code: got '$out'"; fi

# 2. Successful upload: exit 0, notes forwarded to the track update.
set_scenario '{}'
echo "release notes text" > "$WORK/notes.txt"
out=$("$SCRIPT" upload "$WORK/app.aab" 300 internal "$WORK/notes.txt")
if grep -q "Published versionCode 300" <<<"$out"; then pass "upload success"; else fail "upload success: $out"; fi

# 3. versionCode conflict at upload exits 75.
set_scenario '{"upload_conflict": true}'
set +e
"$SCRIPT" upload "$WORK/app.aab" 300 internal >/dev/null 2>&1
status=$?
set -e
if [ "$status" -eq 75 ]; then pass "upload conflict exits 75"; else fail "upload conflict: exit $status"; fi

# 4. versionCode conflict at commit exits 75.
set_scenario '{"commit_conflict": true}'
set +e
"$SCRIPT" upload "$WORK/app.aab" 300 internal >/dev/null 2>&1
status=$?
set -e
if [ "$status" -eq 75 ]; then pass "commit conflict exits 75"; else fail "commit conflict: exit $status"; fi

# 5. Play reporting a different versionCode than requested exits 1.
set_scenario '{"reported_code": 301}'
set +e
"$SCRIPT" upload "$WORK/app.aab" 300 internal >/dev/null 2>&1
status=$?
set -e
if [ "$status" -eq 1 ]; then pass "versionCode mismatch exits 1"; else fail "versionCode mismatch: exit $status"; fi

# 6. internal-sharing prints the downloadUrl.
set_scenario '{}'
out=$("$SCRIPT" internal-sharing "$WORK/app.aab")
url=$(tail -1 <<<"$out")
if [ "$url" = "https://play.google.com/apps/test/RQ fake/1" ]; then pass "internal-sharing downloadUrl"; else fail "internal-sharing: got '$out'"; fi

if [ "$fail_count" -gt 0 ]; then
  echo "$fail_count test(s) failed"
  exit 1
fi
echo "All play-publish tests passed"
