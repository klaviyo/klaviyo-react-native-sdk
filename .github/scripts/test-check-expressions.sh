#!/usr/bin/env bash
# Tests for check-expressions.sh against fixture trees: banned functions
# inside ${{ }} must fail; shell ${VAR:0:7} and plain-text mentions must not.
# Usage: test-check-expressions.sh (run from anywhere)
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"

WORK=$(mktemp -d)
trap 'rm -rf "$WORK"' EXIT

fail_count=0
fail() {
  echo "FAIL: $1"
  fail_count=$((fail_count + 1))
}
pass() { echo "PASS: $1"; }

# Runs the script with ROOT pointed at a fixture by symlink-swapping: the
# script derives ROOT from its own path, so copy it into the fixture.
run_on_fixture() {
  local fixture=$1
  mkdir -p "$fixture/.github/scripts"
  cp "$REPO_ROOT/.github/scripts/check-expressions.sh" "$fixture/.github/scripts/"
  "$fixture/.github/scripts/check-expressions.sh"
}

# Positive: banned function inside an expression must fail.
fx="$WORK/positive"
mkdir -p "$fx/.github/workflows"
cat > "$fx/.github/workflows/w.yml" <<'EOF'
on: push
jobs:
  x:
    steps:
      - run: echo "${{ substr(github.sha, 0, 7) }}"
EOF
if run_on_fixture "$fx" >/dev/null 2>&1; then
  fail "positive: substr in expression not caught"
else
  pass "positive: substr in expression fails"
fi

# Multi-line expression containing slice( must fail.
fx="$WORK/multiline"
mkdir -p "$fx/.github/workflows"
cat > "$fx/.github/workflows/w.yml" <<'EOF'
on: push
jobs:
  x:
    steps:
      - env:
          SHORT: ${{
            slice(github.sha,
            0, 7) }}
        run: echo "$SHORT"
EOF
if run_on_fixture "$fx" >/dev/null 2>&1; then
  fail "multiline: slice in expression not caught"
else
  pass "multiline: slice in expression fails"
fi

# Negative: shell ${SHA:0:7} in a run block is fine.
fx="$WORK/shell"
mkdir -p "$fx/.github/workflows"
cat > "$fx/.github/workflows/w.yml" <<'EOF'
on: push
jobs:
  x:
    steps:
      - run: |
          SHA=${{ github.sha }}
          echo "${SHA:0:7}"
EOF
if run_on_fixture "$fx" >/dev/null 2>&1; then
  pass "negative: shell substring expansion allowed"
else
  fail "negative: shell substring expansion wrongly flagged"
fi

# Negative: the word in plain text (no expression) is fine.
fx="$WORK/plaintext"
mkdir -p "$fx/.github/actions/a"
cat > "$fx/.github/actions/a/action.yml" <<'EOF'
name: x
description: Do not use substr( in expressions; they do not exist there.
runs:
  using: composite
  steps:
    - run: echo hi
      shell: bash
EOF
if run_on_fixture "$fx" >/dev/null 2>&1; then
  pass "negative: plain-text mention allowed"
else
  fail "negative: plain-text mention wrongly flagged"
fi

# The real repo must pass.
if "$REPO_ROOT/.github/scripts/check-expressions.sh" >/dev/null; then
  pass "real repo: clean"
else
  fail "real repo: banned function found"
fi

if [ "$fail_count" -gt 0 ]; then
  exit 1
fi
echo "all check-expressions tests passed"
