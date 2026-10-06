# Pending workflow changes (MAGE-1075)

`publish-example.yml` here is the proposed replacement for
`.github/workflows/publish-example.yml`. The automation that wrote it can't
push to `.github/workflows/` (its token has no `workflow` scope), so it lives
here, where GitHub Actions never runs it.

Someone with workflow permission should apply it before merging:

    git mv -f .github/pending-workflows/publish-example.yml .github/workflows/publish-example.yml
    git rm -r .github/pending-workflows

The scripts and composite actions it uses (`.github/scripts/`,
`.github/actions/example-release-notes/`, and the new inputs on
`.github/actions/notify-slack-publish/`) are already in place, and the
current workflow ignores them.
