import { createElement, insert, spread } from "@opentui/solid"
import { createEffect, createSignal } from "solid-js"
import { availableAgentEntries, displayAgentName } from "./agents.js"

function availableAgentsPanel(agents, expanded, toggle) {
  const panel = createElement("box")
  spread(panel, { flexDirection: "column", gap: 1, paddingRight: 1 }, true)

  const header = createElement("box")
  spread(header, {
    height: 1,
    focusable: true,
    onMouseDown: (event) => {
      if (event.button === 0) toggle()
    },
    onKeyDown: (key) => {
      if (["enter", "return", "space"].includes(key.name)) {
        key.preventDefault()
        toggle()
      }
    },
  }, true)

  const title = createElement("text")
  spread(title, { content: "" }, true)

  const list = createElement("text")
  spread(list, { content: "" }, true)

  createEffect(() => {
    title.content = `${expanded() ? "▼" : "▶"} Available agents`
    list.content = agents
      .map((agent) => `  ${displayAgentName(agent.name)}`)
      .join("\n")
    list.visible = expanded()
  })

  insert(header, title)
  insert(panel, [header, list])
  return panel
}

export default {
  id: "nexus-available-agents",
  tui: async (api) => {
    const agents = availableAgentEntries(api.state.config.agent)
    const [expanded, setExpanded] = createSignal(api.kv.get("nexus-available-agents.expanded", true))
    const toggle = () => {
      const next = !expanded()
      setExpanded(next)
      api.kv.set("nexus-available-agents.expanded", next)
    }

    api.slots.register({
      // Built-in TODO content uses order 400; 399 places this panel immediately before it.
      order: 399,
      slots: {
        sidebar_content: () => availableAgentsPanel(agents, expanded, toggle),
      },
    })
  },
}
