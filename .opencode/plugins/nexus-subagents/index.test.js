import assert from "node:assert/strict"
import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises"
import path from "node:path"
import test from "node:test"
import { NexusSubagents } from "./index.js"

test("rejects tampered remote agents before writing them", async () => {
  const root = await mkdtemp("/tmp/opencode/nexus-integrity-")
  const originalFetch = globalThis.fetch

  try {
    await mkdir(path.join(root, "src", "app"), { recursive: true })
    await writeFile(path.join(root, "package.json"), JSON.stringify({ dependencies: { react: "18.0.0" } }))
    await writeFile(path.join(root, "src", "app", "index.tsx"), "")
    globalThis.fetch = async () => new Response("tampered agent", { status: 200 })

    const hooks = await NexusSubagents({ directory: root })
    const report = await hooks.tool.nexus_subagents.execute({ action: "install" })

    assert.match(report, /integrity check failed/)
    await hooks.dispose()
  } finally {
    globalThis.fetch = originalFetch
    await rm(root, { recursive: true, force: true })
  }
})
