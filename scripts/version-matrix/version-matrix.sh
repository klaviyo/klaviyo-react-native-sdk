#!/usr/bin/env bash
#
# version-matrix.sh -- pack this working tree exactly as npm would publish it,
# install that tarball into stock React Native apps at several versions, and
# record what actually happens.
#
# WHY THIS EXISTS
#   Our CI builds one thing: example/ at one React Native version, debug only.
#   example/android/build.gradle sets ext.kotlinVersion, so every CI build takes
#   the host branch of our Kotlin selection and never exercises the fallback that
#   older consumers get. And example/ resolves the SDK through a yarn-workspace
#   symlink, not through the files[] allowlist a customer installs.
#
#   So CI cannot see: version-selection bugs, packaging bugs (a file missing from
#   files[]), consumer-side AAR metadata rejections, or anything that only appears
#   in a minified release build. All four have bitten us.
#
#   This script closes that gap. Run it when you change a dependency, touch
#   android/build.gradle, bump the Klaviyo Android SDK pin, or add a file that has
#   to reach customers.
#
# TIERS   Each tier is a superset of the one below it.
#   1  resolve only    -- AGP, Kotlin plugin, stdlib, reflect. No compilation.
#   2  + debug build   -- our module, then the consumer app (runs AAR metadata checks)
#   3  + release build -- R8 on, records which ProGuard config actually applied
#   4  + device smoke  -- install, launch, exercise the public API, read logcat
#
# USAGE
#   ./version-matrix.sh                        # tier 1, default versions
#   ./version-matrix.sh --tier 2               # add debug builds
#   ./version-matrix.sh --tier 4 0.86.3 0.87.1 # full depth, two versions
#   ./version-matrix.sh --fresh 0.87.1         # discard cached scaffold first
#   ./version-matrix.sh --clean                # wipe the workspace and exit
#
# OUTPUT
#   <workspace>/matrix.md      human-readable tables
#   <workspace>/results.json   machine-readable, for diffing runs
#   <workspace>/logs/<ver>/    every raw log, so any cell can be spot-checked
#
#   To compare a run before and after your change:
#     diff <(jq -S . before.json) <(jq -S . after.json)
#
# REQUIREMENTS
#   node, npm, npx, java, ANDROID_HOME. Tier 4 also needs one attached device or
#   running emulator (or --serial to pick one).
#
# NOTE ON ENCODING
#   This file is intentionally pure ASCII. macOS ships bash 3.2, which folds
#   multibyte characters following $var straight into the variable NAME. A stray
#   U+2192 arrow killed an entire run under `set -u`.

set -uo pipefail

# ---------------------------------------------------------------- configuration

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# scripts/version-matrix/ -> repo root. Derived, never hardcoded, so this works
# from any checkout or worktree.
SDK_REPO="${SDK_REPO:-$(cd "$HERE/../.." && pwd)}"

# The workspace deliberately lives outside the repo and outside /tmp. macOS purges
# /private/tmp after a few days, which destroyed a previous run's scaffolds. Each
# scaffold is a full npm install, so keeping them makes re-runs nearly free.
WORK="${WORK:-$HOME/.klaviyo-rn-version-matrix}"

MODULE=":klaviyo-react-native-sdk"
PKG_NAME="klaviyo-react-native-sdk"

# Versions worth testing, and why. Edit this list as the support policy settles.
#   0.76  current Android floor, set by the androidx.core pin in the Android SDK
#   0.81  the version master shipped before the 0.86 upgrade
#   0.86  the upgrade target
#   0.87  newest; first template to ship AGP 9, which is where R8 behaviour changes
DEFAULT_VERSIONS=(0.76.9 0.81.5 0.86.3 0.87.1)

# Every version we have ever verified, for a full sweep: --versions all
ALL_VERSIONS=(0.76.9 0.77.3 0.78.3 0.79.7 0.80.3 0.81.5 \
              0.82.1 0.83.10 0.84.1 0.85.3 0.86.3 0.87.1)

# Coordinates whose resolved version we record. Add or remove one line to change
# a column; nothing else in the script needs touching.
#   label|gradle coordinate (regex-escaped)
TRACKED=(
  "kotlin-stdlib|org\.jetbrains\.kotlin:kotlin-stdlib"
  "kotlin-reflect|org\.jetbrains\.kotlin:kotlin-reflect"
)

PROBLEM=0
TIER=1
FRESH=0
SERIAL=""
VERSIONS=()

# ---------------------------------------------------------------------- helpers

say()  { printf '%s\n' "$*" >&2; }
step() { printf '\n==> %s\n' "$*" >&2; }
warn() { printf '[warn] %s\n' "$*" >&2; }
die()  { printf '[fail] %s\n' "$*" >&2; exit 1; }

sha_short() { shasum -a 256 | cut -c1-12; }

# Read the version Gradle SETTLED ON, not the highest one mentioned. Gradle writes
# conflict resolution as "requested -> winner", so an arrow target always beats a
# bare version. Raw logs are kept so any parsed cell can be checked by hand.
resolved_version() {
  local coord="$1" log="$2" v
  v=$(grep -oE "${coord}:[0-9][0-9.]*[^ ]* -> [0-9][0-9.]*" "$log" 2>/dev/null \
      | grep -oE '\-> [0-9][0-9.]*' | grep -oE '[0-9][0-9.]*' | sort -Vu | tail -1)
  [[ -n "$v" ]] && { printf '%s' "$v"; return; }
  grep -oE "${coord}:[0-9][0-9.]*" "$log" 2>/dev/null | sed 's/.*://' | sort -Vu | tail -1
}

# The community CLI prints "Run instructions for Android" and exits 0 even when
# "Copying template" failed and left an empty directory. Never trust its exit code.
assert_scaffold() {
  local dir="$1"
  [[ -f "$dir/android/build.gradle" ]] || return 1
  [[ -f "$dir/android/gradle/wrapper/gradle-wrapper.properties" ]] || return 1
  [[ -d "$dir/node_modules/react-native" ]] || return 1
  return 0
}

json_escape() { printf '%s' "$1" | sed 's/\\/\\\\/g; s/"/\\"/g'; }

# ----------------------------------------------------------------- argument parse

while (($#)); do
  case "$1" in
    --tier)     shift; TIER="${1:-}"; [[ "$TIER" =~ ^[1-4]$ ]] || die "--tier must be 1..4" ;;
    --tier=*)   TIER="${1#*=}"; [[ "$TIER" =~ ^[1-4]$ ]] || die "--tier must be 1..4" ;;
    --fresh)    FRESH=1 ;;
    --serial)   shift; SERIAL="${1:-}" ;;
    --serial=*) SERIAL="${1#*=}" ;;
    --versions) shift; [[ "${1:-}" == "all" ]] && VERSIONS=("${ALL_VERSIONS[@]}") || die "--versions only accepts 'all'" ;;
    --clean)    step "removing $WORK"; rm -rf "$WORK"; exit 0 ;;
    -h|--help)  sed -n '2,58p' "${BASH_SOURCE[0]}" | sed 's/^# \{0,1\}//'; exit 0 ;;
    -*)         die "unknown flag: $1" ;;
    *)          VERSIONS+=("$1") ;;
  esac
  shift
done
((${#VERSIONS[@]})) || VERSIONS=("${DEFAULT_VERSIONS[@]}")

# --------------------------------------------------------------------- preflight

step "preflight"
command -v node >/dev/null || die "node not found"
command -v npm  >/dev/null || die "npm not found"
command -v npx  >/dev/null || die "npx not found"
command -v java >/dev/null || die "java not found"
[[ -n "${ANDROID_HOME:-}" && -d "${ANDROID_HOME:-}" ]] || die "ANDROID_HOME unset or missing"
[[ -f "$SDK_REPO/package.json" ]] || die "SDK_REPO is not the SDK repo: $SDK_REPO"
grep -q "\"name\": *\"$PKG_NAME\"" "$SDK_REPO/package.json" \
  || die "SDK_REPO does not look like $PKG_NAME: $SDK_REPO"

ADB="$ANDROID_HOME/platform-tools/adb"
if ((TIER >= 4)); then
  [[ -x "$ADB" ]] || die "adb not found at $ADB (tier 4 needs it)"
  if [[ -z "$SERIAL" ]]; then
    # Count only lines whose second field is exactly "device". "offline" and
    # "unauthorized" states would otherwise be counted and then fail obscurely.
    DEV_COUNT=$("$ADB" devices | awk 'NR>1 && $2=="device"' | wc -l | tr -d ' ')
    ((DEV_COUNT == 1)) || die "tier 4 needs exactly one ready device, found $DEV_COUNT (use --serial)"
    SERIAL=$("$ADB" devices | awk 'NR>1 && $2=="device"{print $1; exit}')
  fi
  say "  device       $SERIAL"
fi

GIT_SHA=$(cd "$SDK_REPO" && git rev-parse --short HEAD 2>/dev/null || echo unknown)
GIT_BRANCH=$(cd "$SDK_REPO" && git rev-parse --abbrev-ref HEAD 2>/dev/null || echo unknown)
GIT_DIRTY=$(cd "$SDK_REPO" && git status --porcelain 2>/dev/null | head -1)
say "  node         $(node --version)"
say "  java         $(java -version 2>&1 | head -1)"
say "  SDK_REPO     $SDK_REPO"
say "  branch       $GIT_BRANCH @ $GIT_SHA$([[ -n "$GIT_DIRTY" ]] && echo ' (DIRTY)')"
say "  workspace    $WORK"
say "  tier         $TIER"
say "  versions     ${VERSIONS[*]}"
[[ -n "$GIT_DIRTY" ]] && warn "working tree is dirty -- results describe your uncommitted state"

mkdir -p "$WORK/logs" "$WORK/pristine"

# ------------------------------------------------------------------------- pack

step "packing the SDK"
# This is the whole point: build what npm would publish -- lib/ output plus the
# files[] allowlist -- not the yarn-workspace symlink example/ resolves through.
# A file missing from files[] is invisible to CI and fatal to customers.
TARBALL_DIR="$WORK/tarball"
rm -rf "$TARBALL_DIR"; mkdir -p "$TARBALL_DIR"
(
  cd "$SDK_REPO" || exit 1
  yarn install >"$WORK/logs/install.log" 2>&1 || exit 1
  yarn prepare >"$WORK/logs/prepare.log" 2>&1 || exit 1
  # --ignore-scripts: npm would otherwise re-run `prepare`, building with a second
  # package manager on top of the yarn build we just did.
  npm pack --ignore-scripts --pack-destination "$TARBALL_DIR" >"$WORK/logs/pack.log" 2>&1 || exit 1
) || die "pack failed -- see $WORK/logs/{install,prepare,pack}.log"

RAW_TARBALL="$(find "$TARBALL_DIR" -name "$PKG_NAME-*.tgz" -type f | sort | tail -1)"
[[ -n "$RAW_TARBALL" ]] || die "no tarball produced"

# npm caches file: dependencies BY PATH. During MAGE-919 a repack under the same
# filename was silently ignored and a stale tarball installed -- the resulting
# crash was meaningless. Naming the tarball after a hash of its CONTENTS makes
# that structurally impossible: different contents, different path.
#
# We hash the extracted contents rather than the archive, because gzip embeds a
# timestamp, so the .tgz bytes differ on every pack even when nothing changed.
CONTENT_SHA=$(tar -xzOf "$RAW_TARBALL" 2>/dev/null | sha_short)
TARBALL="$TARBALL_DIR/$PKG_NAME-$CONTENT_SHA.tgz"
mv "$RAW_TARBALL" "$TARBALL"

# Reference copy, used after every install to prove what landed is what we packed.
REF="$WORK/tarball-ref"
rm -rf "$REF"; mkdir -p "$REF"
tar -xzf "$TARBALL" -C "$REF"
[[ -d "$REF/package" ]] || die "unexpected tarball layout"

say "  $(basename "$TARBALL") ($(du -h "$TARBALL" | cut -f1)), content $CONTENT_SHA"
say "  packed files: $(find "$REF/package" -type f | wc -l | tr -d ' ')"

# ------------------------------------------------------------------ result store

# bash 3.2 has no associative arrays, so rows are pipe-delimited strings.
# fields: ver|status|agp_host|agp_ours|kgp|tracked...|mod_dbg|app_dbg|pg|r8|rel|crash|js|rt|native
ROWS=()

# ------------------------------------------------------------------- main sweep

for V in "${VERSIONS[@]}"; do
  step "React Native $V"
  APP="App${V//./}"
  DIR="$WORK/$APP"
  LOG="$WORK/logs/$V"; mkdir -p "$LOG"
  PRISTINE="$WORK/pristine/$V.tar"

  STATUS="ok"
  AGP_HOST="-"; AGP_OURS="-"; KGP="-"
  TRACKED_VALS=""; SKEW_FLAG="-"
  MOD_DBG="-"; APP_DBG="-"; PG_CFG="-"; R8="-"; APP_REL="-"
  CRASH="-"; JS_SMOKE="-"; ROUNDTRIP="-"; NATIVE="-"

  record_and_continue() {
    STATUS="$1"
    [[ "$STATUS" == "ok" ]] || PROBLEM=1
    ROWS+=("$V|$STATUS|$AGP_HOST|$AGP_OURS|$KGP|$TRACKED_VALS|$SKEW_FLAG|$MOD_DBG|$APP_DBG|$PG_CFG|$R8|$APP_REL|$CRASH|$JS_SMOKE|$ROUNDTRIP|$NATIVE")
  }

  # -- 1. scaffold, once, then snapshot it ------------------------------------
  if ((FRESH)); then
    say "  --fresh: discarding cached scaffold"
    rm -rf "$DIR" "$PRISTINE"
  fi

  if [[ ! -f "$PRISTINE" ]]; then
    rm -rf "$DIR"
    say "  scaffolding (the slow part)"
    # `npx react-native@X init` is DEAD: it fetches the template from
    # react-native@latest regardless of X, and current RN ships no template/ dir.
    # Only the community CLI with --version honours the version. Do NOT pass
    # --directory; the verified form is cd into the parent and init by name.
    ( cd "$WORK" && npx --yes @react-native-community/cli@latest init "$APP" \
        --version "$V" --install-pods false --skip-git-init ) >"$LOG/init.log" 2>&1
    if ! assert_scaffold "$DIR"; then
      warn "scaffold failed for $V (the CLI likely exited 0 anyway) -- see $LOG/init.log"
      record_and_continue "scaffold failed"; continue
    fi
    # Snapshot everything EXCEPT node_modules. node_modules is expensive to refetch
    # and is not where contamination happens; config files are.
    tar -cf "$PRISTINE" --exclude=./node_modules --exclude=./.git -C "$DIR" . \
      || { warn "could not snapshot $V"; record_and_continue "snapshot failed"; continue; }
    say "  snapshot: $(basename "$PRISTINE") ($(du -h "$PRISTINE" | cut -f1))"
  fi

  # -- 2. restore to pristine before every run --------------------------------
  # A cached scaffold that merely EXISTS is not safe to reuse. During MAGE-919 an
  # App0815 scaffold still carried kotlinVersion = "2.0.0" from an earlier
  # experiment and produced a false stdlib/reflect reading that was caught by luck.
  # Existence checks cannot detect that; restoring from the snapshot cannot miss it.
  if [[ -d "$DIR" ]]; then
    say "  restoring pristine scaffold"
    find "$DIR" -mindepth 1 -maxdepth 1 ! -name node_modules -exec rm -rf {} + 2>/dev/null
  else
    mkdir -p "$DIR"
  fi
  tar -xf "$PRISTINE" -C "$DIR" || { record_and_continue "restore failed"; continue; }

  if ! assert_scaffold "$DIR"; then
    warn "restored tree is incomplete for $V -- try --fresh"
    record_and_continue "restore incomplete"; continue
  fi
  say "  template: $(grep -o 'gradle-[0-9.]*-\(all\|bin\)' "$DIR/android/gradle/wrapper/gradle-wrapper.properties" | head -1)"

  # -- 3. patch the host to our minimums --------------------------------------
  # Our module needs compileSdk 34 / minSdk 23; old templates ship less. The README
  # documents exactly this for old versions, so patching mirrors what we already
  # tell customers rather than hiding an unrelated failure.
  RB="$DIR/android/build.gradle"
  PATCHED=""
  cur_min=$(grep -oE 'minSdkVersion *= *[0-9]+' "$RB" | grep -oE '[0-9]+' | head -1)
  cur_comp=$(grep -oE 'compileSdkVersion *= *[0-9]+' "$RB" | grep -oE '[0-9]+' | head -1)
  if (( ${cur_min:-999} < 23 )); then
    sed -i '' -E "s/minSdkVersion *= *[0-9]+/minSdkVersion = 23/" "$RB"
    PATCHED="minSdk ${cur_min} to 23"
  fi
  if (( ${cur_comp:-999} < 34 )); then
    sed -i '' -E "s/compileSdkVersion *= *[0-9]+/compileSdkVersion = 34/" "$RB"
    sed -i '' -E "s/targetSdkVersion *= *[0-9]+/targetSdkVersion = 34/" "$RB"
    sed -i '' -E "s/buildToolsVersion *= *\"[0-9.]+\"/buildToolsVersion = \"34.0.0\"/" "$RB"
    PATCHED="${PATCHED:+${PATCHED}, }compileSdk ${cur_comp} to 34"
  fi
  [[ -n "$PATCHED" ]] && say "  host patched: $PATCHED (as the README instructs for old versions)"

  # -- 4. install the packed SDK ----------------------------------------------
  say "  installing the packed SDK"
  # Belt and braces alongside the content-hashed filename: never let a previous
  # install's files survive into this one.
  rm -rf "$DIR/node_modules/$PKG_NAME"
  if [[ -f "$DIR/yarn.lock" ]]; then
    ( cd "$DIR" && yarn add "file:$TARBALL" ) >"$LOG/tarball-install.log" 2>&1
  else
    ( cd "$DIR" && npm install --no-audit --no-fund "$TARBALL" ) >"$LOG/tarball-install.log" 2>&1
  fi

  INSTALLED="$DIR/node_modules/$PKG_NAME"
  if [[ ! -d "$INSTALLED/android" ]]; then
    warn "tarball install failed for $V -- see $LOG/tarball-install.log"
    record_and_continue "install failed"; continue
  fi

  # -- 5. prove what landed is what we packed ---------------------------------
  # Nothing used to check this. A run once "verified" a fix against an installed
  # package that did not contain the fix, and the result looked like a real crash.
  if ! diff -r -x node_modules "$REF/package" "$INSTALLED" >"$LOG/install-verify.log" 2>&1; then
    warn "installed package differs from the packed tarball -- see $LOG/install-verify.log"
    head -5 "$LOG/install-verify.log" >&2
    record_and_continue "install mismatch"; continue
  fi
  say "  install verified against tarball ($CONTENT_SHA)"

  # -- 5b. tier 4 only: swap in the smoke app ---------------------------------
  # This has to happen BEFORE the release build, because the JS bundle is compiled
  # into the release APK. Doing it afterwards would ship the stock template and
  # exercise nothing.
  if ((TIER >= 4)); then
    if [[ ! -f "$HERE/smoke/App.tsx" ]]; then
      warn "smoke/App.tsx missing next to this script"
      record_and_continue "smoke app missing"; continue
    fi
    cp "$HERE/smoke/App.tsx" "$DIR/App.tsx"
    say "  smoke app installed"
  fi

  # -- 6. tier 1: resolution facts, no compilation ----------------------------
  say "  querying host buildscript classpath (root)"
  ( cd "$DIR/android" && ./gradlew buildEnvironment --no-daemon ) >"$LOG/buildEnvironment-root.log" 2>&1
  AGP_HOST=$(resolved_version 'com\.android\.tools\.build:gradle' "$LOG/buildEnvironment-root.log")
  AGP_HOST="${AGP_HOST:-?}"

  say "  querying our module's buildscript classpath"
  ( cd "$DIR/android" && ./gradlew "$MODULE:buildEnvironment" --no-daemon ) >"$LOG/buildEnvironment.log" 2>&1
  AGP_OURS=$(resolved_version 'com\.android\.tools\.build:gradle' "$LOG/buildEnvironment.log")
  # Absence is the expected result and is evidence the AGP guard works: plugins
  # load parent-first, so the host's AGP wins and ours never applies.
  AGP_OURS="${AGP_OURS:-none (guarded)}"
  KGP=$(resolved_version 'org\.jetbrains\.kotlin:kotlin-gradle-plugin' "$LOG/buildEnvironment.log")
  KGP="${KGP:-?}"

  say "  resolving the dependency graph"
  ( cd "$DIR/android" && ./gradlew "$MODULE:dependencies" \
      --configuration debugCompileClasspath --no-daemon ) >"$LOG/dependencies.log" 2>&1

  TRACKED_VALS=""
  SKEW=""
  PREV_VAL=""
  for t in "${TRACKED[@]}"; do
    tlabel="${t%%|*}"; tcoord="${t#*|}"
    tval=$(resolved_version "$tcoord" "$LOG/dependencies.log")
    tval="${tval:-?}"
    TRACKED_VALS="${TRACKED_VALS:+$TRACKED_VALS,}$tval"
    # Any two tracked Kotlin artifacts that disagree is a runtime hazard.
    if [[ -n "$PREV_VAL" && "$PREV_VAL" != "?" && "$tval" != "?" && "$PREV_VAL" != "$tval" ]]; then
      SKEW="  <-- SKEW"; SKEW_FLAG="yes"; PROBLEM=1
    fi
    PREV_VAL="$tval"
  done

  say "  AGP host $AGP_HOST / ours $AGP_OURS | KGP $KGP | ${TRACKED_VALS}$SKEW"
  ((TIER >= 2)) || { record_and_continue "ok"; continue; }

  # -- 7. tier 2: debug builds -------------------------------------------------
  # Module-only compile. Does NOT exercise AAR metadata: a module can compile fine
  # while the consumer app is rejected at checkDebugAarMetadata.
  say "  $MODULE:assembleDebug (module only)"
  if ( cd "$DIR/android" && ./gradlew "$MODULE:assembleDebug" --no-daemon ) >"$LOG/assembleDebug-module.log" 2>&1; then
    MOD_DBG="pass"
  else
    MOD_DBG="FAIL"; PROBLEM=1
    warn "module assembleDebug failed -- see $LOG/assembleDebug-module.log"
    grep -m3 -E '^e: ' "$LOG/assembleDebug-module.log" >&2 || true
  fi

  # The column that actually matters: can a consumer app build against us.
  say "  :app:assembleDebug (consumer app)"
  if ( cd "$DIR/android" && ./gradlew :app:assembleDebug --no-daemon ) >"$LOG/assembleDebug-app.log" 2>&1; then
    APP_DBG="pass"
  else
    APP_DBG="FAIL"; PROBLEM=1
    warn ":app:assembleDebug failed -- see $LOG/assembleDebug-app.log"
    grep -m5 -E "An issue was found|minCompileSdk|minAndroidGradlePluginVersion|^e: |FAILURE:" \
      "$LOG/assembleDebug-app.log" >&2 || true
  fi

  ((TIER >= 3)) || { record_and_continue "ok"; continue; }

  # -- 8. tier 3: release build with R8 ---------------------------------------
  AB="$DIR/android/app/build.gradle"

  # Turn minification on. The flag name has been stable across every version we
  # test, but we verify the OUTCOME below rather than trusting the edit.
  sed -i '' 's/def enableProguardInReleaseBuilds = false/def enableProguardInReleaseBuilds = true/' "$AB" 2>/dev/null

  # Which ProGuard config actually applies matters more than it looks:
  # proguard-android.txt contains -dontoptimize, so R8's optimisation pass never
  # runs and a "minified" build proves much less than you think. AGP 9 rejects
  # that file outright. 11 of 12 runs during MAGE-919 silently used it.
  PG_CFG=$(grep -oE 'proguard-android(-optimize)?\.txt' "$AB" | head -1)
  PG_CFG="${PG_CFG:-none}"

  # Never read a stale artifact. A build that failed in 3s once had its previous
  # APK installed and launched, and the result voided a whole matrix cell.
  rm -rf "$DIR/android/app/build/outputs"

  say "  :app:assembleRelease (R8 on, proguard cfg: $PG_CFG)"
  if ( cd "$DIR/android" && ./gradlew :app:assembleRelease --no-daemon ) >"$LOG/assembleRelease.log" 2>&1; then
    APP_REL="pass"
  else
    APP_REL="FAIL"; PROBLEM=1
    warn ":app:assembleRelease failed -- see $LOG/assembleRelease.log"
    grep -m5 -E "FAILURE:|^e: |Caused by:" "$LOG/assembleRelease.log" >&2 || true
    record_and_continue "release build failed"; continue
  fi

  # R8 only writes a mapping file when it actually minified. This is the proof
  # that the sed above did something, independent of the sed itself.
  if [[ -f "$DIR/android/app/build/outputs/mapping/release/mapping.txt" ]]; then
    R8="yes"
  else
    R8="NO"; PROBLEM=1
    warn "release built but produced no mapping.txt -- minification did not run"
  fi

  ((TIER >= 4)) || { record_and_continue "ok"; continue; }

  # -- 9. tier 4: install, launch, exercise the API ---------------------------
  APK=$(find "$DIR/android/app/build/outputs/apk/release" -name '*.apk' -type f 2>/dev/null | head -1)
  if [[ -z "$APK" ]]; then
    warn "no APK produced despite a successful build"
    record_and_continue "no apk"; continue
  fi

  # The app id the template generates is com.<lowercased app name>. bash 3.2 has
  # no ${VAR,,}, hence tr.
  PKG_ID="com.$(printf '%s' "$APP" | tr '[:upper:]' '[:lower:]')"

  say "  installing and launching $PKG_ID"
  "$ADB" -s "$SERIAL" uninstall "$PKG_ID" >/dev/null 2>&1
  if ! "$ADB" -s "$SERIAL" install -r "$APK" >"$LOG/adb-install.log" 2>&1; then
    warn "adb install failed -- see $LOG/adb-install.log"
    record_and_continue "adb install failed"; continue
  fi
  "$ADB" -s "$SERIAL" shell pm grant "$PKG_ID" android.permission.POST_NOTIFICATIONS >/dev/null 2>&1
  "$ADB" -s "$SERIAL" logcat -c >/dev/null 2>&1
  "$ADB" -s "$SERIAL" shell monkey -p "$PKG_ID" -c android.intent.category.LAUNCHER 1 >/dev/null 2>&1

  # Wait for a terminal signal rather than sleeping a fixed amount.
  for _ in $(seq 1 20); do
    if "$ADB" -s "$SERIAL" logcat -d 2>/dev/null | grep -qE 'KLAVIYO_SMOKE_DONE|FATAL EXCEPTION'; then break; fi
    sleep 2
  done
  sleep 3

  # Did the process ever come up? Distinguishes "the bridge produced no evidence"
  # from "the app was never running", which look identical in the columns below
  # and mean completely different things.
  if [[ -z "$("$ADB" -s "$SERIAL" shell pidof "$PKG_ID" 2>/dev/null | tr -d '\r\n ')" ]]; then
    warn "process is not running after launch -- it crashed or never started"
  fi
  "$ADB" -s "$SERIAL" logcat -d >"$LOG/logcat.log" 2>/dev/null

  CRASH=$(grep -c 'FATAL EXCEPTION' "$LOG/logcat.log" | tr -d ' ')
  JS_SMOKE=$(grep -oE 'KLAVIYO_SMOKE_DONE [a-z0-9=/ ]*' "$LOG/logcat.log" | head -1)
  JS_SMOKE="${JS_SMOKE#KLAVIYO_SMOKE_DONE }"
  JS_SMOKE="${JS_SMOKE:-no summary}"

  # The decisive check. Every other API on the legacy bridge is fire-and-forget,
  # so a JS try/catch around it catches nothing and "0 failures" can mean the
  # bridge never ran at all. isLoggingEnabled takes a callback, so a value coming
  # back is proof the round trip completed.
  if grep -q 'KLAVIYO_ROUNDTRIP_OK' "$LOG/logcat.log"; then
    ROUNDTRIP="yes"
  else
    ROUNDTRIP="NO"; PROBLEM=1
  fi

  # Independent confirmation from the native side. KLog tags every line
  # "Klaviyo.<Class>"; R8 renames the class but the prefix survives, so this
  # works in minified builds too.
  NATIVE=$(grep -cE '(^|[[:space:]])Klaviyo\.[A-Za-z]' "$LOG/logcat.log" | tr -d ' ')

  say "  crashes=$CRASH js=[$JS_SMOKE] roundtrip=$ROUNDTRIP nativeLogLines=$NATIVE"
  [[ "$ROUNDTRIP" == "NO" ]] && warn "no round trip: the bridge did not reach native code"
  record_and_continue "ok"
done

# ------------------------------------------------------------------- reporting

TRACKED_HEADERS=""
for t in "${TRACKED[@]}"; do TRACKED_HEADERS="$TRACKED_HEADERS ${t%%|*} |"; done

OUT_MD="$WORK/matrix.md"
{
  echo "### React Native version matrix"
  echo
  echo "Packed \`$(basename "$TARBALL")\` (content \`$CONTENT_SHA\`) from"
  echo "\`$GIT_BRANCH\` @ \`$GIT_SHA\`$([[ -n "$GIT_DIRTY" ]] && echo ' **(dirty working tree)**'),"
  echo "installed into a stock React Native app per version. Tier $TIER."
  echo
  echo "#### Resolution"
  echo
  echo "| RN | status | AGP (host) | AGP (ours) | Kotlin plugin |$TRACKED_HEADERS skew |"
  printf '|---|---|---|---|---|'; for _ in "${TRACKED[@]}"; do printf -- '---|'; done; printf -- '---|'; echo
  for r in "${ROWS[@]}"; do
    IFS='|' read -r v st ah ao kg tv sk _md _ad _pg _r8 _rl _cr _js _rt _nt <<<"$r"
    printf '| %s | %s | %s | %s | %s | ' "$v" "$st" "$ah" "$ao" "$kg"
    printf '%s' "$(printf '%s' "$tv" | sed 's/,/ | /g')"; printf ' | %s |\n' "$sk"
  done
  echo
  echo '`AGP (ours)` reading `none (guarded)` is the expected result: plugins load'
  echo 'parent-first, so the host AGP wins and ours is confined to standalone builds.'

  if ((TIER >= 2)); then
    echo
    echo "#### Build and runtime"
    echo
    echo "| RN | module debug | app debug | proguard cfg | R8 ran | app release | crashes | JS smoke | round trip | native log lines |"
    echo "|---|---|---|---|---|---|---|---|---|---|"
    for r in "${ROWS[@]}"; do
      IFS='|' read -r v _st _ah _ao _kg _tv _sk md ad pg r8 rl cr js rt nt <<<"$r"
      echo "| $v | $md | $ad | $pg | $r8 | $rl | $cr | $js | $rt | $nt |"
    done
    echo
    echo '`round trip` is the column to read first. Every other public API is'
    echo 'fire-and-forget on the legacy bridge, so a JS-side `0 failures` can mean the'
    echo 'bridge never reached native at all. `isLoggingEnabled` takes a callback, so'
    echo '`yes` here is the only proof the round trip completed.'
  fi
  echo
  echo "<sub>JDK: $(java -version 2>&1 | head -1). Node: $(node --version). Generated by scripts/version-matrix/version-matrix.sh</sub>"
} >"$OUT_MD"

OUT_JSON="$WORK/results.json"
{
  printf '{\n'
  printf '  "generated": "%s",\n' "$(date -u +%Y-%m-%dT%H:%M:%SZ)"
  printf '  "tier": %s,\n' "$TIER"
  printf '  "branch": "%s",\n' "$(json_escape "$GIT_BRANCH")"
  printf '  "commit": "%s",\n' "$(json_escape "$GIT_SHA")"
  printf '  "dirty": %s,\n' "$([[ -n "$GIT_DIRTY" ]] && echo true || echo false)"
  printf '  "tarballContentSha": "%s",\n' "$CONTENT_SHA"
  printf '  "results": [\n'
  first=1
  for r in "${ROWS[@]}"; do
    IFS='|' read -r v st ah ao kg tv sk md ad pg r8 rl cr js rt nt <<<"$r"
    ((first)) || printf ',\n'; first=0
    printf '    {'
    printf '"version": "%s", ' "$(json_escape "$v")"
    printf '"status": "%s", ' "$(json_escape "$st")"
    printf '"agpHost": "%s", ' "$(json_escape "$ah")"
    printf '"agpOurs": "%s", ' "$(json_escape "$ao")"
    printf '"kotlinPlugin": "%s", ' "$(json_escape "$kg")"
    i=0
    for t in "${TRACKED[@]}"; do
      tlabel="${t%%|*}"
      tval=$(printf '%s' "$tv" | cut -d, -f$((i+1)))
      printf '"%s": "%s", ' "$(json_escape "$tlabel")" "$(json_escape "$tval")"
      i=$((i+1))
    done
    printf '"kotlinSkew": "%s", ' "$(json_escape "$sk")"
    printf '"moduleDebug": "%s", ' "$(json_escape "$md")"
    printf '"appDebug": "%s", ' "$(json_escape "$ad")"
    printf '"proguardConfig": "%s", ' "$(json_escape "$pg")"
    printf '"r8Ran": "%s", ' "$(json_escape "$r8")"
    printf '"appRelease": "%s", ' "$(json_escape "$rl")"
    printf '"crashes": "%s", ' "$(json_escape "$cr")"
    printf '"jsSmoke": "%s", ' "$(json_escape "$js")"
    printf '"roundTrip": "%s", ' "$(json_escape "$rt")"
    printf '"nativeLogLines": "%s"' "$(json_escape "$nt")"
    printf '}'
  done
  printf '\n  ]\n}\n'
} >"$OUT_JSON"

step "done"
cat "$OUT_MD"
say ""
say "table:   $OUT_MD"
say "json:    $OUT_JSON"
say "logs:    $WORK/logs/<version>/"

# Non-zero exit if anything came out wrong, so this is usable as a pre-release
# gate. A Kotlin version skew counts: it is a runtime hazard, not a warning.
if ((PROBLEM)); then
  say ""
  warn "at least one version did not come out clean -- see the tables above"
  exit 1
fi
exit 0
