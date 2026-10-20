#!/usr/bin/env bash
# Prints the Slack incoming-webhook JSON payload for an example-app, npm or
# GitHub-release publish result.
#
# Env: RESULT (success|failure|warning|pending|stopped), REASON, PLATFORM (iOS|Android|npm|release), STORE, FULL_VERSION, BUILD,
# SDKS (one-line SDK summary), EVENT_NAME, RELEASE_TAG, HEAD_REF, REF_NAME,
# COMMIT_SHA, REPO, RUN_URL, INSTALL_URL, INSTALL_LABEL, INSTALL_FALLBACK,
# ACCESS_NOTE, STEPS_JSON (toJSON(steps), failure only).
set -euo pipefail

if [ "${EVENT_NAME:-}" = "release" ] || [ "${PLATFORM:-}" = "npm" ] || [ "${PLATFORM:-}" = "release" ]; then
  source_label="release ${RELEASE_TAG:-${FULL_VERSION:-}}"
else
  source_label="${HEAD_REF:-${REF_NAME:-}}"
fi
source_label=$(printf '%s' "$source_label" | tr -cd 'A-Za-z0-9._/ +:-')
sdks=$(printf '%s' "${SDKS:-—}" | tr -d '<>&')

footer="*Build:* ${FULL_VERSION:-?} (${BUILD:-?})
*Source:* ${source_label} (${EVENT_NAME})
*Commit:* <https://github.com/${REPO}/commit/${COMMIT_SHA}|${COMMIT_SHA:0:7}> · <${RUN_URL}|CI run>"

if [ "${PLATFORM:-}" = "npm" ] || [ "${PLATFORM:-}" = "release" ]; then
  footer="*Source:* ${source_label} (${EVENT_NAME})
*Commit:* <https://github.com/${REPO}/commit/${COMMIT_SHA}|${COMMIT_SHA:0:7}> · <${RUN_URL}|CI run>"
fi

if [ "${PLATFORM:-}" = "release" ]; then
  if [ "${RESULT:-}" = "pending" ]; then
    text="⏳ RN SDK ${FULL_VERSION:-?}: awaiting approval, approve the npm deploy on the run to publish
${footer}"
  elif [ "${RESULT:-}" = "stopped" ]; then
    text="⚠️ RN SDK ${FULL_VERSION:-?} release stopped: ${REASON:-cancelled}. Nothing more will publish from this run
${footer}"
  else
    failed=$(printf '%s' "${STEPS_JSON:-}" | jq -r '[to_entries[] | select(.value.conclusion == "failure")][0].key // "unknown step"' 2>/dev/null || echo "unknown step")
    text="❌ RN SDK ${FULL_VERSION:-?} release failed at ${failed//_/ }
${footer}"
  fi
elif [ "${PLATFORM:-}" = "npm" ]; then
  if [ "${RESULT:-}" = "success" ]; then
    if [ "${ALREADY_PUBLISHED:-}" = "true" ]; then
      text="✅ RN SDK ${FULL_VERSION:-?} already on npm, nothing to do
${footer}"
    else
      text="✅ RN SDK ${FULL_VERSION:-?} published to npm (dist-tag ${DIST_TAG:-latest})
${footer}"
    fi
  else
    failed=$(printf '%s' "${STEPS_JSON:-}" | jq -r '[to_entries[] | select(.value.conclusion == "failure")][0].key // "unknown step"' 2>/dev/null || echo "unknown step")
    text="❌ RN SDK npm publish failed at ${failed//_/ }
${footer}"
  fi
else
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
*SDKs:* ${sdks}
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
fi

jq -n --arg text "$text" '{text: ($text | split("\n")[0]), blocks: [{type: "section", text: {type: "mrkdwn", text: $text}}]}'
