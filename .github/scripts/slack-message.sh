#!/usr/bin/env bash
# Prints the Slack incoming-webhook JSON payload for an example-app publish result.
#
# Env: RESULT (success|failure|warning), PLATFORM, STORE, FULL_VERSION, BUILD,
# SDKS (one-line SDK summary), EVENT_NAME, RELEASE_TAG, HEAD_REF, REF_NAME,
# COMMIT_SHA, REPO, RUN_URL, INSTALL_URL, INSTALL_LABEL, INSTALL_FALLBACK,
# ACCESS_NOTE, STEPS_JSON (toJSON(steps), failure only).
set -euo pipefail

if [ "${EVENT_NAME:-}" = "release" ]; then
  source_label="release ${RELEASE_TAG:-}"
else
  source_label="${HEAD_REF:-${REF_NAME:-}}"
fi
source_label=$(printf '%s' "$source_label" | tr -cd 'A-Za-z0-9._/ +:-')

footer="*Build:* ${FULL_VERSION:-?} (${BUILD:-?})
*Source:* ${source_label} (${EVENT_NAME})
*Commit:* <https://github.com/${REPO}/commit/${COMMIT_SHA}|${COMMIT_SHA:0:7}> · <${RUN_URL}|CI run>"

case "${RESULT:-}" in
  success)
    get_build=''
    if [ -n "${INSTALL_URL:-}" ]; then
      get_build="<${INSTALL_URL}|${INSTALL_LABEL:-Tap to install build}>"
    elif [ -n "${INSTALL_FALLBACK:-}" ]; then
      get_build=$INSTALL_FALLBACK
    fi
    [ -z "${ACCESS_NOTE:-}" ] || get_build="${get_build:+$get_build — }${ACCESS_NOTE}"
    text="✅ RN Example (${PLATFORM}) → ${STORE}
${footer}
*SDKs:* ${SDKS:-—}
*Get the build:* ${get_build}"
    ;;
  warning)
    text="⚠️ RN Example (${PLATFORM}) → ${STORE}: uploaded, but setting What to Test failed
${footer}"
    ;;
  *)
    failed=$(printf '%s' "${STEPS_JSON:-}" | jq -r '[to_entries[] | select(.value.conclusion == "failure")][0].key // "unknown step"' 2>/dev/null || echo "unknown step")
    text="❌ RN Example (${PLATFORM}) deploy failed at ${failed//_/ }
${footer}"
    ;;
esac

jq -n --arg text "$text" '{text: ($text | split("\n")[0]), blocks: [{type: "section", text: {type: "mrkdwn", text: $text}}]}'
