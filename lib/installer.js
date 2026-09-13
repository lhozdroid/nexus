import { access, cp, mkdir, readdir } from "node:fs/promises"
import path from "node:path"

const IGNORED_NAMES = new Set(["node_modules", ".nexus-skills.json", ".nexus-subagents.json"])

async function exists(file) {
  try {
    await access(file)
    return true
  } catch {
    return false
  }
}

/** Validates the minimum files required for a Nexus OpenCode profile. */
export async function validateProfile(profile) {
  if (!profile || typeof profile !== "object" || !profile.opencode || !profile.tui) {
    throw new Error("Invalid Nexus profile: opencode and tui configuration paths are required")
  }

  for (const file of [profile.opencode, profile.tui]) {
    if (!(await exists(file))) throw new Error(`Invalid Nexus profile: missing ${file}`)
  }
}

/** Copies a profile while excluding dependencies and generated workspace state. */
export async function copyProfile(source, target, { force = false } = {}) {
  await validateProfile({
    opencode: path.join(source, "opencode.json"),
    tui: path.join(source, "tui.json"),
  })

  if (await exists(target)) {
    const entries = await readdir(target)
    if (entries.length && !force) {
      throw new Error(`${target} is not empty; use --force to replace the Nexus profile`)
    }
  }

  await mkdir(target, { recursive: true })
  await cp(source, target, {
    recursive: true,
    force: true,
    filter: (entry) => !IGNORED_NAMES.has(path.basename(entry)),
  })
}
