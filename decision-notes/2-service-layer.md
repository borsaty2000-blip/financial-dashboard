# Service layer

This is the entry point for the dashboard data.

The original service layer was a single fetch request where I explicitly told TypeScript what the function was going to return.

Why did I do that?

The initial scope was deliberately narrow and the local API was controlled by me. I could treat it as a trusted API. In a real project I can imagine that the backend already validates its own response, owns a schema, and gives the frontend generated types. I did not implement that whole setup because I considered it outside the scope of this dashboard.

So the first version used a typed fetch not because TypeScript somehow validates runtime data, but because I made a deliberate assumption that this particular API was trusted.

In a larger production system, the surrounding stack and existing architectural constraints could lead to different decisions. Here the approach changed once I started treating malformed responses, semantic inconsistencies, transient transport failures, timeouts, and cancellation as real inputs rather than hypothetical concerns. The idea of splitting the service into several steps, which I had initially considered unnecessary for the narrow scope, became useful because those steps now had different responsibilities and failure semantics.

The service data flow ended up split into several stages.

## 1. Get the raw response

The transport gets the raw response from the backend. At this point the data is unknown.

That is already different from the first version. The first version started from the assumption that the response was a `FinancialReport`. The current service starts from the opposite assumption: until I validate it, I do not know what came back.

## 2. Handle transport failures

At the fetch level I distinguish the failures that belong to the transport itself: a network problem, an abort, a non-2xx response, malformed JSON, and a failure while reading the response body.

This is not only a naming exercise. Those failures behave differently later. A temporary network problem or a `503` may make sense to retry. Broken JSON does not.

The first version did not have a separate recovery mechanism because it had one controlled local endpoint. Once I considered the complete failure path, I no longer wanted one temporary network failure to immediately turn into a dead screen for the user.

That is where `withRetry` came from.

The simplest thing would have been to put retry directly inside `financialReportApi`: fetch failed, try fetch again.

But then the retry mechanism itself becomes tied to fetch and to my HTTP errors. I wanted to separate two things: the mechanism and the policy.

`withRetry` only knows that it has an asynchronous operation, a limited number of attempts, a timeout, an optional external signal, and a callback that decides whether a non-timeout failure can be retried. It does not know what HTTP is. Its own per-attempt timeout remains part of the retry mechanism and starts another attempt while the retry budget remains.

`shouldRetryHttpError` knows the HTTP side. A network failure or, for example, a `503` can be retried. Broken JSON or an external abort cannot.

Why did I generalize this when the whole point of the first version was that I did not want to generalize things without a reason?

Because here the reason already exists. Retry mechanics really do not belong to the financial-report domain and they do not depend on HTTP policy. This was not me guessing a future use case. The boundary showed up naturally while implementing the real behavior.

The same applies to timeout and cancellation. Fetch only knows that it was aborted. It should not have to guess whether that happened because one attempt timed out or because a React component was unmounted and nobody needs the request anymore.

`withRetry` owns the per-attempt timeout. The UI can pass an external signal for lifecycle cancellation. The operation gets the resulting signal.

I wanted to keep those two situations separate: timeout is a real failure that the user may eventually see; cancellation because of unmount is normal cleanup of work that is no longer needed.

One more thing I wanted to keep: `withRetry` stays generic. It does not import my HTTP errors, does not know what `FinancialReport` is, and does not make product decisions. If I ever need the same mechanism for a completely different asynchronous operation, I can pass another policy.

## 3. Runtime validation and mapping

After the transport succeeds, the data goes through runtime validation with Zod.

First question: why Zod?

The choice for me was mainly between Zod and Valibot. Zod has a bigger ecosystem and, more importantly for me here, I preferred its DX. I considered the bundle-size difference non-critical for this dashboard. In a larger production system, the choice would depend on its surrounding stack and established project conventions.

Second question: why runtime validation at all?

TypeScript exists at compile time, not at runtime. As a developer, I can convince it very easily that a particular object is coming from the server.

The evidence is basically: "TypeScript, just trust me."

In the first version I deliberately used exactly that trust because the API was fully under my control. Once I treated the response as an unknown external value and considered what would happen if its runtime structure changed, that agreement with myself was no longer enough.

A JSON response can be perfectly valid JSON, parse successfully, and still have the wrong structure or wrong values for the application. That is the first boundary Zod closes.

I also do not leak the raw Zod error through the whole application. At the service boundary it becomes an `invalid-response` API error that the rest of the app understands. There is no reason to retry that kind of error either: another request is not going to magically repair the structure of the same response.

The next step is a deep mapper.

Why do I need a deep mapper if Zod already validated everything?

Because Zod answers "can I trust the external structure?" The mapper answers a different question: "how does that external contract become my internal model?"

In the first version the API response and the internal model were almost the same thing because I had already decided that the API was controlled. Once I stopped making that assumption, keeping the two models glued together stopped making sense.

If the backend changes a field name, nesting, or the way some value is represented, I do not want to search through the whole application for places that know about that transport format. I want one transformation point.

The mapper is not the final guarantee either. After mapping there is one more stage.

## 4. Semantic validation

This step appeared after I checked what structural validation actually guaranteed and found invariants that valid field shapes alone could not protect.

Zod is very good at answering: "does this object have the shape I expect?"

It does not automatically answer: "do these values make sense together?"

For example, I can get twelve periods and an array of eleven values. Both fields are valid on their own: periods are strings, values are numbers. The problem only appears when I try to relate them.

The same applies to duplicate IDs, repeated periods, an invalid calendar date, or a parent total that does not match the sum of its children. The JSON is valid. The schema can still be valid. The data is not.

That is why the mapped domain model goes through a separate semantic validator.

I deliberately did not push all of that into one giant Zod schema. For me these are two slightly different questions. Zod validates the external contract. The semantic validator checks the invariants that the application relies on.

As a result, once data leaves the service layer, the application treats it as trusted. The projection functions retain narrow defensive assertions so local misuse fails clearly, but they do not own API validation or repeatedly reconstruct the guarantees established at the service boundary.
