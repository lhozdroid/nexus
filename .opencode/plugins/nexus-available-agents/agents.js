const BUILTIN_AGENTS = [
  { name: "build", description: "Implements changes in the workspace." },
  { name: "explore", description: "Explores the workspace without editing files." },
  { name: "general", description: "Handles general-purpose development tasks." },
  { name: "plan", description: "Analyzes work and produces an implementation plan." },
]

/** Formats an agent identifier for display without changing its identifier. */
export function displayAgentName(name) {
  return name
    .split("-")
    .map((word) => word === "e2e" ? "E2E" : `${word[0].toUpperCase()}${word.slice(1)}`)
    .join(" ")
}

/** Returns configured agents that can be selected for work. */
export function availableAgentEntries(configAgents = {}) {
  const entries = new Map(BUILTIN_AGENTS.map((agent) => [agent.name, agent]))

  for (const [name, config] of Object.entries(configAgents ?? {})) {
    if (!config || typeof config !== "object") continue
    entries.set(name, {
      name,
      description: typeof config.description === "string" && config.description.trim()
        ? config.description
        : `Specialized ${name} development agent.`,
    })
  }

  return [...entries.values()]
    .filter((agent) => configAgents?.[agent.name]?.disable !== true && configAgents?.[agent.name]?.hidden !== true)
    .sort((left, right) => left.name.localeCompare(right.name))
}
