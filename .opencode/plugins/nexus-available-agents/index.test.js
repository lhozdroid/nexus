import test from "node:test"
import assert from "node:assert/strict"
import { availableAgentEntries, displayAgentName } from "./agents.js"

test("builds available agents without disabled or hidden entries", () => {
  const agents = availableAgentEntries({
    build: { description: "Custom build" },
    "private-agent": { description: "Hidden", hidden: true },
    "disabled-agent": { description: "Disabled", disable: true },
    "custom-agent": { description: "Custom" },
  })

  assert.deepEqual(
    agents.filter((agent) => ["build", "custom-agent", "private-agent", "disabled-agent"].includes(agent.name)),
    [
      { name: "build", description: "Custom build" },
      { name: "custom-agent", description: "Custom" },
    ],
  )
})

test("includes built-in agents when no custom definition overrides them", () => {
  const agents = availableAgentEntries({})

  assert.deepEqual(
    agents.map((agent) => agent.name),
    ["build", "explore", "general", "plan"],
  )
})

test("formats agent names for display without changing their identifiers", () => {
  assert.equal(displayAgentName("backend-architect"), "Backend Architect")
  assert.equal(displayAgentName("e2e-test-automator"), "E2E Test Automator")
})
