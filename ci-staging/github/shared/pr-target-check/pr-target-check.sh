#!/usr/bin/env bash
# Fails a PR into the protected base branch unless its head branch, title or
# override label allows it. On failure adds the warning label and posts one
# warning comment; on a pass removes both.
#
# Env: GH_TOKEN REPO PR_NUMBER HEAD_REF EVENT_BASE_REF PR_TITLE LABEL
#      OVERRIDE_LABEL MARKER PROTECTED_BASE ALLOWED_HEAD_PREFIXES TITLE_REGEX
set -e

warning_comment_ids() {
  gh api --paginate "repos/$REPO/issues/$PR_NUMBER/comments" \
    --jq ".[] | select(.user.login == \"github-actions[bot]\" and (.body | contains(\"$MARKER\"))) | .id"
}

pass() {
  echo "$1"
  gh pr edit "$PR_NUMBER" --repo "$REPO" --remove-label "$LABEL" 2>/dev/null || true
  local ids id
  if ids=$(warning_comment_ids); then
    for id in $ids; do
      gh api --method DELETE "repos/$REPO/issues/comments/$id" >/dev/null \
        || echo "::warning::Could not delete warning comment $id."
    done
  else
    echo "::warning::Could not list PR comments to remove the warning comment."
  fi
  exit 0
}

fail_closed() {
  echo "::error::$1 Failing closed; re-run this check."
  exit 1
}

read -ra PREFIXES <<<"$(printf '%s' "$ALLOWED_HEAD_PREFIXES" | tr '\n,' '  ')"

allowed_branch() {
  local prefix
  for prefix in "${PREFIXES[@]}"; do
    [[ "$1" == "$prefix"* ]] && return 0
  done
  return 1
}

allowed_title() {
  local title_lc
  [ -n "$TITLE_REGEX" ] || return 1
  title_lc=$(printf '%s' "$1" | tr '[:upper:]' '[:lower:]')
  [[ "$title_lc" =~ $TITLE_REGEX ]]
}

prefix_list() {
  local out="" prefix
  for prefix in "${PREFIXES[@]}"; do
    out="${out:+$out, }${prefix}*"
  done
  printf '%s' "$out"
}

BASE_REF=$(gh api "repos/$REPO/pulls/$PR_NUMBER" --jq '.base.ref') \
  || fail_closed "Could not fetch PR #$PR_NUMBER from the GitHub API."
[ -n "$BASE_REF" ] || fail_closed "The GitHub API returned no base branch for PR #$PR_NUMBER."
echo "Base branch: '$BASE_REF' (event base_ref: '$EVENT_BASE_REF')."

if [[ "$BASE_REF" != "$PROTECTED_BASE" ]]; then
  pass "PR targets '$BASE_REF' (not $PROTECTED_BASE) — check not required."
fi

if allowed_branch "$HEAD_REF"; then
  pass "Branch '$HEAD_REF' is allowed to target $PROTECTED_BASE."
fi

if allowed_title "$PR_TITLE"; then
  pass "PR title '$PR_TITLE' has an allowed conventional-commit prefix — allowed to target $PROTECTED_BASE."
fi

HAS_OVERRIDE=$(gh api "repos/$REPO/issues/$PR_NUMBER/labels" \
  --jq ".[] | select(.name == \"$OVERRIDE_LABEL\") | .name" | head -1)

if [ -n "$HAS_OVERRIDE" ]; then
  pass "$OVERRIDE_LABEL label present — bypassing check. This PR will merge directly to $PROTECTED_BASE without a release branch."
fi

if ! EXISTING=$(warning_comment_ids); then
  echo "::warning::Could not list PR comments; not posting the warning comment."
  EXISTING=unknown
fi

if [ -z "$EXISTING" ]; then
  gh api "repos/$REPO/issues/$PR_NUMBER/comments" \
    --method POST \
    --field body="${MARKER}
**:warning: This PR needs to target a release branch before it can merge to \`$PROTECTED_BASE\`.**

All changes — including hotfixes and feature work — should flow through a \`rel/*\` branch rather than merging directly to \`$PROTECTED_BASE\`. This keeps commit history clean and ensures every change is tied to a release.

**To fix:** change the base branch of this PR to the appropriate \`rel/*\` branch when available. You can do this without closing the PR — use the base branch dropdown at the top of the PR.

- If this is CI/tooling work, rename your branch with a \`ci/\` prefix and this check will pass
- If this is documentation-only work, rename your branch with a \`docs/\` prefix and this check will pass
- Alternatively, give the PR a conventional-commit title prefixed with \`ci:\`, \`chore:\`, \`docs:\`, or \`rel:\` (scopes like \`ci(workflows):\` also work) and this check will pass

> **Override:** In exceptional circumstances, a maintainer may add the \`$OVERRIDE_LABEL\` label to bypass this check and merge directly to \`$PROTECTED_BASE\`. This should be used sparingly — it skips the release branch entirely and may result in changes not being included in a release or loss of commit attribution if not handled carefully.

_Enforced by the \`pr-target-check\` workflow._"
fi

gh pr edit "$PR_NUMBER" --repo "$REPO" --add-label "$LABEL"

echo "Branch '$HEAD_REF' cannot target $PROTECTED_BASE directly. Use a $(prefix_list) branch, a matching PR title, or add the $OVERRIDE_LABEL label to override."
exit 1
