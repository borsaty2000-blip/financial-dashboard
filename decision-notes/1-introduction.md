# Introduction

Here I want to explain the assumptions behind the initial implementation, why it looked the way it did, and which concrete problems made me expand the architecture as the project evolved.

When I started the project, I had a number of questions I needed to answer. I made the decisions iteratively while moving through the roadmap I had built for myself:

1. Define the project requirements.
2. Decide how I am going to implement them.
3. Decide on the architecture.
4. Define the layers and their responsibilities.
5. Pick the tools that are the most convenient for the current project.

But the main question I tried to answer was: does this project need global generalization around requirements that do not exist yet?

My answer was **no**.

I kept the initial implementation within the boundaries I had defined and did not treat it as something that needed full production readiness. Because of that, I allowed the layer responsibilities to be softer in a few places, while still keeping a very simple data flow that matched the actual requirements.

The layers were:

1. `services`
2. `application`
3. `types`
4. `ui`

And this is the important part for me: the initial implementation and the current version were built under different assumptions. In the initial implementation I was not trying to pretend that a small controlled dashboard was already a production project. I had one use case, one controlled API, one chart, one hierarchical table, and a deliberately narrow scope. I did not see a reason to build extra boundaries just because they might become useful one day.

What changed was not my belief in YAGNI, but the set of problems I had concrete evidence for. Once I started exercising the complete loading flow against failure scenarios, transient failures, timeouts, cancellation, and stale-result cases became concrete concerns. Treating the API as trusted left runtime structure and semantic invariants unchecked. Preparing data close to React tied the UI to one rendering flow, while checking keyboard and scrolling behavior exposed accessibility concerns. These were no longer hypothetical concerns worth solving only in some future version. That is why the current architecture goes further.

The following notes cover those layers together with the error, lifecycle, accessibility, and testing decisions that cross their boundaries.
