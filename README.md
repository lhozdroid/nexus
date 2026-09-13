# Nexus OpenCode

```text
███  ██ ██████ ██  ██ ██  ██ ▄█████
██ ▀▄██ ██▄▄    ████  ██  ██ ▀▀▀▄▄▄
██   ██ ██▄▄▄▄ ██  ██ ▀████▀ █████▀

Nexus... The fucking coding team
```

Nexus is a ready-to-run programming team for OpenCode. It packages a focused set of specialist agents, engineering skills, server plugins, and TUI plugins into a profile that can be installed directly into a source-code project. The result is an opinionated operating layer for serious software work: autonomous when execution matters, explicit when a decision matters, and disciplined enough to leave an auditable trail.

## Requirements

- Node.js 18 or newer. `npm` and `npx` are included with Node.js.
- OpenCode 1.18.30 or newer, installed and available as `opencode` on your `PATH`.
- A Bun-compatible OpenCode runtime for the TUI plugins.

Nexus installs the OpenCode profile, but it does not install OpenCode itself. Install OpenCode using its official instructions, then confirm that it is available:

```bash
node --version
npm --version
opencode --version
```

## Install In An Existing Project

Nexus has two installation paths. Use the first path for the current `0.1.0` release. The second path is for when `1.0.0` is published to the npm registry.

### Current Release: 0.1.0

Version `0.1.0` is distributed from this GitHub repository. Clone it once, link its CLI, and then use the `nexus` command in any project on your machine.

#### 1. Download and link Nexus

Run these commands in a directory where you keep development tools:

```bash
git clone https://github.com/lhozdroid/nexus.git
cd nexus
npm install
npm link
nexus version
```

`npm link` makes the local `nexus` CLI available globally on your machine while pointing to this checkout. The expected version output is:

```text
0.1.0
```

If `nexus` is not found after linking, make sure npm's global bin directory is on your `PATH`, then run `npm link` again.

#### 2. Go to the project where Nexus should be installed

These steps assume that your project already exists at `/path/to/my-project`:

```bash
cd /path/to/my-project
```

The installer writes the Nexus profile to `.opencode/` inside this project. It does not copy Nexus into your project source files.

#### 3. Install the Nexus profile

```bash
nexus init .
```

This creates `.opencode/` with the agents, skills, plugins, and OpenCode configuration. The command refuses to continue when `.opencode/` already exists and contains files, protecting an existing OpenCode setup.

#### 4. Install the profile dependencies

The copied profile includes its own `package.json` and lockfile. Install those dependencies inside `.opencode`, not in your project's root:

```bash
npm install --prefix .opencode
```

This installs the plugin packages required by the server and TUI integrations. The resulting `.opencode/node_modules/` directory is generated and must not be committed.

#### 5. Validate the installation

```bash
nexus doctor .
```

A working installation reports the Nexus profile version, the detected OpenCode version, and the profile path:

```text
Nexus profile: 0.1.0
OpenCode: 1.18.30
Profile path: /path/to/my-project/.opencode
```

If the output says `OpenCode: unavailable`, the profile files are present but the `opencode` command is not available to the installer. Install OpenCode or fix your `PATH` before continuing. `doctor` reports the OpenCode version but does not enforce the `1.18.30` minimum, so check the output yourself.

#### 6. Start OpenCode with Nexus enabled

Run this from the project directory so OpenCode discovers `./.opencode`:

```bash
nexus run
```

This starts OpenCode with `--auto`, which enables Nexus's autonomous operating mode. You can pass OpenCode arguments after `run`, for example:

```bash
nexus run --model MODEL_NAME
```

Replace `MODEL_NAME` with a model supported by your OpenCode installation.

#### 7. Commit the installed profile

The profile belongs to the project and should normally be committed so every contributor uses the same agents, skills, and plugins:

```bash
git add .opencode
git commit -m "Add Nexus OpenCode profile"
```

The local checkout includes `.opencode/.gitignore`, which excludes `node_modules` and generated `.nexus-skills.json` and `.nexus-subagents.json` state. Do not force-add those files.

### Future Release: 1.0.0 From npm

After Nexus `1.0.0` is published to the npm registry, you will not need to clone this repository. Install the published package globally:

```bash
npm install --global nexus-opencode@1.0.0
nexus version
```

Then install it into a project using the same project steps:

```bash
cd /path/to/my-project
nexus init .
npm install --prefix .opencode
nexus doctor .
nexus run
```

For npm-installed releases, add these entries to the project's root `.gitignore` because npm does not include the profile's `.opencode/.gitignore` file:

```gitignore
.opencode/node_modules/
.opencode/.nexus-skills.json
.opencode/.nexus-subagents.json
```

### Updating An Existing Installation

Review the current profile and back up any local customizations before updating it. Then run the following from the project directory:

```bash
git diff -- .opencode
nexus init . --force
npm install --prefix .opencode
nexus doctor .
```

`--force` overwrites files with matching names from the Nexus distribution, but it does not delete unrelated files already in `.opencode/`. Resolve any resulting Git diff before committing the update.

## Troubleshooting

- `nexus: ... .opencode is not empty`: inspect the existing profile and either keep it or run `nexus init . --force` after backing up your changes.
- `nexus: command not found`: confirm that `npm link` completed and npm's global bin directory is on your `PATH`.
- `Unable to start opencode`: confirm `opencode --version` works in the same terminal and that OpenCode is on your `PATH`.
- OpenCode is too old: upgrade it to 1.18.30 or newer. `doctor` reports the version but does not enforce this minimum.
- Plugin import errors: run `npm install --prefix .opencode` again and verify that `.opencode/node_modules/` exists.
- Missing agents or skills: confirm that you started OpenCode from the project directory containing `.opencode/`.
- Remote discovery or agent download failures: confirm that the project has network access. Discovery is best effort, and remote agents are downloaded only after their integrity checks pass.
- Need a clean discovery scan: delete `.opencode/.nexus-skills.json` and `.opencode/.nexus-subagents.json`; the plugins regenerate them.

## Commands

```text
nexus init [project] [--force]  Install the profile
nexus run [opencode args]       Start OpenCode with --auto
nexus doctor [project]          Validate the installed profile
nexus version                   Print the Nexus version
```

`nexus run` intentionally starts OpenCode with unrestricted autonomous permissions. This is the core Nexus operating model, not a security boundary. The project owner remains responsible for deciding whether the model may run commands, edit files, read available files, and use network tools.

## Team

The default profile includes twelve specialist subagents, fifteen skills, two server plugins, and four TUI plugins. The skills and subagent plugins detect technology changes and report relevant additions. Remote-agent installation is pinned to a reviewed commit and verifies downloaded content before anything is written to the project.

## Development

```bash
make help
make test
make doctor
make run
```

Run `make run` only from a project where unrestricted autonomous execution is appropriate.

## Operating Principle

Nexus treats software development as a coordinated engineering practice rather than a single undifferentiated prompt. Architecture, implementation, testing, security, performance, debugging, and documentation each have a defined owner, while the primary agent retains responsibility for requirements, decisions, coordination, and the final result.

The profile is deliberately direct. It favors small changes, explicit trade-offs, evidence before claims, and tools that make the work easier to inspect. It does not pretend that autonomy is a security control: unrestricted execution is powerful precisely because it is unrestricted.

## Project Layout

- `.opencode/agents/`: specialist agent definitions.
- `.opencode/skills/`: reusable engineering workflows and reference material.
- `.opencode/plugins/`: server and TUI integrations.
- `bin/nexus`: the package CLI.
- `lib/installer.js`: profile validation and installation logic.
- `tests/`: installer and plugin regression tests.

## Verification

```bash
npm test
make doctor
npm pack --dry-run
```

The package is ready for use when the tests pass, the installed profile reports the expected OpenCode version, and the package preview contains the complete `.opencode` profile without dependencies or generated runtime state.
