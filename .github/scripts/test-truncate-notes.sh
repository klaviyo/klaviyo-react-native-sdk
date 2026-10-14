#!/usr/bin/env bash
# Tests for truncate-notes.sh: both store caps (500 Play, 4000 TestFlight),
# the marker-always rule, cut order (body, then CI run line, never header
# lines), and multibyte safety.
# Usage: test-truncate-notes.sh (run from anywhere)
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
SCRIPT="$REPO_ROOT/.github/scripts/truncate-notes.sh"

WORK=$(mktemp -d)
trap 'rm -rf "$WORK"' EXIT

fail_count=0
fail() {
  echo "FAIL: $1"
  fail_count=$((fail_count + 1))
}
pass() { echo "PASS: $1"; }

# Compact header so arithmetic is easy; the real header has the same shape.
HEADER='RN Example 2.6.0 (12)
Klaviyo RN SDK 2.6.0 · master@abc1234
Klaviyo iOS SDK 5.4.1
Commit: abc1234 on master (push)
Built: 2026-10-14 02:00 UTC
CI run: https://github.com/klaviyo/klaviyo-react-native-sdk/actions/runs/1'
HLEN=${#HEADER}
BODY=$(printf 'line %.0s' $(seq 1 2000))

write_notes() { printf '%s\n\n%s' "$HEADER" "$BODY" > "$1"; }

for cap in 500 4000; do
  write_notes "$WORK/in.txt"

  # Body cut, header (incl. CI line) intact, marker present.
  out=$("$SCRIPT" "$cap" "$WORK/in.txt")
  [ "${#out}" -le "$cap" ] || fail "cap $cap: result ${#out} chars > cap"
  grep -q '^CI run:' <<<"$out" || fail "cap $cap: CI line dropped too early"
  grep -q '…\[truncated\]$' <<<"$out" || fail "cap $cap: marker missing"
  grep -q '^Built: 2026-10-14 02:00 UTC$' <<<"$out" || fail "cap $cap: Built line damaged"
  pass "cap $cap: body cut, header intact, marker present"
done

# 1. Cap just above header + marker with a long body: body dropped entirely,
#    marker appended, header (incl. CI line) intact.
write_notes "$WORK/t1.txt"
out=$("$SCRIPT" $((HLEN + 14)) "$WORK/t1.txt")
[ "${#out}" -le $((HLEN + 14)) ] || fail "cap header+14: over cap"
grep -q '…\[truncated\]$' <<<"$out" || fail "cap header+14: marker missing"
grep -q '^CI run:' <<<"$out" || fail "cap header+14: CI line dropped needlessly"
pass "cap header+14: bare-body cut still marked"

# 2. Cap == header length: marker cannot fit under the full header, so the CI
#    line drops; all other header lines intact, marker present.
write_notes "$WORK/t2.txt"
out=$("$SCRIPT" "$HLEN" "$WORK/t2.txt")
[ "${#out}" -le "$HLEN" ] || fail "cap header: over cap (${#out} > $HLEN)"
if grep -q '^CI run:' <<<"$out"; then
  fail "cap header: CI line survived"
fi
grep -q '^Built: 2026-10-14 02:00 UTC$' <<<"$out" || fail "cap header: Built line damaged"
grep -q '^Commit: abc1234 on master' <<<"$out" || fail "cap header: Commit line damaged"
grep -q '…\[truncated\]$' <<<"$out" || fail "cap header: marker missing"
pass "cap header: CI line dropped, rest of header intact, marker present"

# 3. Cap smaller than (header - CI line) + marker: fail loudly, never emit
#    unmarked or over-cap output.
NOCI='RN Example 2.6.0 (12)
Klaviyo RN SDK 2.6.0 · master@abc1234
Klaviyo iOS SDK 5.4.1
Commit: abc1234 on master (push)
Built: 2026-10-14 02:00 UTC'
write_notes "$WORK/t3.txt"
if "$SCRIPT" $((${#NOCI} + 5)) "$WORK/t3.txt" > "$WORK/t3.out" 2>/dev/null; then
  fail "impossible cap: expected non-zero exit"
else
  pass "impossible cap: fails loudly"
fi
if [ -s "$WORK/t3.out" ]; then
  fail "impossible cap: emitted output anyway"
fi

# 4. Body exactly fits: no marker.
EXACT_BODY='short body'
printf '%s\n\n%s' "$HEADER" "$EXACT_BODY" > "$WORK/t4.txt"
out=$("$SCRIPT" $((HLEN + 2 + ${#EXACT_BODY})) "$WORK/t4.txt")
if grep -q 'truncated' <<<"$out"; then
  fail "exact fit: marker present"
else
  pass "exact fit: no marker"
fi

# 5. Multibyte straddling the cut at both caps: no replacement characters.
MB_BODY=$(printf 'é🚀%.0s' $(seq 1 1500))
printf '%s\n\n%s' "$HEADER" "$MB_BODY" > "$WORK/t5.txt"
for cap in 500 4000; do
  out=$("$SCRIPT" "$cap" "$WORK/t5.txt")
  [ "${#out}" -le "$cap" ] || fail "multibyte cap $cap: over cap"
  if printf '%s' "$out" | grep -q $'\xEF\xBF\xBD'; then
    fail "multibyte cap $cap: replacement character in output"
  else
    pass "multibyte cap $cap: character-safe"
  fi
done

# Under cap: unchanged, no marker.
printf '%s' "$HEADER" > "$WORK/t6.txt"
out=$("$SCRIPT" 4000 "$WORK/t6.txt")
if [ "$out" = "$HEADER" ]; then
  pass "under cap: unchanged"
else
  fail "under cap: output modified"
fi

if [ "$fail_count" -gt 0 ]; then
  echo "$fail_count test(s) failed" >&2
  exit 1
fi
echo "all truncate-notes tests passed"
