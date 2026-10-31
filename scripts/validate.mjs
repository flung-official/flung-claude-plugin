#!/usr/bin/env node
/**
 * Checks the plugin's own rules that `claude plugin validate` and the JSON schemas do not: one version in every manifest, the
 * MCP server is the hosted OAuth one with no key, every skill has a name matching its folder and a description, the hook command
 * points inside the plugin, and no file has an em dash, an emoji or a console.log. Prints each problem and exits 1 if there is one.
 *
 * Run it from anywhere: `node scripts/validate.mjs`. Plain Node with no dependencies, like the hook.
 */
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = fileURLToPath(new URL('..', import.meta.url))
const MCP_URL = 'https://mcp.flung.dev/mcp-oauth'
const SKIPPED = new Set(['.git', 'node_modules'])
const TEXT = /\.(md|mjs|js|json|ya?ml|txt)$|^LICENSE$/

const problems = []
const problem = (file, message) => problems.push(`${file}: ${message}`)

function readJson(file) {
  try {
    return JSON.parse(readFileSync(join(ROOT, file), 'utf8'))
  } catch (error) {
    problem(file, `not valid JSON (${error.message})`)
    return null
  }
}

function filesUnder(dir) {
  return readdirSync(dir).flatMap((name) => {
    if (SKIPPED.has(name)) return []
    const path = join(dir, name)
    return statSync(path).isDirectory() ? filesUnder(path) : [path]
  })
}

/** The `key: value` lines between the `---` fences at the top of a skill. */
function frontmatter(text) {
  const match = /^---\n([\s\S]*?)\n---\n/.exec(text)
  if (!match) return null
  const fields = {}
  for (const line of match[1].split('\n')) {
    const field = /^([a-z][a-z0-9-]*):\s*(.*)$/.exec(line)
    if (field) fields[field[1]] = field[2].trim()
  }
  return fields
}

const plugin = readJson('.claude-plugin/plugin.json')
const marketplace = readJson('.claude-plugin/marketplace.json')
const releases = readJson('.release-please-manifest.json')
const mcp = readJson('.mcp.json')
const hooks = readJson('hooks/hooks.json')

if (plugin && marketplace && releases) {
  const versions = {
    '.claude-plugin/plugin.json version': plugin.version,
    '.claude-plugin/marketplace.json metadata.version': marketplace.metadata?.version,
    '.release-please-manifest.json "."': releases['.'],
  }
  if (!/^\d+\.\d+\.\d+$/.test(plugin.version ?? '')) problem('.claude-plugin/plugin.json', `version "${plugin.version}" is not x.y.z`)
  if (new Set(Object.values(versions)).size !== 1) {
    problem('versions', `must all match: ${Object.entries(versions).map(([where, v]) => `${where} = ${v}`).join(', ')}`)
  }
  const listed = marketplace.plugins?.find((entry) => entry.name === plugin.name)
  if (!listed) problem('.claude-plugin/marketplace.json', `does not list the plugin "${plugin.name}"`)
  else if (listed.source !== './') problem('.claude-plugin/marketplace.json', `plugin source is "${listed.source}", expected "./"`)
  if (marketplace.name !== 'flung') problem('.claude-plugin/marketplace.json', `name is "${marketplace.name}", expected "flung"`)
}

if (mcp) {
  const server = mcp.mcpServers?.flung
  if (!server) problem('.mcp.json', 'has no "flung" server')
  else {
    if (server.type !== 'http' || server.url !== MCP_URL) problem('.mcp.json', `the flung server must be { "type": "http", "url": "${MCP_URL}" }`)
    if (server.headers || server.env) problem('.mcp.json', 'the flung server signs in with OAuth: no headers, no env, no key')
  }
}

if (hooks) {
  for (const [event, groups] of Object.entries(hooks.hooks ?? {})) {
    for (const group of groups) {
      for (const hook of group.hooks ?? []) {
        if (!String(hook.command ?? '').includes('${CLAUDE_PLUGIN_ROOT}/')) problem('hooks/hooks.json', `${event} command must run a file under \${CLAUDE_PLUGIN_ROOT}`)
        if (!(hook.timeout > 0 && hook.timeout <= 10)) problem('hooks/hooks.json', `${event} needs a timeout of 10 seconds or less`)
      }
    }
  }
}

const skillsDir = join(ROOT, 'skills')
for (const name of readdirSync(skillsDir)) {
  const file = `skills/${name}/SKILL.md`
  let text
  try {
    text = readFileSync(join(ROOT, file), 'utf8')
  } catch {
    problem(file, 'missing')
    continue
  }
  const fields = frontmatter(text)
  if (!fields) {
    problem(file, 'has no frontmatter between --- lines')
    continue
  }
  if (fields.name !== name) problem(file, `name is "${fields.name}", expected "${name}" (the folder)`)
  if (!fields.description) problem(file, 'has no description')
  else if (fields.description.length > 1024) problem(file, `description is ${fields.description.length} characters, at most 1024`)
  if (!/^# /m.test(text)) problem(file, 'has no top heading')
}

const EM_DASH = String.fromCharCode(0x2014)
const SELF = relative(ROOT, fileURLToPath(import.meta.url))
const EMOJI = /[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{2B00}-\u{2BFF}\u{FE0F}]/u
const CONSOLE = new RegExp(['console', 'log'].join('\\.'))
for (const path of filesUnder(ROOT)) {
  const file = relative(ROOT, path)
  if (!TEXT.test(file.split('/').pop())) continue
  const text = readFileSync(path, 'utf8')
  text.split('\n').forEach((line, index) => {
    const at = `${file}:${index + 1}`
    if (line.includes(EM_DASH)) problems.push(`${at}: em dash`)
    if (EMOJI.test(line)) problems.push(`${at}: emoji`)
    if (file !== SELF && CONSOLE.test(line)) problems.push(`${at}: console.log`)
  })
}

if (problems.length) {
  process.stderr.write(`${problems.join('\n')}\n${problems.length} problem${problems.length === 1 ? '' : 's'}.\n`)
  process.exit(1)
}
process.stdout.write('The plugin follows its rules.\n')
