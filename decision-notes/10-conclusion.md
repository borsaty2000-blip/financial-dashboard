# Conclusion

Even though the project became much larger after reliability, validation, maintainability, reuse, lifecycle, and accessibility concerns became concrete, I am still following the same basic principle: I do not want to solve problems I do not have.

I did not add a repository abstraction.

In the first version it was obviously unnecessary: one endpoint, one consumer.

Once loading and projection composition became one application use case, the application needed to stop depending on the concrete service, but function injection already gave me that boundary. A repository interface would mostly duplicate the existing function signature.

I did not add a DI container.

Dependency injection here is one function passed into one application factory and wired to the concrete implementation in the composition root.

A container would add more infrastructure than value.

I did not build a full framework on top of Recharts.

The separation between financial-specific series configuration and reusable stacked-bar rendering gave me a reason to extract the stacked-bar responsibility that already existed. It did not give me requirements for line charts, pie charts, or dozens of imaginary configurations.

I did not build a data grid for the same reason.

The shared component is honestly a hierarchical table and does not pretend to cover every kind of table UI.

I did not add a global state manager.

The report state belongs to one screen, so a local hook is enough without Redux, Zustand, or another layer.

I did not add virtualization.

The current dataset has only a few dozen rows and only the expanded part of the tree is visible at the same time.

Virtualization would add complexity to layout and accessibility without solving a real performance problem.

I did not add full OpenAPI code generation.

The first version assumed a controlled backend contract that could be trusted at the TypeScript boundary.

Once I stopped treating the API response as trusted, runtime validation became necessary. Because the local API does not provide a source schema, I implemented it manually.

If a real backend exposed OpenAPI, I would seriously consider generating DTO types and runtime validators from one source of truth.

Creating an OpenAPI schema myself and then adding codegen just to generate code for one mock endpoint would be infrastructure for the sake of demonstrating infrastructure.

The same applies to exponential backoff, `Retry-After`, and other heavier production mechanisms.

Those decisions depend on the real API, its rate limits, load, and server behavior.

Here retries exist for bounded recovery from an occasional transient failure. I did not want to simulate a distributed system around one local GET request.

The first version was deliberately simple because it was built around a controlled API and a limited UI. As I exercised the complete flow, I found concrete gaps around transport recovery, runtime and semantic validation, lifecycle cancellation, reusable rendering boundaries, end-to-end contract coverage, and accessibility. Those concerns justified expanding the current architecture in exactly those areas.

The project now contains more boundaries, but the decision-making principle did not change. The goal was not to make everything as abstract as possible; it was to introduce each abstraction only after it had a concrete responsibility.

For me the main result of this refactor is not the number of added layers, files, or tests.

It is that for almost every new part I can answer two questions:

1. What concrete problem does it solve?
2. Why did I stop at this level of abstraction instead of going further?

If I cannot answer one of those questions, I probably do not need that part yet.
