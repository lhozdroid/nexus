import assert from "node:assert/strict"
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises"
import path from "node:path"
import test from "node:test"
import { copyProfile, validateProfile } from "../lib/installer.js"

test("copies the OpenCode profile without generated state or dependencies", async () => {
  const source = await mkdtemp("/tmp/opencode/nexus-installer-source-")
  const target = await mkdtemp("/tmp/opencode/nexus-installer-target-")

  try {
    await writeFile(path.join(source, "opencode.json"), "{}\n")
    await writeFile(path.join(source, "tui.json"), "{}\n")
    await writeFile(path.join(source, ".nexus-skills.json"), "generated\n")
    await copyProfile(source, target)

    assert.equal(await readFile(path.join(target, "opencode.json"), "utf8"), "{}\n")
    await assert.rejects(readFile(path.join(target, ".nexus-skills.json")))
    await assert.rejects(readFile(path.join(target, "node_modules")))
  } finally {
    await rm(source, { recursive: true, force: true })
    await rm(target, { recursive: true, force: true })
  }
})

test("rejects an invalid profile before installation", async () => {
  await assert.rejects(
    validateProfile({ opencode: "missing", tui: "missing" }),
    /profile/i,
  )
})
