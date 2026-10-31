---
name: connect
description: Connect or reconnect social media accounts in Flung, and set up brands to keep each customer's or product's accounts apart (one account per platform per brand). Gives the person the platform's own consent link, waits for them to approve, and confirms the account is active. Use when the person asks to connect, add, link, set up, reconnect or fix a social account (X, LinkedIn, a LinkedIn company page, a Facebook page, Instagram, Bluesky, Mastodon and the rest), to add a brand, or runs /flung:connect with a platform or brand.
---

# Connect and reconnect accounts

Connecting always needs the person: Flung returns the platform's consent page, and only they can approve it. You start the connect, hand over the link, wait, and confirm. You never sign in for them and never ask for a password.

The request is `$ARGUMENTS`. If that is empty, ask which platforms, or call `find_accounts_needing_attention` and offer to fix what it finds.

## Rules

- **One account per platform per brand.** A brand (a profile in the API) holds at most one X, one LinkedIn, one Bluesky, and so on. A second account of the same platform needs its own brand. Facebook pages and LinkedIn company pages are one account per page.
- **Reconnect, do not connect again.** An account already in `list_accounts` that stopped working gets `reconnect_account`, which keeps its id and its scheduled posts. The person must sign in as the same platform user, or it fails with `wrong_account`.
- **A link lasts ten minutes.** Do not start a second session for the same account while one is pending; if it expires, start a new one.
- **Disconnect only when asked.** `disconnect_account` needs `confirm: true` and the person's explicit request for that account. To fix a broken account, reconnect it instead.

## Steps

1. **Pick the brand.** Call `list_profiles`. If the person named a brand or customer, find it by name or `externalId`; if there are several and none was named, ask. To add one, check `list_profiles` with the `externalId` first, then `create_profile` with a `name` (and the person's own `externalId` for it, if they have one). Without any brand, accounts join the workspace itself, which is its first brand.
2. **See what is there.** Call `list_accounts` with the `profileId`. For each platform asked for:

   | `list_accounts` shows | Do |
   |---|---|
   | No account of that platform in the brand | Connect it (step 3) |
   | `needs_reconnect` or `disconnected`, or a `reconnectBy` date soon | Reconnect it (step 4) |
   | `active` | Already connected: say so with its username |
   | `active`, but the person wants a different account of the same platform | It needs another brand, or the old one disconnected first: ask which |

3. **Connect.** Call `list_platforms` once and check `connectable` for each. For several platforms, call `connect_platforms` with `platforms` and `profileId`; for one, `connect_account` with `platform` and `profileId`. For LinkedIn company pages, pass `variant: "pages"` (if `list_platforms` lists it). Mastodon needs the person's own server, which these tools cannot pass: if the connect is refused for it, send the person to the Flung portal at https://app.flung.dev to connect Mastodon there.
4. **Reconnect.** For one account, `reconnect_account` with its `accountId`. For everything that needs it, `reconnect_accounts_needing_attention` (it returns one link per account).
5. **Hand over every link.** Give each `authorizationUrl` on its own line, named by platform and account, and say: open it, approve, then come back. Remind them it expires in ten minutes and, for a reconnect, to sign in as the same user.
6. **Wait for the result.** Call `get_connect_session` with each `sessionId` every few seconds until it is not `pending`, for up to the ten minutes. If the person says they are done, check at once.

   | Status | Say |
   |---|---|
   | `connected` | Connected, with the new `accountIds`. Call `get_account` on each and report its username and status. |
   | `failed` | The platform's reason, in plain words, and offer to try again. |
   | `expired` | The link ran out; offer a new one. |

7. **Close.** List what is now active per brand, and anything still waiting.

## Example

The person says: "Connect our LinkedIn company page and Bluesky for the Acme brand."

1. `list_profiles` finds `prof_acme...` named Acme.
2. `list_accounts` with that `profileId` has no LinkedIn and no Bluesky account.
3. `list_platforms` shows both `connectable`, and `variants: ["pages"]` on LinkedIn. Two calls:

   ```json
   { "name": "connect_account", "arguments": { "platform": "linkedin", "variant": "pages", "profileId": "prof_acmeacmeacmeacme" } }
   ```

   ```json
   { "name": "connect_account", "arguments": { "platform": "bluesky", "profileId": "prof_acmeacmeacmeacme" } }
   ```

4. Give both links. Poll `get_connect_session` for `cs_...` of each. LinkedIn answers `connected` with two `accountIds` (two pages); Bluesky answers `connected` with one.
5. Say: "Acme now has LinkedIn (Acme Inc, Acme Labs) and Bluesky (@acme.bsky.social), all active."

## When a call is refused

| Refusal | What to do |
|---|---|
| `platform_limit_reached` | The brand already has an account on that platform. Offer another brand, or reconnecting the one it has. |
| `plan_limit_reached` | The plan's account or brand limit is reached: give the person the `upgradeUrl`. `get_billing` shows the limits. |
| `wrong_account` | The person signed in as a different platform user than the account. Ask them to sign in as that user, or connect the other one in a separate brand. |
