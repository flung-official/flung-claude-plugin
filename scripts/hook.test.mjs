import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { test } from 'node:test'
import { fileURLToPath } from 'node:url'

import { answerFor, releasedTag } from './hook.mjs'

const HOOK = fileURLToPath(new URL('./hook.mjs', import.meta.url))

const bash = (command, toolResponse = {}) => ({
  hook_event_name: 'PostToolUse',
  tool_name: 'Bash',
  tool_input: { command },
  tool_response: toolResponse,
})

test('a command that makes a tag or a release names it', () => {
  const cases = [
    ['git tag v1.2.0', 'v1.2.0'],
    ['git tag -a v1.2.0 -m "Release 1.2.0"', 'v1.2.0'],
    ['git tag -s -m "signed; really" v2.0.0', 'v2.0.0'],
    ['git -C packages/sdk tag sdk-v0.4.0', 'sdk-v0.4.0'],
    ['pnpm test && git tag v0.3.1 && git push --tags', 'v0.3.1'],
    ['gh release create v1.2.0 --generate-notes', 'v1.2.0'],
    ['gh release create --title "Big one" v3.0.0 dist/app.zip', 'v3.0.0'],
    ['GH_REPO=flung-official/flung-sdk gh release create sdk-v0.4.0', 'sdk-v0.4.0'],
  ]
  for (const [command, tag] of cases) assert.equal(releasedTag(command), tag, command)
})

test('listing, checking or deleting tags is not a release', () => {
  const cases = [
    'git tag',
    'git tag -l "v*"',
    'git tag --list',
    'git tag --sort=-v:refname | head -5',
    'git tag -d v1.2.0',
    'git tag --contains HEAD',
    'git tag -v v1.2.0',
    'gh release list',
    'gh release view v1.2.0',
    'echo "git tag v1.0.0"',
    'git log --oneline v1.1.0..HEAD',
    '',
  ]
  for (const command of cases) assert.equal(releasedTag(command), null, command)
})

test('the answer is a note for the agent that never asks it to post', () => {
  const answer = answerFor(bash('git tag v1.2.0'), {})
  assert.equal(answer.hookSpecificOutput.hookEventName, 'PostToolUse')
  assert.match(answer.hookSpecificOutput.additionalContext, /v1\.2\.0/)
  assert.match(answer.hookSpecificOutput.additionalContext, /flung:release-post/)
  assert.match(answer.hookSpecificOutput.additionalContext, /Do not draft, schedule or publish anything unless they say yes/)
  assert.equal(answer.decision, undefined)
})

test('it says nothing for other commands, other tools, failures, or when turned off', () => {
  assert.equal(answerFor(bash('ls -la'), {}), null)
  assert.equal(answerFor({ ...bash('git tag v1.2.0'), tool_name: 'Write' }, {}), null)
  assert.equal(answerFor({ ...bash('git tag v1.2.0'), hook_event_name: 'PreToolUse' }, {}), null)
  assert.equal(answerFor(bash('git tag v1.2.0', { exitCode: 128 }), {}), null)
  assert.equal(answerFor(bash('git tag v1.2.0', { interrupted: true }), {}), null)
  assert.equal(answerFor(bash('git tag v1.2.0'), { FLUNG_HOOKS: 'off' }), null)
  assert.equal(answerFor(null, {}), null)
})

test('run as a hook it prints the note, prints nothing otherwise, and always exits 0', () => {
  const run = (input) => spawnSync(process.execPath, [HOOK], { input, encoding: 'utf8', env: { PATH: process.env.PATH } })

  const tagged = run(JSON.stringify(bash('gh release create v1.2.0')))
  assert.equal(tagged.status, 0)
  assert.match(JSON.parse(tagged.stdout).hookSpecificOutput.additionalContext, /v1\.2\.0/)

  for (const input of [JSON.stringify(bash('pnpm build')), 'not json', '']) {
    const quiet = run(input)
    assert.equal(quiet.status, 0)
    assert.equal(quiet.stdout, '')
    assert.equal(quiet.stderr, '')
  }
})
