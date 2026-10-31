---
name: status
description: Check the Flung workspace in one answer, the posts scheduled next, the posts that failed or partly failed, the accounts that need reconnecting soon or already, and unread comments, with the next step for each. Read-only unless the person then asks to retry or reconnect. Use when the person asks how their social accounts or posts are doing, what is queued or scheduled, what failed, whether anything needs reconnecting, or runs /flung:status.
---

# Check the queue, failures and reconnect warnings

One read of the workspace, put in order of what needs the person first. Nothing changes unless they ask for a fix.

The request is `$ARGUMENTS`: a number of days ahead (default 7), a brand, or a platform. If it is empty, use 7 days and every brand.

## Steps

1. **Read the clock.** Call `get_time`, so every time you show is in the person's own zone (`timeZone`), never UTC.
2. **Review.** Call `review_workspace` with `days`. It answers the accounts that need a person, the posts scheduled in that window, the posts that failed or partly failed, and the unread comment count, each with a next step.
3. **Narrow it, if asked.** For one brand, find its `profileId` with `list_profiles`, then use `find_accounts_needing_attention`, `list_accounts` and `list_posts` with `profileId` instead of the review. For one platform, pass `platform` to `list_posts` and `list_accounts`. For more on one failure, `get_post` with its id gives each account's reason.
4. **Report, most urgent first.** Use these sections, and leave out any that is empty:

   | Section | What to show |
   |---|---|
   | Needs you now | Accounts with `needs_reconnect` or `disconnected`, and the scheduled posts that go to them (they will fail) |
   | Reconnect soon | Accounts with a `reconnectBy` date, soonest first, as a local date ("by Friday 6 November") |
   | Failed | Posts `failed` or `partially_published`: the text's first words, the accounts that failed and the reason |
   | Scheduled | The next posts: local day and time, platforms, the text's first words |
   | Inbox | The unread comment count |

   Accounts with renewal `automatic` renew themselves: do not list them as a warning.
5. **Offer the next step, and wait.** Offer only the fixes that apply, as a question:

   | Finding | Offer |
   |---|---|
   | Accounts to reconnect | The `flung:connect` skill, or `reconnect_accounts_needing_attention` for every link at once |
   | Failed posts whose accounts work again | `retry_failed_posts` (it skips posts whose account still needs a reconnect, so reconnect first) |
   | One failed post | `retry_post` with its id, after its cause is fixed |
   | A scheduled post to move or stop | `update_post` with the new local `publishAt`, or `cancel_post` |
   | Unread comments | `list_inbox` with `status: "unread"`; reply only with text the person approved, using `reply_to_inbox_item` |

   Run none of these until the person says which.

## Example

The person runs `/flung:status`.

1. `get_time`: `timeZone: "Europe/Athens"`.
2. `review_workspace` with `days: 7` answers: the Instagram account `@acme` is `needs_reconnect` and has one post scheduled; LinkedIn has `reconnectBy` on 12 November; one post `partially_published` (X published, Instagram failed: reconnect required); three posts scheduled; 4 unread comments.
3. Report:

   ```text
   Needs you now
   - Instagram @acme needs reconnecting. Thursday's 18:00 post to it will fail until then.

   Reconnect soon
   - LinkedIn Acme Inc, by Thursday 12 November.

   Failed
   - "Our autumn range is here" went out on X; Instagram failed (reconnect required).

   Scheduled (next 7 days, Europe/Athens)
   - Wed 4 Nov 09:00, X and LinkedIn: "Three ways to..."
   - Thu 5 Nov 18:00, Instagram: "Behind the scenes..."
   - Mon 9 Nov 12:00, Bluesky: "Release notes for..."

   Inbox
   - 4 unread comments.
   ```

4. Ask: "Reconnect Instagram now? Once it is back I can retry the failed post."
