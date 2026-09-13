import test from "node:test"
import assert from "node:assert/strict"
import {
  JOKE_API_URL,
  REFRESH_INTERVAL_MS,
  fetchProgrammingJoke,
  formatAcknowledgmentTitle,
  parseProgrammingJoke,
  scheduleJokeRefresh,
} from "./joke.js"

test("combines the programming joke setup and delivery", () => {
  assert.equal(
    parseProgrammingJoke({ error: false, type: "twopart", setup: "Why do programmers prefer dark mode?", delivery: "Because light attracts bugs." }),
    "Why do programmers prefer dark mode? Because light attracts bugs.",
  )
})

test("rejects a response without both joke parts", () => {
  assert.equal(parseProgrammingJoke({ setup: "A setup without a punchline" }), null)
  assert.equal(parseProgrammingJoke({ setup: 42, delivery: "Not a joke" }), null)
})

test("rejects an error response or a response with the wrong joke type", () => {
  const joke = { setup: "A setup", delivery: "A delivery" }

  assert.equal(parseProgrammingJoke({ ...joke, error: true, type: "twopart" }), null)
  assert.equal(parseProgrammingJoke({ ...joke, error: false, type: "single" }), null)
})

test("fetches a two-part joke from JokeAPI's programming category", async () => {
  const calls = []
  const fetchImpl = async (url, options) => {
    calls.push({ url, options })
    return {
      ok: true,
      async json() {
        return { error: false, type: "twopart", setup: "What do you call a programmer from Finland?", delivery: "Nerdic." }
      },
    }
  }

  assert.equal(await fetchProgrammingJoke(fetchImpl), "What do you call a programmer from Finland? Nerdic.")
  assert.equal(calls[0].url, JOKE_API_URL)
  assert.equal(calls[0].options.headers.accept, "application/json")
})

test("schedules refreshes every five minutes and can cancel them", () => {
  const scheduled = []
  const cancelled = []
  const refresh = () => {}
  const stop = scheduleJokeRefresh(
    refresh,
    (callback, delay) => {
      scheduled.push({ callback, delay })
      return "joke-timer"
    },
    (timer) => cancelled.push(timer),
  )

  assert.deepEqual(scheduled, [{ callback: refresh, delay: REFRESH_INTERVAL_MS }])
  stop()
  assert.deepEqual(cancelled, ["joke-timer"])
})

test("uses the joke itself as the sidebar title without a label", () => {
  assert.equal(formatAcknowledgmentTitle("Why did the code cross the road? To get to the other side."), "Why did the code cross the road? To get to the other side.")
})
