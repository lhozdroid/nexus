export const JOKE_API_URL = "https://v2.jokeapi.dev/joke/Programming?type=twopart"
export const REFRESH_INTERVAL_MS = 5 * 60 * 1000

const REQUEST_TIMEOUT_MS = 10 * 1000
const MAX_JOKE_LENGTH = 280
const CONTROL_CHARACTERS = /[\u0000-\u001F\u007F]/g

function cleanJokePart(value) {
  if (typeof value !== "string") return ""
  return value.replace(CONTROL_CHARACTERS, " ").replace(/\s+/g, " ").trim()
}

/** Returns a displayable two-part JokeAPI response, or null if it is malformed. */
export function parseProgrammingJoke(payload) {
  if (!payload || typeof payload !== "object") return null
  if (payload.error !== false || payload.type !== "twopart") return null

  const setup = cleanJokePart(payload.setup)
  const delivery = cleanJokePart(payload.delivery)
  if (!setup || !delivery) return null

  const joke = `${setup} ${delivery}`
  return joke.length <= MAX_JOKE_LENGTH ? joke : null
}

export function formatAcknowledgmentTitle(joke) {
  return cleanJokePart(joke)
}

/** Fetches one programming joke from the fixed JokeAPI endpoint. */
export async function fetchProgrammingJoke(fetchImpl = globalThis.fetch, parentSignal) {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)
  const abortRequest = () => controller.abort()

  if (parentSignal) {
    if (parentSignal.aborted) controller.abort()
    else parentSignal.addEventListener("abort", abortRequest, { once: true })
  }

  try {
    const response = await fetchImpl(JOKE_API_URL, {
      headers: { accept: "application/json" },
      signal: controller.signal,
    })
    if (!response.ok) throw new Error(`JokeAPI returned HTTP ${response.status}`)
    return parseProgrammingJoke(await response.json())
  } finally {
    clearTimeout(timeout)
    parentSignal?.removeEventListener("abort", abortRequest)
  }
}

export function scheduleJokeRefresh(refresh, schedule = setInterval, cancel = clearInterval) {
  const timer = schedule(refresh, REFRESH_INTERVAL_MS)
  return () => cancel(timer)
}
