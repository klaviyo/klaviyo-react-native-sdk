#!/usr/bin/env bash
# Fails when a GitHub ${{ }} expression in a workflow or action uses a
# string function that does not exist in the expression language
# (substr/substring/slice/left/right). These fail only at runtime, so they
# must be caught here. Shell parameter expansion like ${SHA:0:7} inside a
# run: block is not an expression and is allowed.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"

python3 - "$ROOT" <<'PY'
import glob
import os
import re
import sys

root = sys.argv[1]
pattern = re.compile(r'\$\{\{.*?\}\}', re.DOTALL | re.MULTILINE)
banned = re.compile(r'\b(?:substr|substring|slice|left|right)\s*\(')

files = glob.glob(os.path.join(root, '.github/workflows/*.yml')) + glob.glob(
    os.path.join(root, '.github/actions/**/*.yml'), recursive=True
)
bad = []
for path in files:
    with open(path) as f:
        text = f.read()
    for match in pattern.finditer(text):
        hit = banned.search(match.group(0))
        if hit:
            line = text.count('\n', 0, match.start()) + 1
            bad.append(f"{os.path.relpath(path, root)}:{line}: {hit.group(0)} in {match.group(0)!r}")
    # `if:` values are expressions without ${{ }}.
    for match in re.finditer(r'(?m)^\s*(?:-\s+)?if:\s*(.+?)\s*$', text):
        value = re.sub(r"'[^']*'", "''", match.group(1))
        hit = banned.search(value)
        if hit:
            line = text.count('\n', 0, match.start()) + 1
            bad.append(f"{os.path.relpath(path, root)}:{line}: {hit.group(0)} in if: {match.group(1)!r}")

if bad:
    print('Nonexistent GitHub expression string function(s) found:', file=sys.stderr)
    for b in bad:
        print(f'  {b}', file=sys.stderr)
    sys.exit(1)
print(f'checked {len(files)} files: no banned functions in expressions')
PY
