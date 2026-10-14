#!/usr/bin/env bash
# Prints a readable name for the first failed step of a job, from the
# `steps` context serialized as JSON (toJSON(steps)). Only steps that have an
# `id` appear in that context; the id is turned into words (build_deploy ->
# "build deploy"). Prints "unknown step" when nothing failed or the input is
# empty or invalid.
#
# Usage: failed-step.sh <steps-json>
set -euo pipefail

json=${1:-}
name=$(printf '%s' "$json" | jq -r '
  [to_entries[] | select(.value.outcome == "failure")][0].key // empty' 2>/dev/null || true)

if [ -z "$name" ]; then
  echo "unknown step"
else
  echo "${name//_/ }"
fi
