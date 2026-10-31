---
name: release-post
description: Turn a release of the current repository (a git tag, a GitHub release or a CHANGELOG section) into social media posts with Flung. Reads what changed, drafts copy for each connected platform within its character limit, and asks before scheduling anything. Use when the person asks to announce, share or post about a release, a version, a tag, a changelog or what shipped, or runs /flung:release-post with a tag such as v1.2.0.
---

# Post about a release

Read what the release changed from the repository itself, write posts people want to read, and schedule them only when the person says yes. The `flung:post` skill holds the scheduling rules; this skill adds where the words come from.

The release is `$ARGUMENTS`: a tag such as `v1.2.0`, or empty for the latest one.

## Ground rules

- **Ask before scheduling.** Drafting is free; scheduling and publishing happen only after the person approves the exact text, accounts and time.
- **Only what the release says.** Every claim in a post comes from the changelog, the release notes or the commits. No invented numbers, quotes, customers or links.
- **Public facts only.** Leave out internal ticket numbers, private repository names, people's emails, security details of an unreleased fix, and anything under `.env` or another secrets file (never read those).
- **Times as the person says them**, with no conversion: see the time rule in `flung:post`.

## Steps

1. **Find the release.** Run these read-only commands in the repository root, stopping at the first that answers:

   | Source | Command |
   |---|---|
   | The tag named, or the latest | `git describe --tags --abbrev=0` |
   | The tag before it | `git describe --tags --abbrev=0 <tag>^` |
   | The GitHub release notes | `gh release view <tag> --json name,tagName,body,url,publishedAt` |
   | The changelog section | The `## <version>` or `## [<version>]` section of `CHANGELOG.md` (also `CHANGES.md`, `HISTORY.md`, or a package's own `CHANGELOG.md` in a monorepo when the tag names it, such as `sdk-v0.4.0`) |
   | The commits | `git log --no-merges --format='%s' <previous tag>..<tag>` |

   If there is no tag yet, use the commits since the first commit or the `Unreleased` section, and say the release has no tag. If `gh` is not signed in or the repository is not on GitHub, carry on without the release notes.
2. **Sort what changed.** With Conventional Commits, `feat` is new, `fix` and `perf` are fixed, a `!` or `BREAKING CHANGE` is a breaking change; skip `chore`, `ci`, `test`, `build`, `style` and `docs` unless they are the point of the release. Pick the two or three changes a user would care about most. Note the link to share: the GitHub release `url`, else the repository's changelog page.
3. **Pick the accounts.** As in `flung:post`: `get_time`, `list_profiles` (ask which brand if there are several), `list_accounts` with `status: "active"`, and `list_platforms` for each `maxTextLength`. Ask which platforms if the person did not say; offer the developer ones first (X, Bluesky, Mastodon, LinkedIn, Threads, Discord).
4. **Draft per platform.** One post per platform, each within its limit, counting the link in full:

   | Platform | Shape |
   |---|---|
   | X (280), Bluesky (300), Farcaster (320) | The version, the one change that matters most, the link. One hashtag at most. |
   | Threads, Mastodon (500) | The version, two or three changes as short lines, the link. |
   | LinkedIn (3000) | A first line that stands alone, a short paragraph on why it matters, the changes as a short list, the link. |
   | Discord (2000) | The release notes, lightly trimmed, with the link. |

   Write plainly, in the project's own voice (read the README's tone). No emoji unless the project's own posts use them.
5. **Show the drafts and ask.** Show each platform's text with its character count, the accounts, and offer a time: now, a time the person names, or `bestTime`. Ask: schedule these, change them, or stop. Do nothing more until they answer.
6. **Schedule on yes.** Follow `flung:post` steps 8 to 10: `schedule_post` with `platformOverrides` for the per-platform text and an `idempotencyKey` such as `release-<tag>`, the local `publishAt` as said, then confirm the local time back with `get_time` and `publishAtLocal`.

## Example

The person runs `/flung:release-post v1.4.0` in a repository with Conventional Commits.

1. `git describe --tags --abbrev=0 v1.4.0^` answers `v1.3.2`. `gh release view v1.4.0` gives the notes and the URL.
2. The commits since `v1.3.2` include `feat(cli): add --watch to the build command`, `feat: support Node 24`, `fix: keep file order on Windows`, plus `chore` and `ci` ones that are skipped.
3. Active accounts: X and LinkedIn. `list_platforms`: 280 and 3000.
4. Drafts:

   X (154 characters):

   ```text
   v1.4.0 is out: build --watch rebuilds as you save, Node 24 is supported, and file order holds on Windows.
   https://github.com/acme/tool/releases/tag/v1.4.0
   ```

   LinkedIn:

   ```text
   Version 1.4.0 of Acme Tool is out.

   The build command can now watch your files and rebuild as you save, so the edit and check loop is one step.

   Also in this release:
   - Node 24 is supported
   - File order is kept on Windows

   Release notes: https://github.com/acme/tool/releases/tag/v1.4.0
   ```

5. Ask: "Schedule these for X and LinkedIn, and when? Now, a time you name, or the best time for X?" The person says "tomorrow 10am"; `get_time` gives the date; schedule with `"publishAt": "2026-11-03T10:00"` and `"idempotencyKey": "release-v1.4.0"`; confirm "Scheduled for Tuesday 3 November at 10:00 Australia/Brisbane".
