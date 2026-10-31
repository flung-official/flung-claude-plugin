# Security policy

How to report a vulnerability in the Flung plugin for Claude Code, and what to expect. It is for anyone who finds a security problem in the plugin this repository holds.

## TL;DR

| Question | Answer |
|---|---|
| Where do I report? | Use "Report a vulnerability" on the Security tab of this repository. That report is private. |
| Is there an email address? | No. The private report above is the only channel, so every report stays private until a fix is out. |
| Which versions get fixes? | The latest commit on `main`. |
| Should I open a public issue? | No. Public issues are for bugs that are not security problems. |
| Is the MCP server or the API in scope? | Report those on [flung-mcp](https://github.com/flung-official/flung-mcp) the same way. |

## What the plugin does

The plugin is configuration, Markdown skills, and one plain Node script with no dependencies. Its MCP config points Claude Code at the hosted server `https://mcp.flung.dev/mcp-oauth`, which signs in with OAuth, so the repository holds no key. Its hook reads the Bash command Claude just ran and, after a `git tag` or `gh release create`, adds a note for Claude; it reads no file, runs no command and sends nothing. A report is most useful when it shows one of the following:

- the hook running a command, reading or writing a file, or making a network request
- a command line that makes the hook block a tool call, hang past its timeout, or exhaust memory
- a skill that leads Claude to schedule or publish a post without the person's yes, to read a secrets file, or to put private data in a post
- a secret, a key, or a path of a build machine inside this repository

## What to include

Give the commit of this repository, your Node and Claude Code versions, the smallest input that shows the problem, and what you expected instead.

## What happens next

The maintainers reply within three working days, confirm the problem, and push a fix to `main`.

Please do not test against accounts that are not yours, or try to reach other people's data.

## See also

| Link | Why |
|---|---|
| `README.md` | What the plugin is and how to install it |
| [Flung documentation](https://docs.flung.dev) | The MCP server, the API and the privacy policy |
