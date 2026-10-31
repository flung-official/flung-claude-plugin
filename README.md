<p align="center">
  <a href="https://flung.dev">
    <picture>
      <source media="(prefers-color-scheme: dark)" srcset="https://assets.flung.dev/brand/logo/flung-lockup-on-dark.svg">
      <img alt="Flung" src="https://assets.flung.dev/brand/logo/flung-lockup-on-light.svg" width="260">
    </picture>
  </a>
</p>

# Flung for Claude Code

The Flung plugin for Claude Code. It connects Claude to the hosted Flung MCP server, signed in with your browser, and adds skills that draft and schedule social posts in your own time zone, connect and reconnect accounts for each brand, turn a release of the repository you are in into posts, and check the queue. A quiet hook suggests a release post after you tag. It is for anyone who posts to social media about what they build.

## TL;DR

| Question | Answer |
|---|---|
| How do I install it? | `/plugin marketplace add flung-official/flung-claude-plugin`, then `/plugin install flung@flung`, inside Claude Code. |
| What does it need? | A Flung account (the free plan works) and Node 18 or newer for the hook. No API key. |
| How does it sign in? | With OAuth: your browser opens Flung's sign-in, and you approve the workspace Claude may use. |
| Does it post by itself? | No. Every skill shows the draft and asks before it schedules anything, and connecting an account always needs you to approve on the platform. |
| Where is the guide? | [docs.flung.dev/mcp](https://docs.flung.dev/mcp) |

## Install

Inside Claude Code, add the marketplace and install the plugin from it:

```text
/plugin marketplace add flung-official/flung-claude-plugin
/plugin install flung@flung
```

Restart Claude Code when it asks. If you added the server before with `claude mcp add flung`, remove that one with `claude mcp remove flung` so Claude sees one set of tools.

## Sign in

1. Run `/mcp`, pick `flung`, and choose **Authenticate**.
2. Your browser opens Flung's sign-in. Enter your email and open the link Flung sends you; there is no password.
3. Pick the workspace Claude may use and approve it. Claude Code carries on.

The plugin holds no key and stores nothing; Claude Code keeps the sign-in. To take Claude's access away, open [Connected apps](https://api.flung.dev/oauth/apps) and choose **Disconnect** beside it.

## Skills

Claude picks a skill from what you ask, or you can run one by name.

| Skill | Ask | What it does |
|---|---|---|
| `/flung:post` | "Post that the docs are live to X and LinkedIn tomorrow at 9am." | Drafts one version per platform within its limit, shows it, and schedules on your yes. The time goes to Flung exactly as you said it, and the answer is confirmed in your own time zone with `get_time`. |
| `/flung:connect` | "Connect our LinkedIn company page for the Acme brand." | Starts the connect or reconnect, gives you the platform's consent link, waits for you to approve, and confirms the account is active. One account per platform per brand. |
| `/flung:release-post` | "Announce v1.4.0." | Reads the release from `CHANGELOG.md`, `gh release view` or `git log` since the last tag, drafts a post per platform within its character limit, and asks before scheduling. |
| `/flung:status` | "What is scheduled, and did anything fail?" | The next posts, failed and partly published posts, accounts that need reconnecting now or soon, and unread comments, with the next step for each. Changes nothing unless you ask. |

## The hook

After a Bash command that makes a release (`git tag <name>` or `gh release create <tag>`), the hook reminds Claude that `/flung:release-post` can draft posts for it, and to post nothing unless you say yes. After every other command it says nothing. It reads only the command Claude ran, calls nothing and sends nothing.

| Variable | Effect |
|---|---|
| `FLUNG_HOOKS=off` | Turns the hook off. The skills work the same. |

## Privacy

| Question | Answer |
|---|---|
| What does the plugin send? | Nothing by itself. Claude calls the Flung MCP server at `mcp.flung.dev` when a skill or your request needs it, and sends what that call needs: post text, media links, account and brand ids. |
| What does the release skill read? | The changelog, release notes and commit subjects of the repository you are in, with read-only `git` and `gh` commands. It never reads `.env` or other secrets files, and posts only text you approved. |
| Who handles the data? | Flung, under its [privacy policy](https://docs.flung.dev/privacy). Nothing is sold, used for advertising, or used to train AI models. |

## Contents

| Path | Purpose |
|---|---|
| `.claude-plugin/plugin.json` | The plugin's name, version, description and icon. |
| `.claude-plugin/marketplace.json` | A marketplace of one plugin, so `/plugin marketplace add` works on this repository. |
| `.mcp.json` | The hosted Flung MCP server, `https://mcp.flung.dev/mcp-oauth`, over HTTP with OAuth. |
| `hooks/hooks.json` | Runs `scripts/hook.mjs` after each Bash command. |
| `scripts/` | The hook, its tests, and `validate.mjs`, the checks CI runs. Plain Node with no dependencies. |
| `skills/` | `post`, `connect`, `release-post` and `status`. |

## Support

| Need | Where |
|---|---|
| A bug or an idea for the plugin | An issue on this repository |
| A security problem | `SECURITY.md`: report it privately, never in an issue |
| How the tools work | [MCP tools](https://docs.flung.dev/mcp/tools) and [Prompts and recipes](https://docs.flung.dev/agents/prompts) |

## Contributing

Commits follow [Conventional Commits](https://www.conventionalcommits.org): `feat(post): ...`, `fix(hook): ...`, `docs: ...`. Releases are made from them by `release-please`, which moves the version in both manifests, writes `CHANGELOG.md` and tags `v<version>`. Before a pull request, run `node scripts/validate.mjs`, `node --test scripts/*.test.mjs` and `claude plugin validate --strict .`.

## See also

| Link | Why |
|---|---|
| [Connect an AI agent](https://docs.flung.dev/mcp) | The MCP server in other clients, and with an API key |
| [Time zones](https://docs.flung.dev/time-zones) | How Flung reads a local time |
| [flung-mcp](https://github.com/flung-official/flung-mcp) | Every tool the server has |
| `SECURITY.md` | How to report a vulnerability |
| `LICENSE` | MIT |
