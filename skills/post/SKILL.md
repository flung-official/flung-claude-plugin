---
name: post
description: Draft and schedule a social media post with Flung across the person's connected accounts (X, LinkedIn, Bluesky, Threads, Mastodon, Instagram, Facebook, TikTok, YouTube, Pinterest, Discord, Farcaster), now or at a time they name. Passes the local time the person said straight to Flung without converting it, and confirms the scheduled time back in their own time zone with get_time. Use when the person asks to post, share, announce, tweet, schedule or queue something on social media, or runs /flung:post with the text or an idea.
---

# Draft and schedule a post

The Flung MCP server does the work: it knows the person's accounts, each platform's limits and their time zone, and it turns a local time into UTC itself. Your part is good copy, the right accounts, and passing the time exactly as the person said it.

The request is `$ARGUMENTS`. If that is empty, ask what to post and when.

## The time rule

This rule overrides everything below.

- Pass `publishAt` as the person's own wall-clock time, written `YYYY-MM-DDTHH:MM` with **no offset and no `Z`**: "Tuesday at 9am" becomes `2026-11-03T09:00`. Flung converts it to UTC in their zone, and handles clock changes.
- **Never convert a time yourself**, never add an offset, never work out UTC, and never use the clock of this machine or its `date` command: the machine's zone is not the person's.
- Pass `timeZone` only when the person named a place or zone ("9am in Athens", "New York time"), as an IANA name such as `Europe/Athens`. Otherwise leave it out: Flung uses the zone of the person who signed in.
- For "now", leave `publishAt` out.

## Steps

1. **Read the clock.** Call `get_time`. It answers `timeZone`, `timeZoneSource`, `now` (UTC) and `nowLocal`. Use `nowLocal` to turn "tomorrow", "Monday" or "next week" into a date. If the day is unclear ("this Friday" on a Friday), ask.
2. **Pick the brand.** A brand (a profile in the API) keeps one customer's or one product's accounts apart. Call `list_profiles`. With more than one brand and none named, ask which one; then pass its `id` as `profileId` to every call below. With none, leave `profileId` out.
3. **Find the accounts.** Call `list_accounts` (with `profileId`, and `status: "active"`). Match the platforms the person named; if they said "everywhere", use every active account. An account that is `needs_reconnect` or `disconnected` cannot post: say so, and offer the `flung:connect` skill.
4. **Read the limits.** Call `list_platforms` once. For each platform note `maxTextLength`, `requiresMedia`, `maxImages` and `video`. Instagram, TikTok, YouTube and Pinterest need media.
5. **Draft the copy.** Write one version per platform that fits its `maxTextLength`, counting every character, links in full. Keep the person's words and facts; change length and tone, not meaning. No invented numbers, quotes or links. Typical limits, which `list_platforms` overrides:

   | Platform | Characters |
   |---|---|
   | X | 280 |
   | Bluesky | 300 |
   | Farcaster | 320 |
   | Threads, Mastodon, Pinterest | 500 |
   | Discord | 2000 |
   | Instagram, TikTok | 2200 |
   | LinkedIn | 3000 |
   | YouTube | 5000 |

6. **Media.** Flung takes a public `https` address of an image or video (JPEG, PNG, WebP, GIF, MP4, QuickTime, up to 100 MB). A file only on this machine cannot be sent through the MCP server: ask for a public link instead. For TikTok, call `get_posting_options` and ask the person who may see the post (`privacyLevel`).
7. **Show the draft and ask.** Show each platform's text with its character count, the accounts by username, the media, and the time as the person said it ("Tuesday 3 November at 09:00, your time"). Schedule nothing until they say yes. Change what they ask and show it again.
8. **Schedule.** Pick the call:

   | The post | Call |
   |---|---|
   | The same text everywhere, media from URLs, by platform name | `publish_to_platforms` with `content`, `platforms`, `mediaUrls`, `publishAt` or `bestTime: true`, and `profileId` |
   | Different text per platform, or chosen accounts | `import_media` for each file, then `schedule_post` with `content`, `accountIds`, `mediaIds`, `platformOverrides`, `publishAt`, `profileId` and an `idempotencyKey` |

   Make the `idempotencyKey` once per post, such as `post-<short slug>-<date>`, and reuse the same one if you retry the call, so the post is scheduled once.
9. **Confirm the time back.** The answer has `publishAt` (UTC), `publishAtLocal` and `timeZone`. Call `get_time` again and check its `timeZone` matches the post's (unless the person named another zone); if they differ, say so before anything else. Tell the person the local time from `publishAtLocal` and the zone name, never the UTC time alone: "Scheduled for Tuesday 3 November at 09:00 Australia/Brisbane." If the answer has `warnings` (a time skipped or repeated by a clock change), read them out. If a platform was `skipped`, say which and why.
10. **For a post sent now,** call `get_post` with its id after a few seconds and report each account: published with its URL, or failed with the reason.

## Example

The person says: "Post that our docs site is live to X and LinkedIn tomorrow at 9am."

1. `get_time` answers `timeZone: "Australia/Brisbane"`, `nowLocal: "2026-11-02T16:40"`. Tomorrow is 3 November.
2. `list_profiles` answers one brand, so no `profileId`. `list_accounts` gives `acct_x...` (X) and `acct_li...` (LinkedIn), both active.
3. The draft: X, 80 characters; LinkedIn, 110 characters, both with the link. The person says yes.
4. The call:

   ```json
   {
     "name": "schedule_post",
     "arguments": {
       "content": "Our docs site is live: every guide, the API reference and the MCP tools in one place. https://docs.example.com",
       "accountIds": ["acct_aaaaaaaaaaaaaaaaaaaaaaaa", "acct_bbbbbbbbbbbbbbbbbbbbbbbb"],
       "platformOverrides": {
         "x": { "content": "Our docs are live: guides, API reference and MCP tools. https://docs.example.com" }
       },
       "publishAt": "2026-11-03T09:00",
       "idempotencyKey": "post-docs-live-2026-11-03"
     }
   }
   ```

5. The answer has `publishAtLocal: "2026-11-03T09:00"`, `timeZone: "Australia/Brisbane"`. Say: "Scheduled for Tuesday 3 November at 09:00 Australia/Brisbane, on X and LinkedIn."

Wrong: `"publishAt": "2026-11-02T23:00Z"` (converted by hand) or `"publishAt": "2026-11-03T09:00+10:00"` (an offset added). Both bypass the person's zone.

## When a call is refused

A refused call is an answer: its text says what to do next. The common ones:

| Refusal | What to do |
|---|---|
| `text_too_long` | Shorten that platform's text and show it again. |
| An account needs reconnecting | Offer the `flung:connect` skill, then schedule. |
| `plan_limit_reached` | Give the person the `upgradeUrl` from the answer; schedule nothing else. |
| `validation_failed` on `profileId` | An account is not in that brand: list the brand's accounts again. |

To move or change a scheduled post, use `update_post` with its id and the new local `publishAt`; to stop one, `cancel_post`, only when the person asks.
