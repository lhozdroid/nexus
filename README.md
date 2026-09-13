# Nexus OpenCode

```text
███  ██ ██████ ██  ██ ██  ██ ▄█████
██ ▀▄██ ██▄▄    ████  ██  ██ ▀▀▀▄▄▄
██   ██ ██▄▄▄▄ ██  ██ ▀████▀ █████▀

Nexus... The fucking coding team
```

Nexus is a ready-to-run programming team for OpenCode. It packages a focused set of specialist agents, engineering skills, server plugins, and TUI plugins into a profile that can be installed directly into a source-code project. The result is an opinionated operating layer for serious software work: autonomous when execution matters, explicit when a decision matters, and disciplined enough to leave an auditable trail.

## Requirements

- Node.js 18 or newer for the installer CLI.
- OpenCode 1.18.30 or newer.
- Bun-compatible OpenCode runtime for TUI plugins.

## Install In A Project

Run the following from the project directory:

```bash
npx nexus-opencode init .
npx nexus-opencode run
```

The installer refuses to replace a non-empty `.opencode` directory. Use `--force` only after reviewing the existing profile:

```bash
npx nexus-opencode init . --force
```

The installed profile belongs to the project and is intended to be committed to Git. Generated `.nexus-*.json` state remains ignored.

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
