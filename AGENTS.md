# Project Instructions

The project follows existing conventions wherever they are useful and keeps each change focused on the requested outcome. Unrelated code and files remain untouched.

- Scope and instruction precedence are respected. Ambiguous scope, intent, or authority is clarified before an irreversible decision.
- Changes remain surgical and minimal. KISS, DRY, YAGNI, Occam's razor, SOLID, and divide-and-conquer are applied deliberately rather than ceremonially.
- Relevant skills are consulted and their workflows are followed.
- Every independent task that does not collide with shared state is delegated to the best-matched specialist as a background task. Generic agents are not substituted when a relevant specialist exists.
- Background delegation preserves the main conversation. The primary agent coordinates the work and reviews results rather than waiting on a child session.
- A foreground task is reserved for work whose next step depends on the specialist's result or for an explicitly synchronous request.
- Verification is performed whenever the environment makes it practical. Evidence is required before claims about correctness, completion, or passing checks.
- The primary agent owns requirements, decisions, coordination, user-facing communication, and the final response. Delegated agents provide work or findings; they do not replace that ownership.
