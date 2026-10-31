# Changelog

Every release of the Flung plugin for Claude Code. From 0.1.0 on, `release-please` writes each section from the Conventional Commits on `main`.

## 0.1.0 (2026-10-31)

### Added

- The hosted Flung MCP server, `https://mcp.flung.dev/mcp-oauth`, signed in with OAuth.
- `post` skill: draft per-platform copy and schedule it at the local time the person said, confirmed with `get_time`.
- `connect` skill: connect and reconnect accounts and set up brands, one account per platform per brand.
- `release-post` skill: turn a tag, a GitHub release or a changelog section of the repository into posts, and ask before scheduling.
- `status` skill: the queue, failed posts, reconnect warnings and unread comments, with the next step for each.
- A hook that suggests `release-post` after `git tag` or `gh release create`, and is silent otherwise.
