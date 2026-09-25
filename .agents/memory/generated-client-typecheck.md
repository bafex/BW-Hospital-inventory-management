---
name: Generated client typecheck
description: TypeScript configuration needed by generated browser API clients in this workspace.
---

The shared React API client needs both `dom` and `dom.iterable` in its TypeScript lib list because generated fetch helpers enumerate response headers.

**Why:** The generated client can compile successfully from Orval and still fail the workspace typecheck if iterable DOM types are omitted.

**How to apply:** When regenerating API hooks in this workspace, keep `dom.iterable` enabled in the client library tsconfig before diagnosing generated `Headers.entries()` errors.