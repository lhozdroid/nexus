const WINDOW_TITLE = "Nexus - Fuck yeah!"

export default {
  id: "nexus-title",
  /**
   * Forces the terminal title to remain the Nexus title for the lifetime of
   * the TUI session, then restores OpenCode's renderer method on disposal.
   *
   * @param {object} api OpenCode TUI plugin API.
   * @returns {Promise<void>}
   */
  tui: async (api) => {
    const renderer = api.renderer
    const originalSetTerminalTitle = renderer.setTerminalTitle

    // Wrap the renderer method so future title updates cannot replace the
    // project title while this plugin is active.
    renderer.setTerminalTitle = () => {
      originalSetTerminalTitle.call(renderer, WINDOW_TITLE)
    }
    originalSetTerminalTitle.call(renderer, WINDOW_TITLE)

    api.lifecycle.onDispose(() => {
      renderer.setTerminalTitle = originalSetTerminalTitle
    })
  },
}
