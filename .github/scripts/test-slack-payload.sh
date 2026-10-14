#!/usr/bin/env bash
# Tests for slack-payload.sh: the payload is valid JSON for multiline text,
# quotes, backslashes and unicode, and keeps the text intact.
# Usage: test-slack-payload.sh (run from anywhere)
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
SCRIPT="$REPO_ROOT/.github/scripts/slack-payload.sh"
WORK=$(mktemp -d)
trap 'rm -rf "$WORK"' EXIT

fail_count=0
fail() {
  echo "FAIL: $1"
  fail_count=$((fail_count + 1))
}
pass() { echo "PASS: $1"; }

# expect_eq <name> <expected> <actual>
expect_eq() {
  if [ "$2" = "$3" ]; then pass "$1"; else fail "$1: expected '$2' got '$3'"; fi
}

# 1. Multiline success message: valid JSON, first line is the fallback text,
#    the section carries the whole message.
cat >"$WORK/msg.txt" <<'MSG'
✅ RN Example (iOS) → TestFlight
*Build:* 2.6.0-rc.1 (12)
*Source:* release v2.6.0-rc.1 (release)
*Commit:* <https://github.com/o/r/commit/abc1234|abc1234> · <https://github.com/o/r/actions/runs/1|CI run>
MSG
payload=$("$SCRIPT" "$WORK/msg.txt")
if jq -e . >/dev/null <<<"$payload"; then pass "multiline message yields valid JSON"; else fail "invalid JSON"; fi
expect_eq "first line is the fallback text" "✅ RN Example (iOS) → TestFlight" "$(jq -r .text <<<"$payload")"
expect_eq "section holds the full message" "$(cat "$WORK/msg.txt")" "$(jq -r '.blocks[0].text.text' <<<"$payload")"
expect_eq "section is mrkdwn" "mrkdwn" "$(jq -r '.blocks[0].text.type' <<<"$payload")"

# 2. Quotes, backslashes and metacharacters in the message.
cat >"$WORK/hostile.txt" <<'HOSTILE'
line one "quoted"
path C:\dir and `tick` and $(x) and : colon
HOSTILE
payload=$("$SCRIPT" "$WORK/hostile.txt")
if jq -e . >/dev/null <<<"$payload"; then pass "hostile characters yield valid JSON"; else fail "hostile JSON invalid"; fi
expect_eq "hostile text round-trips" "$(cat "$WORK/hostile.txt")" "$(jq -r '.blocks[0].text.text' <<<"$payload")"

# 3. Single-line message without a trailing newline.
printf 'only one line' >"$WORK/one.txt"
payload=$("$SCRIPT" "$WORK/one.txt")
expect_eq "single line message" "only one line" "$(jq -r .text <<<"$payload")"

# 4. Missing file and wrong usage fail loudly.
if "$SCRIPT" "$WORK/nope.txt" >/dev/null 2>&1; then fail "missing file should fail"; else pass "missing file fails"; fi
if "$SCRIPT" >/dev/null 2>&1; then fail "no args should fail"; else pass "no args fails"; fi

if [ "$fail_count" -gt 0 ]; then
  echo "$fail_count test(s) failed"
  exit 1
fi
echo "All slack-payload tests passed"
