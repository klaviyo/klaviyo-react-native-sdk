#!/usr/bin/env bash
# Tests the marketing-version strip in bump-version.sh against the same cases
# as strip_ios_marketing_version in asc.rb (see test_asc.rb's shared-contract
# tests). Sources bump-version.sh with stubbed commands so only the argument
# parsing and version validation run — no files are touched.
# Usage: test-bump-version.sh (run from anywhere)
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
SCRIPT="$REPO_ROOT/bump-version.sh"

WORK=$(mktemp -d)
trap 'rm -rf "$WORK"' EXIT
mkdir -p "$WORK/bin"

# Stub the external commands the top-level code path reaches by name. PlistBuddy
# is called by absolute path, so it is not stubbed (see run_bump).
for cmd in jq sed; do
  cat > "$WORK/bin/$cmd" <<'EOF'
#!/usr/bin/env bash
exit 0
EOF
done
chmod +x "$WORK/bin"/*
export PATH="$WORK/bin:$PATH"
# jq stub must emit something mv-able: it writes tmp.json content itself.
cat > "$WORK/bin/jq" <<'EOF'
#!/usr/bin/env bash
echo '{}' > tmp.json
EOF
chmod +x "$WORK/bin/jq"
# The script uses an absolute PlistBuddy path; run only where it exists.
[ -x /usr/libexec/PlistBuddy ] || {
  echo "SKIP - /usr/libexec/PlistBuddy not found (macOS-only test)" >&2
  exit 0
}

pass() { echo "ok - $1"; }
fail() {
  echo "FAIL - $1" >&2
  exit 1
}

run_bump() {
  (
    cd "$WORK"
    touch package.json
    mkdir -p ios android/src/main/res/values example/android/app example/ios/KlaviyoReactNativeSdkExample.xcodeproj
    # The script calls /usr/libexec/PlistBuddy by absolute path, which a PATH
    # stub cannot shadow, so give the real tool a valid plist to edit.
    printf '%s\n' '<?xml version="1.0" encoding="UTF-8"?>' \
      '<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">' \
      '<plist version="1.0"><dict><key>klaviyo_sdk_version</key><string>0.0.0</string></dict></plist>' \
      > ios/klaviyo-sdk-configuration.plist
    touch android/src/main/res/values/strings.xml
    echo 'versionName "0.0.0"' > example/android/app/build.gradle
    echo 'MARKETING_VERSION = 0.0.0;' > example/ios/KlaviyoReactNativeSdkExample.xcodeproj/project.pbxproj
    # shellcheck source=/dev/null
    source "$SCRIPT" --version "$1" --skip-native --skip-install
  ) 2>&1
}

# Stripped cases: exit 0 and the pbxproj line reports the stripped value.
expect_strip() {
  out=$(run_bump "$1") || fail "$1: exited non-zero: $out"
  grep -q "MARKETING_VERSION to $2 (stripped from $1)" <<<"$out" || fail "$1: expected stripped $2, got: $out"
  pass "$1 -> $2"
}

expect_strip "2.5.1" "2.5.1"
expect_strip "2.6.0-alpha.1" "2.6.0"
expect_strip "2.6.0-rc.1+meta" "2.6.0"
expect_strip "2.6-beta" "2.6"

# Malformed cases: exit non-zero with a clear message.
expect_reject() {
  out=$(run_bump "$1") && fail "$1: expected failure, got exit 0: $out"
  grep -q "does not strip to a numeric" <<<"$out" || fail "$1: missing error message: $out"
  pass "$1 rejected"
}

expect_reject "v2"
expect_reject "abc"
expect_reject "1.2.3.4"

echo "all bump-version strip tests passed"
