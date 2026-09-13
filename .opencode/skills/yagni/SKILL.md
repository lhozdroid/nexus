---
name: yagni
description: "When writing or reviewing code to prevent over-engineering and speculative features. Use when the user says \"is this over-engineered,\" \"do we need this,\" \"should I add,\" \"future-proof,\" or \"just in case.\" For simplicity concerns, see kiss. For abstraction design, see solid."
metadata:
  version: 1.0.0
---

# YAGNI — You Aren't Gonna Need It

## Before Applying

If `.agents/stack-context.md` exists, it is read first. This principle is applied using idiomatic patterns for the detected stack. Framework-specific details are obtained through context7 MCP or web search rather than guessed.

## Principle

Do not build for hypothetical future requirements. Build what is needed now, and refactor when actual requirements emerge.

## Why This Matters in Production

Speculative code is the #1 source of accidental complexity. Every abstraction, configuration option, or extension point added "just in case" has a real cost: it must be understood, tested, maintained, and debugged. Unused code paths are the most dangerous — they rot silently, give false confidence in test coverage, and create surface area for bugs.

Premature generalization is worse than duplication. Duplication is obvious and easy to fix later. A wrong abstraction is painful to undo because other code grows to depend on it.

## Rules

1. **Solve the problem in front of the implementation.** With one use case, code is written for that use case: not two, and not a speculative "what if later."
2. **Three strikes, then abstract.** The first occurrence is written directly. The second occurrence is noted as duplication. At the third occurrence, the pattern is extracted — enough data now exists to design the right abstraction.
3. **Delete speculative code paths.** A feature flag that has never been toggled, a configuration option that has never changed, or a parameter that has never received anything other than its default is removed.
4. **Do not build plugin systems for one plugin.** Interfaces, registries, and extension points are justified only when multiple concrete implementations exist today.
5. **Prototype when uncertain.** When future need is unclear, the idea is spiked in a branch. Speculative infrastructure is not merged into main.

## Anti-Patterns

- Adding parameters "for flexibility" that only ever receive one value
- Building an event system when two components could call each other directly
- Creating abstract base classes with a single concrete implementation
- Writing configuration files for values that never change
- Adding database columns "we might need later"
- Implementing caching before measuring whether there's a performance problem
- Building a microservice when a function call would suffice

## Examples

```
-- YAGNI violation: generic "processor" for one operation
class DataProcessor:
    def __init__(self, strategy, validator, transformer, output_format):
        self.strategy = strategy
        ...

-- Actually needed: one function
def process_csv_upload(file):
    rows = parse_csv(file)
    validate_rows(rows)
    save_to_db(rows)
```

```
-- YAGNI violation: premature abstraction
interface INotificationService
class EmailNotificationService implements INotificationService
class SMSNotificationService implements INotificationService  // "we might need this"
class PushNotificationService implements INotificationService  // "just in case"

-- Actually needed: only email is sent today
def send_welcome_email(user):
    mailer.send(to=user.email, template="welcome")
```

## Boundaries

- **YAGNI does not mean ignore architecture.** Good structure (separation of concerns, clear module boundaries) is not speculative — it makes future changes cheaper. YAGNI targets unused features, not good design.
- **YAGNI does not mean skip error handling.** Handling known failure modes (network errors, invalid input, disk full) is not speculative — those things will happen in production.
- **YAGNI does not mean avoid extensibility at zero cost.** If making code extensible costs nothing (e.g., using a map instead of a switch statement), do it. YAGNI targets costly abstractions.
- **Tension with DRY:** Sometimes YAGNI wins — it's better to have two similar-but-not-identical functions than to prematurely unify them behind the wrong abstraction.

## Code Review Checklist

- [ ] Does this change introduce code paths not exercised by current requirements?
- [ ] Are there parameters, configs, or options that only have one possible value today?
- [ ] Could this abstraction be replaced by a direct implementation without loss of functionality?
- [ ] Is this interface/trait/protocol justified by multiple concrete implementations?
- [ ] Would a simpler approach work for the current scope?

## Related Skills

- **kiss**: When the issue is complexity rather than speculation
- **solid**: When designing abstractions that are justified
- **dry**: When deciding whether to extract a pattern (YAGNI says wait for 3 occurrences)
