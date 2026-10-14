#!/usr/bin/env bash
# Prints the Slack message text (mrkdwn) for an example-app publish result.
# Kept out of the workflow so it can be tested offline; free text arrives
# only through env vars and the output is referenced by step output, never
# interpolated into a payload.
#
# Env:
#   RESULT        success | failure
#   PLATFORM      iOS | Android
#   STORE         TestFlight | Play internal
#   FULL_VERSION  package.json version, e.g. 2.6.0-rc.1
#   BUILD         build number / versionCode
#   RN_VERSION    RN SDK semver (or empty)
#   RN_REF        RN SDK ref (or empty)
#   NATIVE_NAME   iOS | Android (native SDK label)
#   NATIVE_VERSION, NATIVE_REF   native SDK semver / ref (or empty)
#   SOURCE_LABEL  from source-label.sh
#   EVENT_NAME    github.event_name
#   COMMIT_SHA    PR head or run SHA (7-char short form shown)
#   REPO          owner/repo, for the commit link
#   RUN_URL       workflow run URL
#   INSTALL_URL, INSTALL_LABEL, INSTALL_FALLBACK, ACCESS_NOTE
#   FAILED_STEP   name of the step that failed (failure form only)
set -euo pipefail

sdk_entry() {
  local name=$1 version=$2 ref=$3
  [ -z "$version" ] && version='—'
  if [ -n "$ref" ] && [ "$ref" != "$version" ]; then
    printf '%s %s · %s' "$name" "$version" "$ref"
  else
    printf '%s %s' "$name" "$version"
  fi
}

get_build=''
if [ -n "${INSTALL_URL:-}" ]; then
  get_build="<${INSTALL_URL}|${INSTALL_LABEL:-Tap to install build}>"
elif [ -n "${INSTALL_FALLBACK:-}" ]; then
  get_build=$INSTALL_FALLBACK
fi
if [ -n "${ACCESS_NOTE:-}" ]; then
  if [ -n "$get_build" ]; then
    get_build="${get_build} — ${ACCESS_NOTE}"
  else
    get_build=$ACCESS_NOTE
  fi
fi

if [ "${RESULT:-}" = "success" ]; then
  cat <<EOF
✅ RN Example (${PLATFORM}) → ${STORE}
*Build:* ${FULL_VERSION} (${BUILD})
*SDKs:* $(sdk_entry RN "${RN_VERSION:-}" "${RN_REF:-}") | $(sdk_entry "${NATIVE_NAME}" "${NATIVE_VERSION:-}" "${NATIVE_REF:-}")
*Source:* ${SOURCE_LABEL} (${EVENT_NAME})
*Commit:* <https://github.com/${REPO}/commit/${COMMIT_SHA}|${COMMIT_SHA:0:7}> · <${RUN_URL}|CI run>
*Get the build:* ${get_build}
EOF
else
  cat <<EOF
❌ RN Example (${PLATFORM}) deploy failed at ${FAILED_STEP:-unknown step}
*Build:* ${FULL_VERSION:-?} (${BUILD:-?})
*Source:* ${SOURCE_LABEL} (${EVENT_NAME})
*Commit:* <https://github.com/${REPO}/commit/${COMMIT_SHA}|${COMMIT_SHA:0:7}> · <${RUN_URL}|CI run>
EOF
fi
