#!/usr/bin/env bash
# Offline tests for assert-artifact-version.sh using fake artifacts.
# iOS cases use a zip containing Payload/X.app/Info.plist as XML text (so the
# python3 plistlib fallback works on ubuntu CI; on macOS PlistBuddy reads the
# same XML). Android cases inject fake `aapt2 dump xmltree` output via a stub
# aapt2 on PATH, since building a real AAB offline is impractical — the real
# aapt2-on-AAB path is only exercised by the workflow on a runner.
# Usage: test-assert-artifact-version.sh (run from anywhere)
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
SCRIPT="$REPO_ROOT/.github/scripts/assert-artifact-version.sh"

WORK=$(mktemp -d)
trap 'rm -rf "$WORK"' EXIT

fail_count=0
fail() {
  echo "FAIL: $1"
  fail_count=$((fail_count + 1))
}
pass() { echo "PASS: $1"; }

make_ipa() { # path bundle-version short-version (empty short omits the key)
  local dir="$WORK/ipa-src"
  rm -rf "$dir"
  mkdir -p "$dir/Payload/X.app"
  {
    echo '<?xml version="1.0" encoding="UTF-8"?>'
    echo '<plist version="1.0"><dict>'
    echo '<key>CFBundleVersion</key><string>'"$2"'</string>'
    if [ -n "${3:-}" ]; then
      echo '<key>CFBundleShortVersionString</key><string>'"$3"'</string>'
    fi
    echo '</dict></plist>'
  } > "$dir/Payload/X.app/Info.plist"
  (cd "$dir" && zip -q -r "$1" Payload)
}

expect_ok() { # platform expected-code cmd...
  local label="$1 $2 match"
  shift 2
  if "$@" >/dev/null 2>&1; then
    pass "$label"
  else
    fail "$label: expected success"
  fi
}

expect_fail() { # description cmd...
  local desc=$1
  shift
  if "$@" >/dev/null 2>&1; then
    fail "$desc: expected failure"
  else
    pass "$desc"
  fi
}

# --- iOS cases ---
make_ipa "$WORK/good.ipa" 12 2.6.0
expect_ok ios 12 "$SCRIPT" ios "$WORK/good.ipa" 12 2.6.0

make_ipa "$WORK/wrongcode.ipa" 11 2.6.0
expect_fail "ios wrong CFBundleVersion" "$SCRIPT" ios "$WORK/wrongcode.ipa" 12 2.6.0

make_ipa "$WORK/wrongname.ipa" 12 2.6.0-rc.1
expect_fail "ios wrong CFBundleShortVersionString (suffix not stripped)" "$SCRIPT" ios "$WORK/wrongname.ipa" 12 2.6.0

make_ipa "$WORK/nokey.ipa" 12 ""
expect_fail "ios missing CFBundleShortVersionString" "$SCRIPT" ios "$WORK/nokey.ipa" 12 2.6.0

expect_fail "ios missing artifact" "$SCRIPT" ios "$WORK/nope.ipa" 12 2.6.0

# --- Android cases with a stub aapt2 ---
mkdir -p "$WORK/bin"
cat > "$WORK/bin/aapt2" <<'EOF'
#!/usr/bin/env bash
# Stub: prints the xmltree snippet stored in $FAKE_DUMP.
printf '%s\n' "$FAKE_DUMP"
EOF
chmod +x "$WORK/bin/aapt2"
export PATH="$WORK/bin:$PATH"

# A real AAB zip only needs the manifest path for the script's unzip.
mkdir -p "$WORK/aab-src/base/manifest"
echo placeholder > "$WORK/aab-src/base/manifest/AndroidManifest.xml"
(cd "$WORK/aab-src" && zip -q -r "$WORK/fake.aab" base)

# shellcheck disable=SC2089,SC2090 # stub input is literal text, not a command
FAKE_DUMP='N: android=http://schemas.android.com/apk/res/android
  A: android:versionCode(0x0101021b)=(type 0x10)0x2a
  A: android:versionName(0x0101021c)="2.6.0-rc.1"'
# shellcheck disable=SC2090
export FAKE_DUMP
expect_ok android 42 "$SCRIPT" android "$WORK/fake.aab" 42 2.6.0-rc.1

FAKE_DUMP='A: android:versionCode(0x0101021b)=(type 0x10)0x29
  A: android:versionName(0x0101021c)="2.6.0-rc.1"'
expect_fail "android wrong versionCode" "$SCRIPT" android "$WORK/fake.aab" 42 2.6.0-rc.1

FAKE_DUMP='A: android:versionCode(0x0101021b)=(type 0x10)0x2a
  A: android:versionName(0x0101021c)="2.6.0"'
expect_fail "android wrong versionName (suffix stripped)" "$SCRIPT" android "$WORK/fake.aab" 42 2.6.0-rc.1

FAKE_DUMP=''
expect_fail "android empty aapt2 output" "$SCRIPT" android "$WORK/fake.aab" 42 2.6.0-rc.1

expect_fail "android missing artifact" "$SCRIPT" android "$WORK/nope.aab" 42 2.6.0-rc.1

if [ "$fail_count" -gt 0 ]; then
  echo "$fail_count test(s) failed" >&2
  exit 1
fi
echo "all assert-artifact-version tests passed"
