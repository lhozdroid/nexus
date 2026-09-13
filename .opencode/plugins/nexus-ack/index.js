import { createElement, spread } from "@opentui/solid"
import { createEffect, createSignal } from "solid-js"
import { fetchProgrammingJoke, formatAcknowledgmentTitle, scheduleJokeRefresh } from "./joke.js"

const FALLBACK_JOKE = "The code is compiling. Probably."

function acknowledgmentTitle(joke) {
  const title = createElement("text")
  spread(title, { content: "" }, true)

  createEffect(() => {
    title.content = formatAcknowledgmentTitle(joke())
  })

  return title
}

export default {
  id: "nexus-ack",
  tui: async (api) => {
    const [joke, setJoke] = createSignal(FALLBACK_JOKE)
    const refresh = async () => {
      try {
        const nextJoke = await fetchProgrammingJoke(globalThis.fetch, api.lifecycle.signal)
        if (nextJoke) setJoke(nextJoke)
      } catch {
        // Keep the last successful joke when the remote service is unavailable.
      }
    }

    void refresh()
    const stopRefresh = scheduleJokeRefresh(refresh)
    api.lifecycle.onDispose(stopRefresh)

    api.slots.register({
      order: 400,
      slots: {
        sidebar_title: () => acknowledgmentTitle(joke),
      },
    })
  },
}
