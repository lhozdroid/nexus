---
name: systematic-debugging
description: "Use when encountering any bug, test failure, or unexpected behavior, before proposing fixes"
---

# Systematic Debugging

## Overview

**Core principle:** ALWAYS find root cause before attempting fixes. Symptom fixes are failure.

**Violating the letter of this process is violating the spirit of debugging.**

## The Iron Law

```
NO FIXES WITHOUT ROOT CAUSE INVESTIGATION FIRST
```

Until Phase 1 is complete, fixes cannot be proposed.

## When to Use

Use for ANY technical issue:
- Test failures
- Bugs in production
- Unexpected behavior
- Performance problems
- Build failures
- Integration issues

**This applies ESPECIALLY when:**
- Under time pressure (emergencies make guessing tempting)
- "Just one quick fix" seems obvious
- Multiple fixes have already been tried
- Previous fix didn't work
- The issue is not fully understood

**The process is not skipped when:**
- Issue seems simple (simple bugs have root causes too)
- The team is in a hurry (rushing guarantees rework)
- Manager wants it fixed NOW (systematic is faster than thrashing)

## The Four Phases

Each phase MUST be completed before proceeding to the next.

### Phase 1: Root Cause Investigation

**BEFORE attempting ANY fix:**

1. **Read Error Messages Carefully**
   - Do not skip past errors or warnings
   - They often contain the exact solution
   - Read stack traces completely
   - Note line numbers, file paths, error codes

2. **Reproduce Consistently**
   - Can the issue be triggered reliably?
   - Record the exact steps.
   - Determine whether it happens every time.
   - If not reproducible → gather more data; do not guess

3. **Check Recent Changes**
   - Identify what changed that could cause this.
   - Git diff, recent commits
   - New dependencies, config changes
   - Environmental differences

4. **Gather Evidence in Multi-Component Systems**

   **WHEN system has multiple components (CI → build → signing, API → service → database):**

   **BEFORE proposing fixes, add diagnostic instrumentation:**
   ```
   For EACH component boundary:
     - Log what data enters component
     - Log what data exits component
     - Verify environment/config propagation
     - Check state at each layer

   Run once to gather evidence showing WHERE it breaks
   THEN analyze evidence to identify failing component
   THEN investigate that specific component
   ```

   **Example (multi-layer system):**
   ```bash
   # Layer 1: Workflow
   echo "=== Secrets available in workflow: ==="
   echo "IDENTITY: ${IDENTITY:+SET}${IDENTITY:-UNSET}"

   # Layer 2: Build script
   echo "=== Env vars in build script: ==="
   env | grep IDENTITY || echo "IDENTITY not in environment"

   # Layer 3: Signing script
   echo "=== Keychain state: ==="
   security list-keychains
   security find-identity -v

   # Layer 4: Actual signing
   codesign --sign "$IDENTITY" --verbose=4 "$APP"
   ```

   **This reveals:** Which layer fails (secrets → workflow ✓, workflow → build ✗)

5. **Trace Data Flow**

   **WHEN error is deep in call stack:**

   See `root-cause-tracing.md` in this directory for the complete backward tracing technique.

   **Quick version:**
   - Where does bad value originate?
   - What called this with bad value?
   - Continue tracing until the source is found
   - Fix at source, not at symptom

### Phase 2: Pattern Analysis

**Find the pattern before fixing:**

1. **Find Working Examples**
   - Locate similar working code in same codebase
   - Identify working code similar to the broken code.

2. **Compare Against References**
   - If implementing a pattern, read the reference implementation COMPLETELY.
   - Do not skim; read every line.
   - Understand the pattern fully before applying it.

3. **Identify Differences**
   - Identify every difference between working and broken code.
   - List every difference, however small.
   - Do not assume "that is irrelevant."

4. **Understand Dependencies**
   - Identify the other components required.
   - Identify the required settings, configuration, and environment.
   - Identify the assumptions being made.

### Phase 3: Hypothesis and Testing

**Scientific method:**

1. **Form Single Hypothesis**
   - State clearly: "X is the root cause because Y."
   - Write the hypothesis down.
   - Be specific, not vague.

2. **Test Minimally**
   - Make the SMALLEST possible change to test the hypothesis.
   - Change one variable at a time.
   - Do not fix multiple things at once.

3. **Verify Before Continuing**
   - Did it work? Yes → Phase 4.
   - Did it fail? Form a NEW hypothesis.
   - Do not add more fixes on top.

4. **When the Issue Is Not Understood**
   - State "X is not understood"
   - Do not pretend to know
   - Ask for help
   - Conduct more research

### Phase 4: Implementation

**Fix the root cause, not the symptom:**

1. **Create Failing Test Case**
   - Simplest possible reproduction
   - Automated test if possible
   - One-off test script if no framework
   - MUST exist before fixing
   - Use the `superpowers:test-driven-development` skill for writing proper failing tests

2. **Implement Single Fix**
   - Address the root cause identified
   - ONE change at a time
   - No "while I'm here" improvements
   - No bundled refactoring

3. **Verify Fix**
   - Does the test pass now?
   - Are no other tests broken?
   - Is the issue actually resolved?
   - Use the `superpowers:verification-before-completion` skill before claiming success

4. **If the Fix Fails**
   - STOP
   - Count the fixes already attempted.
   - If < 3: Return to Phase 1 and re-analyze with new information.
   - **If ≥ 3: STOP and question the architecture (step 5 below)**
   - Do not attempt Fix #4 without architectural discussion.

5. **If 3+ Fixes Failed: Question Architecture**

   **Pattern indicating architectural problem:**
   - Each fix reveals new shared state/coupling/problem in different place
   - Fixes require "massive refactoring" to implement
   - Each fix creates new symptoms elsewhere

   **STOP and question fundamentals:**
   - Is this pattern fundamentally sound?
   - Are we "sticking with it through sheer inertia"?
   - Should we refactor architecture vs. continue fixing symptoms?

**Discuss with the human partner before attempting more fixes**

    This is NOT a failed hypothesis; it is an architectural problem.

## Red Flags - STOP and Follow Process

If any of the following thoughts arise:
- "Quick fix for now, investigate later"
- "Just try changing X and see if it works"
- "Add multiple changes, run tests"
- "Skip the test; manual verification is enough"
- "It's probably X, let me fix that"
- "The issue is not fully understood, but this might work"
- "The pattern says X, but it can be adapted differently"
- "Here are the main problems: [lists fixes without investigation]"
- Proposing solutions before tracing data flow
- **"One more fix attempt" (when already tried 2+)**
- **Each fix reveals new problem in different place**

**ALL of these mean: STOP. Return to Phase 1.**

**If 3+ fixes failed:** Question the architecture (see Phase 4.5)

## Human Partner Signals That the Process Is Off Track

**Watch for these redirections:**
- "Is that not happening?" - An assumption was made without verification
- "Will it show us...?" - Evidence gathering should have been added
- "Stop guessing" - Fixes are being proposed without understanding
- "Ultra-think this" - Question fundamentals, not just symptoms
- "We're stuck?" (frustrated) - The approach is not working

**When these appear:** STOP. Return to Phase 1.

## Common Rationalizations

| Excuse | Reality |
|--------|---------|
| "Issue is simple; the process is unnecessary" | Simple issues have root causes too. The process is fast for simple bugs. |
| "Emergency, no time for process" | Systematic debugging is FASTER than guess-and-check thrashing. |
| "Just try this first, then investigate" | First fix sets the pattern. Do it right from the start. |
| "A test can be written after confirming the fix works" | Untested fixes do not stick. Test-first development proves the fix. |
| "Multiple fixes at once saves time" | The effective change cannot be isolated, and new bugs result. |
| "The reference is too long; the pattern can be adapted" | Partial understanding guarantees bugs. Read it completely. |
| "I see the problem, let me fix it" | Seeing symptoms ≠ understanding root cause. |
| "One more fix attempt" (after 2+ failures) | 3+ failures indicate an architectural problem. Question the pattern; do not fix again. |

## Quick Reference

| Phase | Key Activities | Success Criteria |
|-------|---------------|------------------|
| **1. Root Cause** | Read errors, reproduce, check changes, gather evidence | Understand WHAT and WHY |
| **2. Pattern** | Find working examples, compare | Identify differences |
| **3. Hypothesis** | Form theory, test minimally | Confirmed or new hypothesis |
| **4. Implementation** | Create test, fix, verify | Bug resolved, tests pass |

## When Process Reveals "No Root Cause"

If systematic investigation reveals issue is truly environmental, timing-dependent, or external:

1. The process is complete.
2. Document what was investigated.
3. Implement appropriate handling (retry, timeout, error message)
4. Add monitoring/logging for future investigation

**But:** 95% of "no root cause" cases are incomplete investigation.

## Supporting Techniques

These techniques are part of systematic debugging and available in this directory:

- **`root-cause-tracing.md`** - Trace bugs backward through call stack to find original trigger
- **`defense-in-depth.md`** - Add validation at multiple layers after finding root cause
- **`condition-based-waiting.md`** - Replace arbitrary timeouts with condition polling
