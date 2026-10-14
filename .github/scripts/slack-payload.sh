#!/usr/bin/env bash
# Wraps a Slack message (read from a file, mrkdwn, may span lines and contain
# quotes) in an incoming-webhook JSON payload and prints it. Building the
# payload with jq keeps newlines, quotes and backslashes in the message from
# ever reaching a YAML scalar.
#
# Usage: slack-payload.sh <message-file>
set -euo pipefail

[ $# -eq 1 ] || {
  echo "usage: $0 <message-file>" >&2
  exit 2
}
[ -r "$1" ] || {
  echo "cannot read $1" >&2
  exit 1
}

jq -n --rawfile text "$1" '
  ($text | rtrimstr("\n")) as $t
  | {
      text: ($t | split("\n")[0]),
      blocks: [
        {type: "section", text: {type: "mrkdwn", text: $t}}
      ]
    }'
