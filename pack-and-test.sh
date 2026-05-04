#!/bin/bash
# pack-and-test.sh — Build + pack the SDK and install it into the example app
# from the resulting tarball, simulating an end-user `npm install`.
#
# Why: in workspace mode (default dev flow) the example app resolves the SDK
# through a yarn-workspace symlink — Metro consumes `src/index.tsx` directly
# via workspace-aware Metro/Babel/RN-CLI configs. End users on `npm install`
# get the `lib/` build output and the `files`-allowlisted subset of the repo,
# with native paths resolving from `node_modules`. Differences in the
# published surface (missing `files` entries, stale `lib/`, podspec path
# assumptions) only show up under a real packed install.
#
# Mechanism: this script creates a marker file at the repo root
# (`.pack-mode-active`). The example app's `metro.config.js`,
# `babel.config.js`, and `react-native.config.js` each check for that marker
# at config-load time and switch to vanilla "as a 3rd-party consumer would
# see it" configs when present. So the script only needs to manage the
# marker, the tarball, and example/package.json — the configs self-toggle.
#
# Usage:
#   ./pack-and-test.sh setup     # build + pack + flip example to packed mode
#   ./pack-and-test.sh restore   # revert example to workspace mode
#   ./pack-and-test.sh status    # report current mode (workspace / packed)
#
# After `setup`, run `yarn example ios|android` (or `yarn example build:ios`
# / `build:android` for non-interactive verification). When done, run
# `restore` to reinstall workspace mode.
#
# CI usage:
#   - name: Pack + flip to packed install
#     run: ./pack-and-test.sh setup
#   - name: Build example app (Android / iOS / etc.)
#     run: yarn example build:android   # or whatever the target is
#
# `restore` is omitted in CI on purpose — runners are ephemeral, so cleanup
# costs runtime for no benefit. Run `restore` locally when iterating.

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
EXAMPLE="$ROOT/example"
TARBALL_DIR="$ROOT/.tarballs"
PKG_BACKUP="$EXAMPLE/package.json.workspace-backup"
LOCK_BACKUP="$ROOT/yarn.lock.workspace-backup"
INSTALL_STATE="$ROOT/.yarn/install-state.gz"
MARKER="$ROOT/.pack-mode-active"

usage() {
  sed -n '/^# Usage:/,/^$/p' "${BASH_SOURCE[0]}" | sed -E 's/^# ?//'
  exit "${1:-1}"
}

require_tool() {
  command -v "$1" >/dev/null 2>&1 || {
    echo "Error: required tool not found: $1" >&2
    exit 1
  }
}

# Metro persists Haste maps and transform output across processes; the cache
# keys don't include our marker, so stale workspace-mode resolutions bleed
# into packed-mode bundles (and vice versa) without invalidation. Cheap to
# blow them away on every mode flip.
clear_metro_caches() {
  local tmpdir="${TMPDIR:-/tmp}"
  rm -rf "${tmpdir%/}"/metro-* "${tmpdir%/}"/haste-map-* \
    "$EXAMPLE/node_modules/.cache/metro" 2>/dev/null || true
}

# Tracks how far setup got, so on_error knows whether to attempt a restore.
SETUP_PROGRESS="none"

on_error() {
  local code=$?
  echo >&2
  echo "✗ Failed at stage: $SETUP_PROGRESS (exit $code)" >&2
  case "$SETUP_PROGRESS" in
    swapped|installed|pods)
      echo "  Working tree was modified — attempting automatic restore." >&2
      cmd_restore || echo "  Automatic restore also failed; run \`$0 restore\` manually." >&2
      ;;
    *)
      echo "  No working-tree changes to roll back." >&2
      ;;
  esac
  exit "$code"
}

cmd_setup() {
  trap on_error ERR

  if [[ -f "$MARKER" ]]; then
    echo "Already in packed mode (marker present at $MARKER)." >&2
    echo "Run \`$0 restore\` first, then re-run setup." >&2
    exit 1
  fi

  # Refuse to clobber an existing backup — usually means a prior setup died
  # mid-flight and the backup is the only surviving copy of the workspace
  # state. Better to bail than to overwrite it with whatever we have now.
  if [[ -f "$PKG_BACKUP" || -f "$LOCK_BACKUP" ]]; then
    echo "Stale backup file(s) detected:" >&2
    [[ -f "$PKG_BACKUP" ]] && echo "  $PKG_BACKUP" >&2
    [[ -f "$LOCK_BACKUP" ]] && echo "  $LOCK_BACKUP" >&2
    echo "Run \`$0 restore\` (which will use these to recover), then re-run setup." >&2
    exit 1
  fi

  require_tool jq
  require_tool yarn
  require_tool npm
  require_tool shasum

  echo "==> Cleaning previous artifacts"
  rm -rf "$ROOT/lib" "$TARBALL_DIR"
  mkdir -p "$TARBALL_DIR"

  SETUP_PROGRESS="packing"
  echo "==> Packing tarball (npm pack runs the 'prepare' lifecycle internally)"
  # npm pack > yarn pack here: yarn 3 omits the `prepublishOnly` lifecycle hook
  # and follows different default-include rules. Our actual publish goes through
  # `release-it` -> `npm publish`, so simulating with `npm pack` is closer to
  # the artifact customers will install. `prepare` (which runs `bob build`)
  # fires automatically via the pack lifecycle — no explicit prepare needed.
  local pkg_version
  pkg_version=$(jq -r '.version' "$ROOT/package.json")
  local raw_tarball="$TARBALL_DIR/klaviyo-react-native-sdk-$pkg_version.tgz"
  (cd "$ROOT" && npm pack --pack-destination "$TARBALL_DIR")

  # Yarn 3 caches `file:` deps by URL — re-using the same path on every run
  # silently serves stale cached content. Hash the tarball into the filename
  # so each pack is a distinct cache identity.
  local hash
  hash=$(shasum -a 256 "$raw_tarball" | cut -c1-12)
  local tarball="$TARBALL_DIR/klaviyo-react-native-sdk-$hash.tgz"
  mv "$raw_tarball" "$tarball"
  echo "    -> $tarball"

  SETUP_PROGRESS="swapped"
  echo "==> Backing up example/package.json + yarn.lock"
  cp "$EXAMPLE/package.json" "$PKG_BACKUP"
  cp "$ROOT/yarn.lock" "$LOCK_BACKUP"

  echo "==> Injecting tarball as explicit dependency in example/package.json"
  jq --arg path "file:../.tarballs/$(basename "$tarball")" \
    '.dependencies["klaviyo-react-native-sdk"] = $path' \
    "$EXAMPLE/package.json" > "$EXAMPLE/package.json.tmp"
  mv "$EXAMPLE/package.json.tmp" "$EXAMPLE/package.json"

  # Marker has to land BEFORE yarn install / pod install — it's how the
  # example's metro.config.js / babel.config.js / react-native.config.js
  # decide which mode to operate in. Tarball path written for status visibility.
  echo "==> Activating packed-mode marker"
  echo "$tarball" > "$MARKER"

  # `.yarn/install-state.gz` is keyed off the lockfile + node_modules layout.
  # Yarn 3 sometimes treats it as authoritative even after a lockfile change,
  # which can let stale packed/workspace state leak across runs. Clear it.
  rm -f "$INSTALL_STATE"

  # Metro persists Haste maps + transform output under $TMPDIR. Those keys
  # don't include the marker, so a workspace-mode session populates the
  # cache, then a packed-mode bundle hits the cache and gets back the
  # workspace resolution. Nuking these forces a fresh resolve. Babel's
  # `api.cache.using` in babel.config.js handles the per-file transform
  # invalidation; this handles Metro's higher-level caches.
  clear_metro_caches

  SETUP_PROGRESS="installed"
  echo "==> Installing in example/ (drops --immutable, package.json changed)"
  (cd "$EXAMPLE" && yarn install)

  SETUP_PROGRESS="pods"
  require_tool bundle
  echo "==> Running pod install in example/ios/"
  (cd "$EXAMPLE/ios" && bundle exec pod install)

  SETUP_PROGRESS="done"

  cat <<EOF

✓ Example app now consumes the packed SDK.

  Tarball: $tarball
  Marker:  $MARKER

Run the example app:
  yarn example ios               # interactive iOS launch
  yarn example android           # interactive Android launch
  yarn example build:ios         # non-interactive iOS build (good for CI)
  yarn example build:android     # non-interactive Android build (good for CI)

Restore workspace mode:
  $0 restore
EOF
}

cmd_restore() {
  # Disable the ERR trap during restore so a hiccup here can't recurse into
  # itself via on_error → cmd_restore.
  trap - ERR

  if [[ ! -f "$MARKER" && ! -f "$PKG_BACKUP" && ! -f "$LOCK_BACKUP" ]]; then
    echo "Already in workspace mode (no backup files present)."
    return 0
  fi

  # Remove the marker first so subsequent yarn install / pod install see
  # workspace-mode configs.
  rm -f "$MARKER"

  if [[ -f "$PKG_BACKUP" ]]; then
    echo "==> Restoring example/package.json"
    mv "$PKG_BACKUP" "$EXAMPLE/package.json"
  else
    echo "WARNING: example/package.json backup missing; package.json may need manual review." >&2
  fi

  if [[ -f "$LOCK_BACKUP" ]]; then
    echo "==> Restoring yarn.lock"
    mv "$LOCK_BACKUP" "$ROOT/yarn.lock"
  fi

  rm -f "$INSTALL_STATE"
  clear_metro_caches

  echo "==> Reinstalling dependencies"
  (cd "$EXAMPLE" && yarn install)

  echo "==> Running pod install in example/ios/"
  (cd "$EXAMPLE/ios" && bundle exec pod install)

  rm -rf "$TARBALL_DIR"

  echo "✓ Restored to workspace mode."
}

cmd_status() {
  if [[ -f "$MARKER" ]]; then
    echo "Mode: packed"
    echo "Tarball: $(cat "$MARKER")"
    [[ -f "$PKG_BACKUP" ]] && echo "Backup: $PKG_BACKUP"
  else
    echo "Mode: workspace"
  fi
}

case "${1:-}" in
  setup)   cmd_setup ;;
  restore) cmd_restore ;;
  status)  cmd_status ;;
  -h|--help|"") usage 0 ;;
  *) echo "Unknown command: ${1}" >&2; usage 1 ;;
esac
