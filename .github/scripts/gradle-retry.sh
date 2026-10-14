#!/usr/bin/env bash
# Runs ./gradlew with the given arguments, retrying only when dependency resolution fails.
# JitPack builds branch and commit SDK targets on first request, so the first fetch can time out
# or 404. Retries wait for JitPack and bypass Gradle's cached 404s.
# Usage: gradle-retry.sh <gradle args...>   (MAX_ATTEMPTS, default 3; RETRY_DELAY_SECONDS, default 60)
set -uo pipefail

max_attempts=${MAX_ATTEMPTS:-3}
log=$(mktemp)
extra=()

for attempt in $(seq 1 "$max_attempts"); do
  echo "=== Gradle attempt $attempt of $max_attempts ==="
  if ./gradlew "$@" ${extra[@]+"${extra[@]}"} 2>&1 | tee "$log"; then
    exit 0
  fi
  if ! grep -q -E "Could not resolve|Could not get resource|Could not GET|Could not find|Read timed out" "$log"; then
    echo "Gradle failed with a non-dependency error"
    exit 1
  fi
  echo "Dependency resolution failed, waiting for JitPack before retrying"
  extra=(--refresh-dependencies)
  sleep "${RETRY_DELAY_SECONDS:-60}"
done

echo "Gradle failed after $max_attempts attempts"
exit 1
