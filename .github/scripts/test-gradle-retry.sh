#!/usr/bin/env bash
# Smoke test for gradle-retry.sh using a fake ./gradlew in a temp dir.
# Usage: test-gradle-retry.sh  (run from anywhere)
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
SCRIPT="$REPO_ROOT/.github/scripts/gradle-retry.sh"
export RETRY_DELAY_SECONDS=0

fail_count=0

fail() {
  echo "FAIL: $1"
  fail_count=$((fail_count + 1))
}

pass() {
  echo "PASS: $1"
}

# Creates a temp dir with a fake gradlew. $1: failures before success,
# $2: error line to print on failure.
make_fake_gradle() {
  local dir failures error_line
  dir=$(mktemp -d)
  failures="$1"
  error_line="$2"
  cat > "$dir/gradlew" << EOF
#!/usr/bin/env bash
count_file="\$TMPDIR_FAKE/count"
mkdir -p "\$TMPDIR_FAKE"
count=\$(cat "\$count_file" 2>/dev/null || echo 0)
count=\$((count + 1))
echo "\$count" > "\$count_file"
echo "attempt \$count: extra args: \$*"
if [ "\$count" -le $failures ]; then
  echo "$error_line" >&2
  exit 1
fi
echo "BUILD SUCCESSFUL"
exit 0
EOF
  chmod +x "$dir/gradlew"
  echo "$dir"
}

# 1. Fails twice with a dependency-resolution error, then succeeds.
dir=$(make_fake_gradle 2 "Could not resolve com.github.klaviyo.klaviyo-android-sdk:core:main-SNAPSHOT")
export TMPDIR_FAKE="$dir"
output=$(cd "$dir" && MAX_ATTEMPTS=3 "$SCRIPT" :app:bundleRelease 2>&1) || fail "retry-then-succeed: script exited non-zero"
attempts=$(grep -c "Gradle attempt" <<< "$output" || true)
[ "$attempts" -eq 3 ] || fail "retry-then-succeed: expected 3 attempts, got $attempts"
grep -q -- "--refresh-dependencies" <<< "$output" || fail "retry-then-succeed: expected --refresh-dependencies on retries"
[ "$attempts" -eq 3 ] && grep -q -- "--refresh-dependencies" <<< "$output" && pass "retry-then-succeed"
rm -rf "$dir"

# 2. Fails with a non-dependency error: must not retry.
dir=$(make_fake_gradle 9 "Execution failed for task ':app:compileReleaseKotlin'")
export TMPDIR_FAKE="$dir"
set +e
output=$(cd "$dir" && MAX_ATTEMPTS=3 "$SCRIPT" :app:bundleRelease 2>&1)
status=$?
set -e
[ "$status" -ne 0 ] || fail "non-dependency failure: expected non-zero exit"
attempts=$(grep -c "Gradle attempt" <<< "$output" || true)
[ "$attempts" -eq 1 ] || fail "non-dependency failure: expected 1 attempt, got $attempts"
[ "$status" -ne 0 ] && [ "$attempts" -eq 1 ] && pass "non-dependency failure"
rm -rf "$dir"

# 3. Exhausts all attempts on dependency-resolution errors.
dir=$(make_fake_gradle 9 "Could not GET 'https://jitpack.io/...'")
export TMPDIR_FAKE="$dir"
set +e
output=$(cd "$dir" && MAX_ATTEMPTS=2 "$SCRIPT" :app:bundleRelease 2>&1)
status=$?
set -e
[ "$status" -ne 0 ] || fail "exhausted retries: expected non-zero exit"
attempts=$(grep -c "Gradle attempt" <<< "$output" || true)
[ "$attempts" -eq 2 ] || fail "exhausted retries: expected 2 attempts, got $attempts"
grep -q "Gradle failed after 2 attempts" <<< "$output" || fail "exhausted retries: missing final failure message"
[ "$status" -ne 0 ] && [ "$attempts" -eq 2 ] && pass "exhausted retries"
rm -rf "$dir"

if [ "$fail_count" -gt 0 ]; then
  echo "$fail_count test(s) failed"
  exit 1
fi
echo "All gradle-retry tests passed"
