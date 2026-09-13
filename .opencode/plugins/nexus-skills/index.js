import { createHash } from "node:crypto"
import { access, mkdir, open, readFile, readdir, rename, writeFile } from "node:fs/promises"
import path from "node:path"
import { tool } from "@opencode-ai/plugin"

const SKILLS_API = "https://skills.sh/api/search"
const MAX_FILES = 2500
const MAX_DEPTH = 6
const MAX_MANIFEST_BYTES = 128 * 1024
const DEFAULT_INTERVAL_MINUTES = 30
const OPENCODE_SKILL_FIELDS = new Set(["name", "description", "license", "compatibility", "metadata"])
const IGNORED_DIRS = new Set([
  ".git",
  ".next",
  ".nuxt",
  ".swarm",
  "build",
  "coverage",
  "dist",
  "node_modules",
  "target",
  "vendor",
])

/** Returns a short stable fingerprint for persisted workspace state. */
const hash = (value) => createHash("sha256").update(JSON.stringify(value)).digest("hex").slice(0, 20)

/** Reads JSON state without allowing a corrupt or missing file to disable the plugin. */
async function readJson(file) {
  try {
    return JSON.parse(await readFile(file, "utf8"))
  } catch {
    return undefined
  }
}

/** Reads a bounded text prefix for metadata inspection. */
async function readSmallText(file) {
  let handle
  try {
    handle = await open(file, "r")
    const buffer = Buffer.alloc(MAX_MANIFEST_BYTES)
    const { bytesRead } = await handle.read(buffer, 0, buffer.length, 0)
    return buffer.toString("utf8", 0, bytesRead)
  } catch {
    return ""
  } finally {
    await handle?.close().catch(() => {})
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

/**
 * Walks a workspace with depth and file-count limits.
 * Ignored directories prevent dependencies and generated output from causing
 * slow scans or false technology signals.
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

/** Adds a non-empty technology signal to a detection set. */
function addTechnology(set, value) {
  if (value) set.add(value)
}

/**
 * Detects languages, frameworks, dependencies, and repository patterns that
 * are useful search terms for skills.sh recommendations.
 */
async function inspectWorkspace(root) {
  const files = await walk(root)
  const technologies = new Set()
  const patterns = new Set()
  const packageFile = path.join(root, "package.json")
  const packageJson = await readJson(packageFile)
  const packageText = packageJson ? JSON.stringify(packageJson) : ""
  const allFiles = files.join("\n").toLowerCase()

  if (packageJson) addTechnology(technologies, "JavaScript/TypeScript")
  if (/\.(ts|tsx)$/.test(allFiles)) addTechnology(technologies, "TypeScript")
  if (/\.(js|jsx|mjs|cjs)$/.test(allFiles)) addTechnology(technologies, "JavaScript")
  if (/\.(py|pyi)$/.test(allFiles)) addTechnology(technologies, "Python")
  if (/\.(go)$/.test(allFiles)) addTechnology(technologies, "Go")
  if (/\.(rs)$/.test(allFiles)) addTechnology(technologies, "Rust")
  if (/\.(java|kt)$/.test(allFiles)) addTechnology(technologies, "JVM")
  if (/\.(rb)$/.test(allFiles)) addTechnology(technologies, "Ruby")
  if (/\.(php)$/.test(allFiles)) addTechnology(technologies, "PHP")
  if (/dockerfile|docker-compose|compose\.ya?ml/.test(allFiles)) addTechnology(technologies, "Docker")
  if (/\.github\/workflows\//.test(allFiles)) addTechnology(technologies, "GitHub Actions")
  if (/(^|\/)test(s|ing)?[\/.]|\.(spec|test)\./.test(allFiles)) patterns.add("automated tests")
  if (/(^|\/)(packages|apps)\//.test(allFiles)) patterns.add("monorepo layout")
  if (/(^|\/)(api|routes|controllers|server)\//.test(allFiles)) patterns.add("server/API code")
  if (/(^|\/)(components|pages|app)\//.test(allFiles)) patterns.add("frontend application")

  const dependencyNames = Object.keys({
    ...(packageJson?.dependencies ?? {}),
    ...(packageJson?.devDependencies ?? {}),
    ...(packageJson?.peerDependencies ?? {}),
  }).map((name) => name.toLowerCase())
  const dependencySignals = [
    ["React", ["react", "react-dom"]],
    ["Next.js", ["next"]],
    ["Vue", ["vue", "@vue/"]],
    ["Svelte", ["svelte", "@sveltejs/"]],
    ["Astro", ["astro"]],
    ["Vite", ["vite"]],
    ["Tailwind CSS", ["tailwindcss"]],
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
      addTechnology(technologies, technology)
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
    if (files.some((file) => file.toLowerCase() === name)) addTechnology(technologies, technology)
  }

  const signature = hash({ technologies: [...technologies].sort(), patterns: [...patterns].sort(), packageText })
  return {
    files,
    technologies: [...technologies].sort(),
    patterns: [...patterns].sort(),
    signature,
  }
}

/** Extracts the small subset of skill frontmatter needed by the plugin. */
function parseSkill(file, contents) {
  const frontmatter = contents.match(/^---\s*\n([\s\S]*?)\n---/)
  const fields = {}
  for (const line of frontmatter?.[1]?.split("\n") ?? []) {
    const match = line.match(/^([\w-]+):\s*(.*)$/)
    if (!match) continue

    const rawValue = match[2].trim()
    if (rawValue.startsWith("\"") && rawValue.endsWith("\"")) {
      try {
        fields[match[1]] = JSON.parse(rawValue)
        continue
      } catch {
        // Fall back to the permissive legacy parsing below.
      }
    }
    fields[match[1]] = rawValue.replace(/^['"]|['"]$/g, "")
  }
  const fallbackName = path.basename(path.dirname(file))
  return {
    name: fields.name || fallbackName,
    description: fields.description || "",
    fingerprint: hash(contents),
  }
}

/** Converts arbitrary skill names into safe OpenCode directory names. */
function normalizeSkillName(value) {
  const normalized = String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 64)
    .replace(/-+$/g, "")
  return normalized || "imported-skill"
}

/**
 * Removes unsupported frontmatter while preserving the skill body.
 * OpenCode loads skills from SKILL.md, so source-specific metadata must not
 * be allowed to invalidate the local skill definition.
 */
function normalizeSkillContent(contents, name, description) {
  const frontmatter = contents.match(/^---\s*\n([\s\S]*?)\n---/)
  const safeDescription = JSON.stringify(description || `Imported skill for ${name}.`)
  if (!frontmatter) return `---\nname: ${name}\ndescription: ${safeDescription}\n---\n\n${contents}`

  const lines = []
  const removedFields = []
  let skippingUnsupportedBlock = false
  for (const line of frontmatter[1].split("\n")) {
    const field = line.match(/^([A-Za-z][\w-]*):(?:\s|$)/)
    if (field) {
      skippingUnsupportedBlock = !OPENCODE_SKILL_FIELDS.has(field[1])
      if (skippingUnsupportedBlock) removedFields.push(line)
      else lines.push(line)
    } else if (!skippingUnsupportedBlock) {
      lines.push(line)
    }
  }
  const nameIndex = lines.findIndex((line) => /^name:\s*/.test(line))
  if (nameIndex >= 0) lines[nameIndex] = `name: ${name}`
  else lines.unshift(`name: ${name}`)
  const nextDescriptionIndex = lines.findIndex((line) => /^description:\s*/.test(line))
  if (nextDescriptionIndex >= 0) lines[nextDescriptionIndex] = `description: ${safeDescription}`
  else lines.splice(nameIndex >= 0 ? nameIndex + 1 : 1, 0, `description: ${safeDescription}`)
  let result = `---\n${lines.join("\n")}\n---${contents.slice(frontmatter[0].length)}`
  if (removedFields.length) {
    const migratedFields = removedFields.map((line) => line.replace(/-->/g, "--")).join("; ")
    result = `${result.trimEnd()}\n\n<!-- Imported non-OpenCode frontmatter was removed: ${migratedFields} -->\n`
  }
  return result
}

/** Normalizes every configured local skill and returns changed paths. */
async function normalizeConfiguredSkills(root) {
  const skillsRoot = path.join(root, ".opencode", "skills")
  const files = await walk(skillsRoot)
  const normalized = []
  for (const relative of files.filter((file) => path.basename(file) === "SKILL.md")) {
    const file = path.join(skillsRoot, relative)
    const prefix = await readSmallText(file)
    if (!prefix || !/^---\s*\n[\s\S]*?\n---/.test(prefix)) continue
    const parsed = parseSkill(file, prefix)
    const name = normalizeSkillName(parsed.name)
    const description = parsed.description || prefix.match(/^#\s+(.+)$/m)?.[1] || `Imported skill for ${name}.`
    const normalizedPrefix = normalizeSkillContent(prefix, name, description)
    if (normalizedPrefix !== prefix) {
      const contents = await readFile(file, "utf8").catch(() => "")
      if (!contents) continue
      const fixed = normalizeSkillContent(contents, name, description)
      await writeFile(file, fixed, "utf8")
      normalized.push(path.relative(root, file))
    }
  }
  return normalized
}

/**
 * Moves legacy `.agents/skills` entries into the OpenCode skill directory.
 * Existing destination directories win, preventing an automatic migration
 * from overwriting a skill the user already installed or edited.
 */
async function migrateSkills(root) {
  const sourceRoot = path.join(root, ".agents", "skills")
  const targetRoot = path.join(root, ".opencode", "skills")
  const files = await walk(sourceRoot)
  const migrated = []
  const conflicts = []
  await mkdir(targetRoot, { recursive: true })

  for (const relative of files.filter((file) => path.basename(file) === "SKILL.md")) {
    const sourceFile = path.join(sourceRoot, relative)
    const sourceDirectory = path.dirname(sourceFile)
    const sourceContents = await readFile(sourceFile, "utf8").catch(() => "")
    if (!sourceContents) continue
    const parsed = parseSkill(sourceFile, sourceContents)
    const name = normalizeSkillName(parsed.name)
    const destination = path.join(targetRoot, name)
    if (await exists(destination)) {
      conflicts.push(name)
      continue
    }

    const description = parsed.description || sourceContents.match(/^#\s+(.+)$/m)?.[1] || `Imported skill for ${name}.`
    const normalized = normalizeSkillContent(sourceContents, name, description)
    if (normalized !== sourceContents) await writeFile(sourceFile, normalized, "utf8")
    if (sourceDirectory === sourceRoot) {
      await mkdir(destination, { recursive: true })
      await rename(sourceFile, path.join(destination, "SKILL.md"))
    } else {
      await rename(sourceDirectory, destination)
    }
    migrated.push(name)
  }
  return { migrated, conflicts, normalized: [] }
}

/** Reads the installed OpenCode skills and computes their fingerprints. */
async function inspectSkills(root) {
  const skillsRoot = path.join(root, ".opencode", "skills")
  const files = await walk(skillsRoot)
  const skills = []
  for (const relative of files.filter((file) => path.basename(file) === "SKILL.md")) {
    const file = path.join(skillsRoot, relative)
    skills.push({ ...parseSkill(file, await readSmallText(file)), file: path.relative(root, file) })
  }
  return skills.sort((left, right) => left.name.localeCompare(right.name))
}

/** Accepts the response shapes used by different skills.sh API versions. */
function candidateList(payload) {
  if (Array.isArray(payload)) return payload
  if (!payload || typeof payload !== "object") return []
  for (const key of ["skills", "results", "items", "data"]) {
    if (Array.isArray(payload[key])) return payload[key]
  }
  return []
}

/**
 * Queries skills.sh for complementary recommendations.
 * Network discovery is deliberately best-effort; local skill scanning still
 * works when the network is unavailable or the API changes shape.
 */
async function discoverSkills(technologies, installed) {
  const installedNames = new Set(installed.map((skill) => skill.name.toLowerCase()))
  const results = []
  const terms = technologies.slice(0, 5)
  for (const term of terms) {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 8000)
    try {
      const url = `${SKILLS_API}?q=${encodeURIComponent(term)}&limit=8`
      const response = await fetch(url, { signal: controller.signal, headers: { accept: "application/json" } })
      if (!response.ok) continue
      for (const item of candidateList(await response.json())) {
        const name = String(item.name || item.slug || item.title || item.id || "").trim()
        const description = String(item.description || item.summary || "").trim()
        const source = String(item.source || item.repository || item.repo || item.url || "").trim()
        if (!name || !source || installedNames.has(name.toLowerCase())) continue
        const skillId = String(item.skillId || item.slug || name).trim()
        const key = String(item.id || `${source}:${skillId}`)
        const installSpec = `${source}@${skillId}`
        if (!results.some((result) => result.key === key)) results.push({ key, name, description, installSpec, term })
      }
    } catch {
      // Network discovery is optional; local scanning still works offline.
    } finally {
      clearTimeout(timeout)
    }
  }
  return results.slice(0, 8)
}

/** Builds the user-facing report injected into the next assistant turn. */
function reportText(workspace, installed, suggestions, changedSkills, reconciliation, migration) {
  const lines = ["Nexus Skills report", "", `Detected technologies: ${workspace.technologies.join(", ") || "none yet"}`]
  if (workspace.patterns.length) lines.push(`Detected patterns: ${workspace.patterns.join(", ")}`)
  lines.push(`Configured local skills: ${installed.map((skill) => skill.name).join(", ") || "none"}`)
  if (migration.migrated.length) lines.push(`Migrated from .agents/skills: ${migration.migrated.join(", ")}`)
  if (migration.normalized.length) lines.push(`Normalized for OpenCode: ${migration.normalized.join(", ")}`)
  if (migration.conflicts.length) lines.push(`Migration conflicts (left in .agents/skills): ${migration.conflicts.join(", ")}`)
  if (suggestions.length) {
    lines.push("", "Complementary skills found on skills.sh:")
    for (const suggestion of suggestions) {
      lines.push(`- ${suggestion.name}: ${suggestion.description || "No description provided."}`)
      lines.push(`  Install: npx skills add ${suggestion.installSpec} -a opencode`)
    }
  }
  if (changedSkills.length) lines.push("", `New or changed skills: ${changedSkills.join(", ")}`)
  if (reconciliation) {
    lines.push(
      "",
      "Reconciliation required: review every local SKILL.md against AGENTS.md and resolve contradictions.",
      "Treat all explicit AGENTS.md instructions as user authority. Confirm external best practices with the skill text or reliable web documentation before changing project guidance.",
    )
  }
  return lines.join("\n")
}

/**
 * OpenCode plugin entry point for skill discovery and normalization.
 *
 * @param {{directory?: string, worktree?: string}} context Plugin workspace context.
 * @returns {Promise<object>} OpenCode hooks and tools.
 */
export const NexusSkills = async ({ directory, worktree }) => {
  const root = directory || worktree || process.cwd()
  const stateFile = path.join(root, ".opencode", ".nexus-skills.json")
  const intervalMinutes = Number(process.env.NEXUS_SKILLS_INTERVAL_MINUTES) || DEFAULT_INTERVAL_MINUTES
  let state = (await readJson(stateFile)) || { version: 1, initialized: false, recommended: [] }
  let latestReport = ""
  let pendingReport = ""
  let scanPromise

  /** Persists plugin state while keeping read-only workspaces functional. */
  async function save(nextState) {
    state = nextState
    try {
      await writeFile(stateFile, `${JSON.stringify(state, null, 2)}\n`, "utf8")
    } catch {
      // A read-only workspace should not disable the plugin.
    }
  }

  /** Coalesces overlapping scans so startup, chat, and timer events do not race. */
  async function scan(force = false) {
    if (scanPromise) return scanPromise
    scanPromise = (async () => {
      const workspace = await inspectWorkspace(root)
      const migration = await migrateSkills(root)
      migration.normalized = await normalizeConfiguredSkills(root)
      const installed = await inspectSkills(root)
      const previousSkills = state.skills || {}
      const currentSkills = Object.fromEntries(installed.map((skill) => [skill.name, skill.fingerprint]))
      const newSkills = state.initialized ? installed.filter((skill) => !previousSkills[skill.name]).map((skill) => skill.name) : []
      const changedSkills = state.initialized
        ? installed.filter((skill) => previousSkills[skill.name] && previousSkills[skill.name] !== skill.fingerprint).map((skill) => skill.name)
        : []
      const shouldDiscover = force || !state.initialized || state.workspaceSignature !== workspace.signature
      const suggestions = shouldDiscover ? await discoverSkills(workspace.technologies, installed) : []
      const unseenSuggestions = suggestions.filter((suggestion) => !(state.recommended || []).includes(suggestion.key))
      const reconciliation = newSkills.length > 0 || changedSkills.length > 0 || migration.migrated.length > 0 || migration.normalized.length > 0
      const nextState = {
        version: 1,
        initialized: true,
        workspaceSignature: workspace.signature,
        technologies: workspace.technologies,
        skills: currentSkills,
        recommended: [...new Set([...(state.recommended || []), ...suggestions.map((suggestion) => suggestion.key)])].slice(-100),
        lastScanAt: new Date().toISOString(),
      }
      await save(nextState)
      // Reports are emitted only for new information, keeping routine timer
      // scans invisible while still surfacing migration and reconciliation work.
      if (unseenSuggestions.length || reconciliation || migration.conflicts.length) {
        latestReport = reportText(workspace, installed, unseenSuggestions, [...newSkills, ...changedSkills], reconciliation, migration)
        pendingReport = latestReport
      }
      return { workspace, installed, suggestions: unseenSuggestions, newSkills, changedSkills, migration, reconciliation, report: latestReport }
    })().finally(() => {
      scanPromise = undefined
    })
    return scanPromise
  }

  const timer = setInterval(() => void scan(), Math.max(1, intervalMinutes) * 60 * 1000)
  timer.unref?.()
  setTimeout(() => void scan(), 1500).unref?.()

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
        // Injecting the report into the next system turn makes discovery
        // actionable without interrupting an in-progress tool call.
        output.system.push(`You have a Nexus Skills report. Surface it to the user clearly. If it says reconciliation is required, inspect every affected SKILL.md and AGENTS.md now and make the necessary consistency fixes with your normal tools. Explicit user instructions in AGENTS.md always take precedence; never rewrite them to satisfy a skill. Validate non-user best-practice claims against the skill text or reliable web documentation.\n\n${pendingReport}`)
        pendingReport = ""
      }
    },
    "chat.message": async () => {
      void scan()
    },
    tool: {
      nexus_skills: tool({
        description: "Scan the workspace for technology changes, report complementary skills, or request skills/AGENTS.md reconciliation.",
        args: {
          action: tool.schema.enum(["scan", "report", "reconcile"]).default("scan"),
        },
        async execute({ action }) {
          if (action === "report") return latestReport || "Nexus Skills has no new report."
          if (action === "reconcile") {
            pendingReport = latestReport || "Nexus Skills reconciliation requested. Review .opencode/skills/**/SKILL.md against AGENTS.md. AGENTS.md takes precedence over skill guidance."
            return "Reconciliation queued for the next assistant response."
          }
          const result = await scan(true)
          return result.report || "Nexus Skills found no new recommendations or installed skills."
        },
      }),
    },
  }
}
