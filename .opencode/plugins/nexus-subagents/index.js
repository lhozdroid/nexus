import { createHash } from "node:crypto"
import { access, mkdir, readFile, readdir, writeFile } from "node:fs/promises"
import path from "node:path"
import { tool } from "@opencode-ai/plugin"

const AGENT_SOURCE_REF = "d58d24d59214039e590d90409e46ab758d6f579a"
const AGENT_SOURCE_ROOT = `https://raw.githubusercontent.com/augmnt/agents/${AGENT_SOURCE_REF}`
const DEFAULT_INTERVAL_MINUTES = 30
const MAX_FILES = 2500
const MAX_DEPTH = 6
const MAX_AGENT_BYTES = 256 * 1024

const AGENT_SOURCE_HASHES = Object.freeze({
  "accessibility-auditor": "1bb4684e660441a6940e7c871e199badb99bb59e223b6c11b8c9934d663870f5",
  "api-designer": "fc6713d37cfc806510187f9fde9058ca2db255ad5d21803eed4e2964d8e0c8ee",
  "backend-architect": "044c0b1a78131a8afe94c0ae12f7eb15b10c0fab4e9c60d374ad86919e58ffac",
  "database-engineer": "3857c0a103ce75c01c3dada4c1277f786c45a6b0e70c6dc6b489047a63079842",
  "e2e-test-automator": "88653d98ee5ac02cf155be46d18b99f2c2b6532b6ce17fa7f74d07b106ee7a40",
  "error-detective": "6fd03760f3d61151a6dcc599f922978306939d99cc9e591bcdfdc33a284f5c5d",
  "frontend-specialist": "618e92e690b94ce77c69fe25f17ce2fc095e71407629481812f0535eb60d6c40",
  "git-strategist": "2e7e765e7d35ab4ffb00fc80c34015b8cc06bc4cf01e8c5947026411f637fba3",
  "integration-test-builder": "0331a71c86999720f7bf99f68418b26ebc6cbc5ca040fd878b9cc109916896e0",
  "performance-profiler": "e19df2262fa8762131129225040c4d234951791c1f33f6c4c789d06c4bb0ca11",
  "security-auditor": "babcc8be66958679650e3a2cd42c9b1f8d9a8bcf5ed35d0fc8c513ac838a9857",
  "test-architect": "8016d1a9224f35f1761fd1faeb0fe6a9e06b8496be1a1beed9ce2f46f201a5c8",
})

const IGNORED_DIRS = new Set([
  ".git",
  ".next",
  ".nuxt",
  ".opencode",
  ".swarm",
  "build",
  "coverage",
  "dist",
  "node_modules",
  "target",
  "vendor",
])

const AGENT_CATALOG = {
  "accessibility-auditor": "Audits WCAG compliance, ARIA behavior, keyboard navigation, and screen-reader support.",
  "api-designer": "Designs REST and GraphQL contracts, OpenAPI specifications, and API evolution strategies.",
  "backend-architect": "Designs backend services, APIs, authentication, authorization, and service boundaries.",
  "database-engineer": "Designs schemas, migrations, indexes, queries, and data integrity controls.",
  "e2e-test-automator": "Builds Playwright user-journey, accessibility, and visual regression tests.",
  "error-detective": "Investigates failures, traces root causes, and improves error handling and resilience.",
  "frontend-specialist": "Builds accessible responsive interfaces, component systems, and frontend performance improvements.",
  "git-strategist": "Designs branching, commit, pull request, and release workflows.",
  "integration-test-builder": "Builds API, database, contract, and service integration tests.",
  "performance-profiler": "Profiles frontend and backend bottlenecks, resource usage, and performance regressions.",
  "security-auditor": "Reviews OWASP risks, authentication, authorization, input validation, and data protection.",
  "test-architect": "Defines testing strategy, coverage goals, automation architecture, and quality gates.",
}

const AGENT_RULES = [
  {
    signals: ["react", "next.js", "vue", "svelte", "astro", "frontend application"],
    agents: ["accessibility-auditor", "e2e-test-automator", "frontend-specialist", "performance-profiler"],
  },
  {
    signals: ["javascript/typescript", "javascript", "typescript", "python", "go", "rust", "jvm", "ruby", "php", "server/api code", "express", "fastify", "hono"],
    agents: ["api-designer", "backend-architect", "error-detective", "performance-profiler"],
  },
  {
    signals: ["prisma", "drizzle", "database", "schema", "migration", "server/api code"],
    agents: ["database-engineer"],
  },
  {
    signals: ["automated tests", "playwright", "vitest", "jest"],
    agents: ["integration-test-builder", "test-architect"],
  },
  {
    signals: ["github actions"],
    agents: ["git-strategist"],
  },
]

/** Returns a short stable fingerprint for persisted workspace or agent state. */
const sha256 = (value) => createHash("sha256").update(value).digest("hex")
const hash = (value) => sha256(JSON.stringify(value)).slice(0, 20)

/** Reads JSON state without allowing a corrupt or missing file to disable the plugin. */
async function readJson(file) {
  try {
    return JSON.parse(await readFile(file, "utf8"))
  } catch {
    return undefined
  }
}

/** Checks whether a path exists without throwing for missing files. */
async function exists(file) {
  try {
    await access(file)
    return true
  } catch {
    return false
  }
}

/** Reads a remote response without allowing an unbounded payload into memory. */
async function readBoundedText(response, maxBytes) {
  const contentLength = Number(response.headers?.get?.("content-length"))
  if (Number.isFinite(contentLength) && contentLength > maxBytes) throw new Error("remote response is too large")
  const buffer = await response.arrayBuffer()
  if (buffer.byteLength > maxBytes) throw new Error("remote response is too large")
  return new TextDecoder().decode(buffer)
}

/**
 * Walks the project with conservative depth and file-count limits.
 * Generated output, dependency trees, and OpenCode metadata are excluded so
 * they cannot create noisy technology matches.
 */
async function walk(root) {
  const files = []

  async function visit(directory, depth) {
    if (depth > MAX_DEPTH || files.length >= MAX_FILES) return
    let entries
    try {
      entries = await readdir(directory, { withFileTypes: true })
    } catch {
      return
    }
    for (const entry of entries) {
      if (files.length >= MAX_FILES) return
      if (entry.isDirectory()) {
        if (!IGNORED_DIRS.has(entry.name)) await visit(path.join(directory, entry.name), depth + 1)
      } else if (entry.isFile()) {
        files.push(path.relative(root, path.join(directory, entry.name)))
      }
    }
  }

  await visit(root, 0)
  return files.sort()
}

/** Adds a normalized, non-empty detection signal to a set. */
function addSignal(set, value) {
  if (value) set.add(value.toLowerCase())
}

/**
 * Detects languages, frameworks, dependencies, and repository patterns used
 * to select relevant subagents from the curated subagents.sh catalog.
 */
async function inspectWorkspace(root) {
  const files = await walk(root)
  const technologies = new Set()
  const patterns = new Set()
  const packageJson = await readJson(path.join(root, "package.json"))
  const packageText = packageJson ? JSON.stringify(packageJson) : ""
  const allFiles = files.join("\n").toLowerCase()
  const dependencyNames = Object.keys({
    ...(packageJson?.dependencies ?? {}),
    ...(packageJson?.devDependencies ?? {}),
    ...(packageJson?.peerDependencies ?? {}),
  }).map((name) => name.toLowerCase())

  if (packageJson) addSignal(technologies, "JavaScript/TypeScript")
  if (/\.(ts|tsx)$/.test(allFiles)) addSignal(technologies, "TypeScript")
  if (/\.(js|jsx|mjs|cjs)$/.test(allFiles)) addSignal(technologies, "JavaScript")
  if (/\.(py|pyi)$/.test(allFiles)) addSignal(technologies, "Python")
  if (/\.(go)$/.test(allFiles)) addSignal(technologies, "Go")
  if (/\.(rs)$/.test(allFiles)) addSignal(technologies, "Rust")
  if (/\.(java|kt)$/.test(allFiles)) addSignal(technologies, "JVM")
  if (/\.(rb)$/.test(allFiles)) addSignal(technologies, "Ruby")
  if (/\.(php)$/.test(allFiles)) addSignal(technologies, "PHP")
  if (/\.github\/workflows\//.test(allFiles)) addSignal(technologies, "GitHub Actions")
  if (/(^|\/)test(s|ing)?[\/.]|\.(spec|test)\./.test(allFiles)) addSignal(patterns, "automated tests")
  if (/(^|\/)(api|routes|controllers|server)\//.test(allFiles)) addSignal(patterns, "server/API code")
  if (/(^|\/)(components|pages|app)\//.test(allFiles)) addSignal(patterns, "frontend application")
  if (/(^|\/)(schema|schemas|migration|migrations)\//.test(allFiles)) addSignal(patterns, "schema")

  const dependencySignals = [
    ["React", ["react", "react-dom"]],
    ["Next.js", ["next"]],
    ["Vue", ["vue", "@vue/"]],
    ["Svelte", ["svelte", "@sveltejs/"]],
    ["Astro", ["astro"]],
    ["Prisma", ["prisma", "@prisma/client"]],
    ["Drizzle", ["drizzle-orm", "drizzle-kit"]],
    ["Playwright", ["playwright", "@playwright/"]],
    ["Vitest", ["vitest"]],
    ["Jest", ["jest"]],
    ["Express", ["express"]],
    ["Fastify", ["fastify"]],
    ["Hono", ["hono"]],
  ]
  for (const [technology, signals] of dependencySignals) {
    if (signals.some((signal) => dependencyNames.some((name) => name === signal || name.startsWith(signal)))) {
      addSignal(technologies, technology)
    }
  }

  const manifestNames = [
    ["pyproject.toml", "Python"],
    ["requirements.txt", "Python"],
    ["go.mod", "Go"],
    ["cargo.toml", "Rust"],
    ["gemfile", "Ruby"],
    ["composer.json", "PHP"],
    ["pom.xml", "JVM"],
  ]
  for (const [name, technology] of manifestNames) {
    if (files.some((file) => file.toLowerCase() === name)) addSignal(technologies, technology)
  }

  const signals = new Set([...technologies, ...patterns])
  const signature = hash({ technologies: [...technologies].sort(), patterns: [...patterns].sort(), packageText })
  return {
    files,
    technologies: [...technologies].sort(),
    patterns: [...patterns].sort(),
    signals,
    signature,
  }
}

/** Extracts an agent description from source frontmatter. */
function parseDescription(contents) {
  const frontmatter = contents.match(/^---\s*\n([\s\S]*?)\n---/)
  const value = frontmatter?.[1]?.match(/^description:\s*(.*)$/m)?.[1]?.trim()
  if (!value) return ""
  try {
    return JSON.parse(value)
  } catch {
    return value.replace(/^['"]|['"]$/g, "")
  }
}

/**
 * Converts Claude-oriented source markdown into an OpenCode subagent file.
 * Only OpenCode-supported frontmatter is retained; the source instructions
 * remain unchanged in the body.
 */
function normalizeAgentContent(contents, name) {
  const description = parseDescription(contents) || AGENT_CATALOG[name] || `Specialized ${name} development agent.`
  const frontmatter = contents.match(/^---\s*\n[\s\S]*?\n---\s*/)
  const body = frontmatter ? contents.slice(frontmatter[0].length) : contents
  return `---\nname: ${name}\ndescription: ${JSON.stringify(description)}\nmode: subagent\n---\n\n${body.trimStart()}`
}

/** Reads project-local OpenCode agents and computes their fingerprints. */
async function inspectAgents(root) {
  const agentsRoot = path.join(root, ".opencode", "agents")
  const entries = await readdir(agentsRoot, { withFileTypes: true }).catch(() => [])
  const agents = []
  for (const entry of entries) {
    if (!entry.isFile() || !entry.name.endsWith(".md")) continue
    const file = path.join(agentsRoot, entry.name)
    const contents = await readFile(file, "utf8").catch(() => "")
    if (!contents) continue
    agents.push({
      name: entry.name.replace(/\.md$/, ""),
      description: parseDescription(contents),
      fingerprint: hash(contents),
      file: path.relative(root, file),
    })
  }
  return agents.sort((left, right) => left.name.localeCompare(right.name))
}

/** Maps workspace signals to unique catalog agents in stable order. */
function recommendAgents(workspace) {
  const names = new Set()
  for (const rule of AGENT_RULES) {
    if (rule.signals.some((signal) => workspace.signals.has(signal.toLowerCase()))) {
      for (const name of rule.agents) names.add(name)
    }
  }
  return [...names].sort().map((name) => ({
    name,
    description: AGENT_CATALOG[name],
    source: `augmnt/agents/${name}`,
    sourceUrl: `${AGENT_SOURCE_ROOT}/${name}.md`,
  }))
}

/** Builds the report shown to the assistant and user. */
function reportText(workspace, installed, candidates, managed, results = []) {
  const installedNames = new Set(installed.map((agent) => agent.name))
  const additions = candidates.filter((candidate) => !installedNames.has(candidate.name))
  const present = candidates.filter((candidate) => installedNames.has(candidate.name)).map((candidate) => candidate.name)
  const lines = ["Nexus Subagents report", "", `Detected technologies: ${workspace.technologies.join(", ") || "none yet"}`]
  if (workspace.patterns.length) lines.push(`Detected patterns: ${workspace.patterns.join(", ")}`)
  lines.push(`Configured local agents: ${installed.map((agent) => agent.name).join(", ") || "none"}`)
  if (present.length) lines.push(`Relevant agents already present: ${present.join(", ")}`)
  if (additions.length) {
    lines.push("", "Relevant agents available from subagents.sh:")
    for (const candidate of additions) lines.push(`- ${candidate.name}: ${candidate.description}`)
    lines.push("  Run the nexus_subagents tool with action=install to download them.")
  }
  if (managed.length) lines.push("", `Managed by Nexus Subagents: ${managed.join(", ")}`)
  if (results.length) lines.push("", `Install results: ${results.join(", ")}`)
  return lines.join("\n")
}

/**
 * OpenCode plugin entry point for technology-aware subagent discovery.
 *
 * @param {{directory?: string, worktree?: string}} context Plugin workspace context.
 * @returns {Promise<object>} OpenCode hooks and tools.
 */
export const NexusSubagents = async ({ directory, worktree }) => {
  const root = directory || worktree || process.cwd()
  const stateFile = path.join(root, ".opencode", ".nexus-subagents.json")
  const intervalMinutes = Number(process.env.NEXUS_SUBAGENTS_INTERVAL_MINUTES) || DEFAULT_INTERVAL_MINUTES
  let state = (await readJson(stateFile)) || { version: 1, initialized: false, recommended: [], managed: {} }
  let latestReport = ""
  let pendingReport = ""
  let scanPromise

  /** Persists plugin state while keeping read-only workspaces functional. */
  async function save(nextState) {
    state = nextState
    try {
      await mkdir(path.dirname(stateFile), { recursive: true })
      await writeFile(stateFile, `${JSON.stringify(state, null, 2)}\n`, "utf8")
    } catch {
      // A read-only workspace should not disable the plugin.
    }
  }

  /** Coalesces overlapping startup, chat, and timer scans. */
  async function scan(force = false) {
    if (scanPromise) return scanPromise
    scanPromise = (async () => {
      const workspace = await inspectWorkspace(root)
      const installed = await inspectAgents(root)
      const candidates = recommendAgents(workspace)
      const previousRecommendations = new Set(state.recommended || [])
      const unseen = candidates.filter((candidate) => !previousRecommendations.has(candidate.name))
      const changedWorkspace = state.workspaceSignature !== workspace.signature
      const shouldReport = force || !state.initialized || changedWorkspace
      const nextState = {
        version: 1,
        initialized: true,
        workspaceSignature: workspace.signature,
        technologies: workspace.technologies,
        patterns: workspace.patterns,
        recommended: [...new Set([...(state.recommended || []), ...candidates.map((candidate) => candidate.name)])].slice(-100),
        managed: state.managed || {},
        lastScanAt: new Date().toISOString(),
      }
      await save(nextState)
      // Only changed or newly discovered recommendations create a pending
      // report; routine interval scans stay silent.
      if (shouldReport && (unseen.length || changedWorkspace || !state.initialized)) {
        latestReport = reportText(workspace, installed, candidates, Object.keys(nextState.managed))
        pendingReport = latestReport
      }
      return { workspace, installed, candidates, report: latestReport }
    })().finally(() => {
      scanPromise = undefined
    })
    return scanPromise
  }

  /**
   * Downloads relevant agents explicitly requested by the user.
   * Existing files without plugin ownership are preserved, while managed
   * files may be refreshed from their recorded source.
   */
  async function installCandidates(result) {
    const agentsRoot = path.join(root, ".opencode", "agents")
    await mkdir(agentsRoot, { recursive: true })
    const installedNames = new Set(result.installed.map((agent) => agent.name))
    const managed = { ...(state.managed || {}) }
    const results = []

    for (const candidate of result.candidates) {
      const destination = path.join(agentsRoot, `${candidate.name}.md`)
      const alreadyManaged = Boolean(managed[candidate.name])
      if (installedNames.has(candidate.name) && !alreadyManaged) {
        results.push(`${candidate.name}: preserved existing file`)
        continue
      }
      const controller = new AbortController()
      // Bound remote fetches so an unavailable catalog cannot block startup
      // or leave the installation loop hanging indefinitely.
      const timeout = setTimeout(() => controller.abort(), 10000)
      try {
        const response = await fetch(candidate.sourceUrl, { signal: controller.signal, headers: { accept: "text/plain" } })
        if (!response.ok) {
          results.push(`${candidate.name}: source unavailable (${response.status})`)
          continue
        }
        const sourceContents = await readBoundedText(response, MAX_AGENT_BYTES)
        if (sha256(sourceContents) !== AGENT_SOURCE_HASHES[candidate.name]) {
          results.push(`${candidate.name}: integrity check failed`)
          continue
        }
        const normalized = normalizeAgentContent(sourceContents, candidate.name)
        await writeFile(destination, normalized, "utf8")
        managed[candidate.name] = {
          source: candidate.source,
          sourceUrl: candidate.sourceUrl,
          fingerprint: hash(normalized),
          installedAt: new Date().toISOString(),
        }
        results.push(`${candidate.name}: installed`)
      } catch {
        results.push(`${candidate.name}: download failed`)
      } finally {
        clearTimeout(timeout)
      }
    }

    await save({ ...state, managed, lastInstallAt: new Date().toISOString() })
    return results
  }

  const timer = setInterval(() => void scan(), Math.max(1, intervalMinutes) * 60 * 1000)
  timer.unref?.()
  setTimeout(() => void scan()).unref?.()

  return {
    dispose: async () => clearInterval(timer),
    event: async ({ event }) => {
      if (event.type === "session.created") {
        const session = event.properties.info
        if (!session.parentID && path.resolve(session.directory) === path.resolve(root)) void scan(true)
      }
    },
    "experimental.chat.system.transform": async (_input, output) => {
      if (pendingReport) {
        // The report is injected into the next system turn rather than
        // interrupting the current user interaction with a tool call.
        output.system.push(`You have a Nexus Subagents report. Surface it to the user clearly. Download agents only when explicitly requested with the nexus_subagents tool using action=install. Never overwrite an existing agent unless Nexus Subagents previously recorded ownership of that file.\n\n${pendingReport}`)
        pendingReport = ""
      }
    },
    "chat.message": async () => {
      void scan()
    },
    tool: {
      nexus_subagents: tool({
        description: "Scan the workspace for relevant software-development subagents, report recommendations, or explicitly install them into .opencode/agents.",
        args: {
          action: tool.schema.enum(["scan", "report", "install"]).default("scan"),
        },
        async execute({ action }) {
          if (action === "report") return latestReport || "Nexus Subagents has no new report."
          const result = await scan(true)
          if (action === "install") {
            const results = await installCandidates(result)
            const installed = await inspectAgents(root)
            latestReport = reportText(result.workspace, installed, result.candidates, Object.keys(state.managed || {}), results)
            return latestReport
          }
          return result.report || "Nexus Subagents found no new recommendations."
        },
      }),
    },
  }
}
