import { createElement, insert, spread } from "@opentui/solid"

const BANNER = `███  ██ ██████ ██  ██ ██  ██ ▄█████
██ ▀▄██ ██▄▄    ████  ██  ██ ▀▀▀▄▄▄
██   ██ ██▄▄▄▄ ██  ██ ▀████▀ █████▀`
const SUBTITLE = "Nexus... The fucking coding team"
const ANSI_ESCAPE = /\x1b\[[0-?]*[ -/]*[@-~]/g

/**
 * Replaces OpenCode's exit prompt with a branded continuation command.
 *
 * The terminal may provide ANSI styling and may emit partial/unexpected
 * output, so the original chunk is returned whenever the expected session
 * prompt cannot be identified safely.
 *
 * @param {unknown} chunk Terminal output received by the stdout wrapper.
 * @returns {unknown} Branded output or the original chunk.
 */
function brandExitSplash(chunk) {
  if (typeof chunk !== "string" || !chunk.includes("Continue") || !chunk.includes("opencode -s ses_")) {
    return chunk
  }

  // Strip styling only for parsing; the final branded splash intentionally
  // uses plain text so it remains readable in every terminal.
  const plain = chunk.replace(ANSI_ESCAPE, "")
  const title = plain.match(/^\s*Session\s+(.*?)\s*$/m)?.[1]
  const sessionID = plain.match(/opencode -s (ses_\S+)/)?.[1]
  if (!title || !sessionID) return chunk

  return `${BANNER}\n\n  Session   ${title}\n  Continue  nexus -s ${sessionID}\n\n`
}

/**
 * Installs the stdout interception used to brand OpenCode's exit message.
 * The original function is captured and called for every write so normal
 * terminal output keeps the same stream, encoding, and callback behavior.
 */
function installExitSplashBranding(api) {
  const originalWrite = process.stdout.write
  const brandedWrite = (chunk, encoding, callback) => originalWrite.call(process.stdout, brandExitSplash(chunk), encoding, callback)
  process.stdout.write = brandedWrite
  api.lifecycle.onDispose(() => {
    if (process.stdout.write === brandedWrite) process.stdout.write = originalWrite
  })
}

/**
 * Builds the branded home-screen logo slot.
 *
 * @returns {object} OpenTUI logo element.
 */
function homeLogo() {
  const logo = createElement("box")
  spread(logo, { alignItems: "center", flexDirection: "column", gap: 1 }, true)

  const banner = createElement("text")
  spread(banner, { content: BANNER }, true)

  const subtitle = createElement("text")
  spread(subtitle, { content: SUBTITLE }, true)

  insert(logo, [banner, subtitle])
  return logo
}

/**
 * Builds the shared footer shown in the home and sidebar layouts.
 *
 * @returns {object} OpenTUI footer element.
 */
function brandingFooter() {
  const footer = createElement("text")
  spread(footer, { content: "• Nexus" }, true)
  return footer
}

export default {
  id: "nexus-branding",
  /**
   * Registers Nexus branding in the TUI and installs the exit splash hook.
   *
   * @param {object} api OpenCode TUI plugin API.
   * @returns {Promise<void>}
   */
  tui: async (api) => {
    installExitSplashBranding(api)

    api.slots.register({
      order: -100,
      slots: {
        home_logo: () => homeLogo(),
        home_footer: () => brandingFooter(),
        sidebar_footer: () => brandingFooter(),
      },
    })
  },
}
