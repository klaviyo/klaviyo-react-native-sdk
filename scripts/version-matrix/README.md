# React Native version matrix

Packs this working tree exactly as npm would publish it, installs that tarball into
stock React Native apps at several versions, and records what actually happens.

Run it when you change a dependency, touch `android/build.gradle`, bump the Klaviyo
Android SDK pin, or add a file that has to reach customers.

```bash
./scripts/version-matrix/version-matrix.sh              # tier 1, default versions
./scripts/version-matrix/version-matrix.sh --tier 2     # add debug builds
./scripts/version-matrix/version-matrix.sh --tier 4 0.87.1
```

Android only. It is not wired into CI and is not meant to be — it is a manual check
you run when you have a reason to.

---

## Why this exists

Our CI builds exactly one thing: `example/` at one React Native version, debug only.

Two properties of that setup make whole categories of bug invisible:

**`example/android/build.gradle` sets `ext.kotlinVersion`.** Every CI build therefore
takes the host branch of our Kotlin version selection. The fallback that older
consumers get is never executed — not once, ever.

**`example/` resolves the SDK through a yarn-workspace symlink.** Customers install a
tarball built from the `files[]` allowlist. Those are different file sets. A file
missing from `files[]` is invisible to CI and fatal to customers.

So CI cannot see version-selection bugs, packaging bugs, consumer-side AAR metadata
rejections, or anything that only appears in a minified release build. All four have
bitten us. This script closes that gap.

---

## Tiers

Each tier is a superset of the one below it.

| Tier | Adds                                                                         | Roughly            | Needs                |
| ---- | ---------------------------------------------------------------------------- | ------------------ | -------------------- |
| 1    | Resolution facts only — AGP, Kotlin plugin, stdlib, reflect. No compilation. | ~2 min per version | —                    |
| 2    | Debug build of our module, then of the consumer app                          | ~4 min per version | —                    |
| 3    | Release build with R8 on; records which ProGuard config applied              | ~6 min per version | —                    |
| 4    | Install, launch, exercise the public API, read logcat                        | ~8 min per version | A device or emulator |

First run per version adds several minutes of scaffolding. That result is cached, so
re-runs are much faster.

Tier 1 is the one to reach for by default. It catches version-selection problems,
which is the largest class, and it needs no toolchain cooperation.

---

## Reading the output

Three files land in `~/.klaviyo-rn-version-matrix/`:

| File              | What it is                                        |
| ----------------- | ------------------------------------------------- |
| `matrix.md`       | The tables, ready to paste into a PR              |
| `results.json`    | Same data, machine-readable                       |
| `logs/<version>/` | Every raw log, so any cell can be checked by hand |

To see what your change did, run before and after and diff the JSON:

```bash
./scripts/version-matrix/version-matrix.sh --tier 2 && cp ~/.klaviyo-rn-version-matrix/results.json /tmp/before.json
# ... make your change ...
./scripts/version-matrix/version-matrix.sh --tier 2 && cp ~/.klaviyo-rn-version-matrix/results.json /tmp/after.json
diff <(jq -S . /tmp/before.json) <(jq -S . /tmp/after.json)
```

### Columns that need explaining

**`AGP (ours)` reading `none (guarded)` is the expected, correct result.** Gradle loads
plugins parent-first, so a host app's own AGP always wins over the one our module's
buildscript declares. That absence is the evidence the guard works. A version number
here would mean something is wrong.

**`round trip` is the column to read first.** Every other public API is fire-and-forget
on the legacy bridge, so a JS-side try/catch around it catches nothing — a call that
never reaches native still counts as OK. `isLoggingEnabled` takes a callback, so `yes`
here is the only proof the bridge actually completed a round trip. If this says `NO`
while `crashes` is `0`, do not trust any other runtime column in that row: the app
launched but produced no evidence, and you need to find out why before reading
anything else as a result.

**`proguard cfg` matters more than it looks.** `proguard-android.txt` contains
`-dontoptimize`, so R8's optimisation pass never runs and a "minified" build proves far
less than you would assume. AGP 9 rejects that file outright. During MAGE-919, 11 of 12
release builds silently used it.

**`R8 ran`** is read from whether `mapping.txt` was produced, not from whether the script
successfully edited the Gradle file. It verifies the outcome rather than the attempt.

**`native log lines`** counts lines tagged `Klaviyo.<Class>` by the Android SDK's logger.
R8 renames the class but the `Klaviyo.` prefix survives, so this works in minified builds
too. It is independent confirmation of what `round trip` claims.

---

## What each guard prevents

Every one of these is a real incident from MAGE-919, not a hypothetical.

| Guard                                                                | What went wrong without it                                                                                                                                                                                                                                                                                       |
| -------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Scaffolds are snapshotted pristine and restored before **every** run | A cached `App0815` scaffold still carried `kotlinVersion = "2.0.0"` from an earlier experiment and produced a false stdlib/reflect reading. It was caught by luck, because one value contradicted an earlier one. An existence check cannot detect a mutated scaffold; restoring from a snapshot cannot miss it. |
| Tarball filename contains a hash of its **contents**                 | npm caches `file:` dependencies by path. A repack under the same filename was silently ignored and a stale tarball installed. The resulting crash looked real and meant nothing.                                                                                                                                 |
| `diff -r` of the installed package against the packed tarball        | Nothing used to check this. A fix was once "verified" against an installed package that did not contain the fix.                                                                                                                                                                                                 |
| `rm -rf app/build/outputs` before every release build                | A build failed in 3 seconds, the script installed the _previous_ APK, and the result voided an entire matrix cell.                                                                                                                                                                                               |
| `isLoggingEnabled` round-trip call                                   | "108 calls, zero failures" was measuring nothing. The JS try/catch only sees synchronous throws, and there were zero native log lines in any run.                                                                                                                                                                |
| `mapping.txt` existence check                                        | Confirms minification actually ran, rather than trusting that a `sed` matched.                                                                                                                                                                                                                                   |
| `pidof` after launch                                                 | Distinguishes "the bridge produced no evidence" from "the app was never running". These look identical in the columns and mean completely different things.                                                                                                                                                      |
| Pure ASCII, bash 3.2 idioms                                          | macOS ships bash 3.2. It folds a multibyte character following `$var` into the variable _name_; a stray U+2192 arrow killed a whole run under `set -u`. `${VAR,,}` also does not exist there.                                                                                                                    |
| Workspace outside `/tmp`                                             | macOS purges `/private/tmp` after a few days. It destroyed a previous run's scaffolds and logs.                                                                                                                                                                                                                  |

---

## Maintaining it

**Change which versions run by default** — edit `DEFAULT_VERSIONS` near the top. Each
entry has a comment saying why it is there. `ALL_VERSIONS` is the full sweep, reachable
with `--versions all`.

**Add or remove a tracked dependency column** — edit the `TRACKED` array. One line per
coordinate, `label|regex-escaped-coordinate`. Nothing else needs touching; the tables and
the JSON both derive from it.

When MAGE-1203 lands and `kotlin-reflect` is gone, delete its line from `TRACKED`. The
skew detection compares whatever is left, so it keeps working with one entry or five.

**The smoke app** is `smoke/App.tsx`, copied over the scaffold at tier 4 before the
release build. Add API calls there, not in the shell script.

---

## Troubleshooting

**`tier 4 needs exactly one ready device, found 0`** — start an emulator, or pass
`--serial <id>`. Only devices in state `device` count; `offline` and `unauthorized` are
deliberately excluded so they fail clearly rather than obscurely.

**A version reports `scaffold failed`** — check `logs/<version>/init.log`. The community
CLI prints "Run instructions for Android" and exits 0 even when it copied no template, so
the exit code is never trusted.

**A version reports `install mismatch`** — the installed package differs from the tarball
we packed. `logs/<version>/install-verify.log` has the diff. This usually means a stale
install survived; `--fresh` clears it.

**Results look wrong for one version** — `--fresh <version>` discards its cached scaffold
and starts over. The raw logs in `logs/<version>/` back every cell in the tables.

**A run is taking forever** — the first run per version includes a full `npm install`.
Subsequent runs reuse it. `--clean` wipes everything if you want to start fresh.

---

## Not covered

- **iOS.** The iOS floor is set by React Native's own vendored `fmt` against Xcode, which
  we cannot influence. Worth building if that stops being true.
- **CI.** Deliberate. Which versions we support is still an open question (MAGE-1176), and
  a CI axis cannot be chosen before that is answered. Note also that a debug-compile CI job
  would not have caught the AGP 9 crash, which only appears in a minified release build at
  launch — any future CI version axis needs `assembleRelease` plus a real launch to be worth
  its runtime.
- **Push notifications.** Needs real hardware and a real `google-services.json`.
