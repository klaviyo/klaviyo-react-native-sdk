#!/usr/bin/env bash
# Fits store release notes into the store's character cap without ever
# exceeding it. Header lines (everything before the first blank line) are
# never cut. When the notes exceed the cap the result always ends with a
# "…[truncated]" marker on its own final line; to make room, the body is cut
# first, then the "CI run:" line (the header's last line). If even the
# non-CI header lines plus the marker cannot fit, the script fails loudly
# rather than emit unmarked or over-cap notes.
#
# Usage: truncate-notes.sh <max_length> <notes-file>
# Prints the result to stdout. LC_ALL=C.UTF-8 is forced so the
# character-based cut never splits a multibyte character.
set -euo pipefail

[ $# -eq 2 ] || {
  echo "usage: $0 <max_length> <notes-file>" >&2
  exit 2
}

max=$1
file=$2
export LC_ALL=C.UTF-8
marker='…[truncated]'

notes=$(cat "$file")
if [ "${#notes}" -le "$max" ]; then
  printf '%s' "$notes"
  exit 0
fi

# The header is everything up to the first blank line; the rest is body.
header=${notes%%$'\n\n'*}
if [ "$header" = "$notes" ]; then
  body=''
else
  body=${notes#*$'\n\n'}
fi

# fit <header> prints header + blank line + <body prefix> + marker within the
# cap, or returns 1 when even the marker does not fit under the header.
fit() {
  local hdr=$1 budget
  budget=$((max - ${#hdr} - ${#marker}))
  if [ "$budget" -lt 0 ]; then
    return 1
  fi
  if [ "$budget" -ge 2 ]; then
    printf '%s\n\n%s%s' "$hdr" "${body:0:$((budget - 2))}" "$marker"
  else
    printf '%s%s' "$hdr" "$marker"
  fi
}

if fit "$header"; then
  exit 0
fi

# Drop the CI run line (last header line) and retry.
short_header=${header%$'\n'*}
if [ "$short_header" = "$header" ] || ! fit "$short_header"; then
  echo "truncate-notes.sh: header alone exceeds cap $max even without the CI run line; refusing to emit unmarked notes" >&2
  exit 1
fi
