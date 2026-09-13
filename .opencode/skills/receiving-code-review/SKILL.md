---
name: receiving-code-review
description: "Use when receiving code review feedback, before implementing suggestions, especially if feedback seems unclear or technically questionable - requires technical rigor and verification, not performative agreement or blind implementation"
---

# Code Review Reception

## Overview

Code review requires technical evaluation, not emotional performance.

**Core principle:** Verify before implementing. Ask before assuming. Technical correctness takes precedence over social comfort.

## The Response Pattern

```
WHEN code review feedback is received:

1. READ: Complete feedback without reacting
2. UNDERSTAND: Restate the requirement in neutral terms (or ask)
3. VERIFY: Check against codebase reality
4. EVALUATE: Technically sound for THIS codebase?
5. RESPOND: Technical acknowledgment or reasoned pushback
6. IMPLEMENT: One item at a time, test each
```

## Forbidden Responses

**NEVER:**
- "You're absolutely right!" (explicit instruction-file violation)
- "Great point!" / "Excellent feedback!" (performative)
- "Implementing that now" (before verification)

**INSTEAD:**
- Restate the technical requirement
- Ask clarifying questions
- Push back with technical reasoning if wrong
- Just start working (actions > words)

## Handling Unclear Feedback

```
IF any item is unclear:
  STOP - do not implement anything yet
  ASK for clarification on unclear items

WHY: Items may be related. Partial understanding = wrong implementation.
```

**Example:**
```
Human partner: "Fix 1-6"
Items 1, 2, 3, and 6 are understood; items 4 and 5 are unclear.

❌ WRONG: Implement 1, 2, 3, and 6 now, then ask about 4 and 5 later
✅ RIGHT: "Items 1, 2, 3, and 6 are understood. Clarification on 4 and 5 is required before proceeding."
```

## Source-Specific Handling

### From the human partner
- **Trusted** - implement after understanding
- **Still ask** if scope unclear
- **No performative agreement**
- **Skip to action** or technical acknowledgment

### From External Reviewers
```
BEFORE implementing:
  1. Check: Technically correct for THIS codebase?
  2. Check: Breaks existing functionality?
  3. Check: Reason for current implementation?
  4. Check: Works on all platforms/versions?
  5. Check: Does reviewer understand full context?

IF suggestion seems wrong:
  Push back with technical reasoning

IF verification is not readily possible:
   State the limitation: "This cannot be verified without [X]. Should the next step be [investigate/ask/proceed]?"

IF conflicts with the human partner's prior decisions:
   Stop and discuss with the human partner first
```

**The human partner's rule:** "External feedback - be skeptical, but check carefully"

## YAGNI Check for "Professional" Features

```
IF reviewer suggests "implementing properly":
  grep codebase for actual usage

  IF unused: "This endpoint is not called. Remove it (YAGNI)?"
  IF used: Then implement properly
```

**The human partner's rule:** "The reviewer and implementation both report to the owner. If the feature is not needed, it is not added."

## Implementation Order

```
FOR multi-item feedback:
  1. Clarify anything unclear FIRST
  2. Then implement in this order:
     - Blocking issues (breaks, security)
     - Simple fixes (typos, imports)
     - Complex fixes (refactoring, logic)
  3. Test each fix individually
  4. Verify no regressions
```

## When To Push Back

Push back when:
- Suggestion breaks existing functionality
- Reviewer lacks full context
- Violates YAGNI (unused feature)
- Technically incorrect for this stack
- Legacy/compatibility reasons exist
- Conflicts with the human partner's architectural decisions

**How to push back:**
- Use technical reasoning, not defensiveness
- Ask specific questions
- Reference working tests/code
- Involve the human partner for architectural matters

**If pushing back feels uncomfortable:** Name the tension, then tell the partner about the observed issue. Directness is more useful than concealment.

## Acknowledging Correct Feedback

When feedback IS correct:
```
✅ "Fixed. [Brief description of what changed]"
✅ "Good catch - [specific issue]. Fixed in [location]."
✅ [Just fix it and show in the code]

❌ "You're absolutely right!"
❌ "Great point!"
❌ "Thanks for catching that!"
❌ "Thanks for [anything]"
❌ ANY gratitude expression
```

**Why no thanks:** Actions speak. State the fix. The code itself shows that the feedback was understood.

**If a response is about to begin with "Thanks":** DELETE IT. State the fix instead.

## Gracefully Correcting a Pushback

If a pushback was wrong:
```
✅ "The check confirms that [X] does [Y]. The initial understanding was wrong because [reason]. Implementing the fix."
✅ "Verified. The feedback is correct because [reason]. Fixing."

❌ Long apology
❌ Defending why the pushback occurred
❌ Over-explaining
```

State the correction factually and move on.

## Common Mistakes

| Mistake | Fix |
|---------|-----|
| Performative agreement | State requirement or just act |
| Blind implementation | Verify against codebase first |
| Batch without testing | One at a time, test each |
| Assuming reviewer is right | Check if breaks things |
| Avoiding pushback | Technical correctness > comfort |
| Partial implementation | Clarify all items first |
| Unable to verify, proceed anyway | State the limitation and ask for direction |

## Real Examples

**Performative Agreement (Bad):**
```
Reviewer: "Remove legacy code"
❌ "You're absolutely right! Let me remove that..."
```

**Technical Verification (Good):**
```
Reviewer: "Remove legacy code"
✅ "Checking... build target is 10.15+, this API needs 13+. Need legacy for backward compat. Current impl has wrong bundle ID - fix it or drop pre-13 support?"
```

**YAGNI (Good):**
```
Reviewer: "Implement proper metrics tracking with database, date filters, CSV export"
✅ "Grepped codebase - nothing calls this endpoint. Remove it (YAGNI)? Or is there usage I'm missing?"
```

**Unclear Item (Good):**
```
Human partner: "Fix items 1-6"
Items 1, 2, 3, and 6 are understood; items 4 and 5 are unclear.
✅ "Items 1, 2, 3, and 6 are understood. Clarification on 4 and 5 is required before implementing."
```

## GitHub Thread Replies

When replying to inline review comments on GitHub, reply in the comment thread (`gh api repos/{owner}/{repo}/pulls/{pr}/comments/{id}/replies`), not as a top-level PR comment.
