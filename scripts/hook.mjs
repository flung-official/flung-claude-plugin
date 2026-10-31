#!/usr/bin/env node
/**
 * The plugin's one hook. Claude Code runs it after every Bash command, with the event as JSON on standard input.
 *
 * When the command made a release (`git tag <name>` or `gh release create <tag>`), it adds a note for the agent: offer the
 * `flung:release-post` skill, and post nothing unless the person asks. Every other command gets no answer at all, so the hook is
 * silent in normal work. It never calls Flung, reads no file, and sends nothing anywhere.
 *
 * Anything unexpected (no input, input that is not JSON, a command it cannot read) ends quietly with exit 0: a hook that only
 * suggests must never block. `FLUNG_HOOKS=off` turns it off.
 */
import { realpathSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

/** The longest standard input read; a Bash event is far smaller. */
const MAX_INPUT = 1_000_000

/** `git tag` options that list, check or delete tags instead of making one. */
const GIT_TAG_NOT_CREATING = new Set([
  '-l', '--list', '-d', '--delete', '-v', '--verify', '-n', '--contains', '--no-contains', '--points-at', '--merged',
  '--no-merged', '--sort', '--format', '--column', '--no-column', '-i', '--ignore-case', '--help', '-h',
])

/** `git tag` options that take the next word as their value. */
const GIT_TAG_WITH_VALUE = new Set(['-m', '--message', '-F', '--file', '-u', '--local-user', '--cleanup', '--trailer'])

/** `gh release create` options that take the next word as their value. */
const GH_RELEASE_WITH_VALUE = new Set([
  '-t', '--title', '-n', '--notes', '-F', '--notes-file', '--target', '--discussion-category', '--notes-start-tag',
  '--notes-from-tag', '-R', '--repo',
])

/**
 * Splits a shell line into simple commands at `&&`, `||`, `;`, `|` and new lines, and each into words, keeping quoted text
 * together. It is not a shell: it only has to find a `git tag` or `gh release create` at the start of one command.
 */
export function commandsOf(line) {
  const commands = []
  let words = []
  let word = ''
  let quote = ''
  let inWord = false
  const endWord = () => {
    if (inWord) words.push(word)
    word = ''
    inWord = false
  }
  const endCommand = () => {
    endWord()
    if (words.length) commands.push(words)
    words = []
  }
  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i]
    if (quote) {
      if (ch === quote) quote = ''
      else if (ch === '\\' && quote === '"' && i + 1 < line.length) word += line[(i += 1)]
      else word += ch
      continue
    }
    if (ch === '"' || ch === "'") {
      quote = ch
      inWord = true
    } else if (ch === '\\' && i + 1 < line.length) {
      word += line[(i += 1)]
      inWord = true
    } else if (ch === ' ' || ch === '\t') {
      endWord()
    } else if (ch === '\n' || ch === ';' || ch === '|' || ch === '&') {
      endCommand()
    } else {
      word += ch
      inWord = true
    }
  }
  endCommand()
  return commands
}

/** The first word that is not an option, skipping the value of each option in `withValue`. */
function firstPositional(args, withValue) {
  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i]
    if (arg === '--') return args[i + 1] ?? null
    if (arg.startsWith('-')) {
      if (withValue.has(arg)) i += 1
      continue
    }
    return arg
  }
  return null
}

/** Drops `env` assignments and the global options of git (`-C <dir>`, `-c <key=value>`) and gh (`-R <repo>`) before the subcommand. */
function withoutPrefix(words) {
  let i = 0
  while (i < words.length && /^[A-Za-z_][A-Za-z0-9_]*=/.test(words[i])) i += 1
  const tool = words[i]
  const rest = words.slice(i + 1)
  if (tool === 'git') {
    while (rest.length && (rest[0] === '-C' || rest[0] === '-c')) rest.splice(0, 2)
  }
  return { tool, rest }
}

/** The tag a command released, or null. `git tag <name>` and `gh release create <tag>` count; listing or deleting tags does not. */
export function releasedTag(command) {
  if (typeof command !== 'string' || !command) return null
  for (const words of commandsOf(command)) {
    const { tool, rest } = withoutPrefix(words)
    if (tool === 'git' && rest[0] === 'tag') {
      const args = rest.slice(1)
      if (args.some((arg) => GIT_TAG_NOT_CREATING.has(arg.split('=')[0]))) continue
      const tag = firstPositional(args, GIT_TAG_WITH_VALUE)
      if (tag) return tag
    }
    if (tool === 'gh' && rest[0] === 'release' && rest[1] === 'create') {
      const tag = firstPositional(rest.slice(2), GH_RELEASE_WITH_VALUE)
      if (tag) return tag
    }
  }
  return null
}

/** Whether the Bash result says the command failed, where the result says so at all. */
function failed(response) {
  if (!response || typeof response !== 'object') return false
  if (response.interrupted === true) return true
  for (const key of ['exitCode', 'exit_code', 'returnCode', 'code']) {
    if (typeof response[key] === 'number' && response[key] !== 0) return true
  }
  return false
}

/** The hook's answer for one event: a note for the agent after a release, otherwise null (say nothing). */
export function answerFor(event, env = process.env) {
  if (String(env.FLUNG_HOOKS ?? '').toLowerCase() === 'off') return null
  if (!event || event.hook_event_name !== 'PostToolUse' || event.tool_name !== 'Bash') return null
  if (failed(event.tool_response)) return null
  const tag = releasedTag(event.tool_input?.command)
  if (!tag) return null
  return {
    hookSpecificOutput: {
      hookEventName: 'PostToolUse',
      additionalContext: [
        `Flung: the command just made the release ${tag}.`,
        'Once the release work is done, offer the person one short line: the flung:release-post skill can draft a post per platform from this release for them to review.',
        'Do not draft, schedule or publish anything unless they say yes.',
      ].join(' '),
    },
  }
}

async function readInput() {
  let text = ''
  for await (const chunk of process.stdin) {
    text += chunk
    if (text.length > MAX_INPUT) return ''
  }
  return text
}

async function main() {
  try {
    const text = await readInput()
    const answer = answerFor(text ? JSON.parse(text) : null)
    if (answer) process.stdout.write(`${JSON.stringify(answer)}\n`)
  } catch {
    // A suggestion that cannot be made is not worth a message.
  }
  process.exit(0)
}

const invoked = process.argv[1] && realpathSync(process.argv[1]) === realpathSync(fileURLToPath(import.meta.url))
if (invoked) main()
