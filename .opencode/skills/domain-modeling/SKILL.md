---
name: domain-modeling
description: "Build and sharpen a project's domain model. Use when discussing codebase terminology, writing or editing a CONTEXT.md, or recording or editing an ADR."
---

# Domain Modeling

The project's domain model is actively built and sharpened during design. This is the *active* discipline: terms are challenged, edge-case scenarios are invented, and the glossary and decisions are recorded as soon as they crystallise. Merely *reading* `CONTEXT.md` for vocabulary is not this skill; that is a one-line habit any skill can perform. This skill applies when the model changes, not when it is merely consumed.

## File structure

Most repos have a single context:

```
/
├── CONTEXT.md
├── docs/
│   └── adr/
│       ├── 0001-event-sourced-orders.md
│       └── 0002-postgres-for-write-model.md
└── src/
```

If a `CONTEXT-MAP.md` exists at the root, the repo has multiple contexts. The map points to where each one lives:

```
/
├── CONTEXT-MAP.md
├── docs/
│   └── adr/                          ← system-wide decisions
├── src/
│   ├── ordering/
│   │   ├── CONTEXT.md
│   │   └── docs/adr/                 ← context-specific decisions
│   └── billing/
│       ├── CONTEXT.md
│       └── docs/adr/
```

Create files lazily, only when there is something to write. If no `CONTEXT.md` exists, create one when the first term is resolved. If no `docs/adr/` exists, create it when the first ADR is needed.

## During the session

### Challenge against the glossary

When a user term conflicts with the existing language in `CONTEXT.md`, flag the conflict immediately: "The glossary defines 'cancellation' as X, but the intended meaning appears to be Y. Which is correct?"

### Sharpen fuzzy language

When a user term is vague or overloaded, propose a precise canonical term: "The term 'account' is ambiguous. Does it mean the Customer or the User? Those are different things."

### Discuss concrete scenarios

When domain relationships are discussed, stress-test them with specific scenarios. Invent scenarios that probe edge cases and require precise boundaries between concepts.

### Cross-reference with code

When a user states how something works, check whether the code agrees. If a contradiction appears, surface it: "The code cancels entire Orders, but the stated rule permits partial cancellation. Which is correct?"

### Update CONTEXT.md inline

When a term is resolved, update `CONTEXT.md` immediately. Do not batch resolutions; capture them as they happen. Use the format in [CONTEXT-FORMAT.md](./CONTEXT-FORMAT.md).

`CONTEXT.md` should be totally devoid of implementation details. Do not treat `CONTEXT.md` as a spec, a scratch pad, or a repository for implementation decisions. It is a glossary and nothing else.

### Offer ADRs sparingly

Only offer to create an ADR when all three are true:

1. **Hard to reverse**: the cost of changing the decision later is meaningful
2. **Surprising without context**: a future reader will wonder "why did they do it this way?"
3. **The result of a real trade-off**: genuine alternatives existed and one was selected for specific reasons

If any of the three is missing, skip the ADR. Use the format in [ADR-FORMAT.md](./ADR-FORMAT.md).
