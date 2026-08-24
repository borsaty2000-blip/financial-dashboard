# Testing

Testing was already one of the stronger parts of the initial solution.

As retry, runtime validation, semantic validation, request cancellation, and reload behavior became explicit responsibilities, the goal was not to make the coverage number look prettier.

I extended the suite around the new failure modes and boundary contracts introduced by those responsibilities.

If I add retry, checking that it retries once is not enough.

I care about exhausted attempts, timeout, external cancellation, no retry policy, a signal that is already aborted before the operation starts, and a late result from an operation that ignored cancellation.

If I split HTTP transport from API validation, I want separate tests for a network error, abort, non-2xx response, malformed JSON, and a connection failure while the body is being read.

That last one can look similar to a JSON parsing problem from the outside, but semantically it is still a network failure and can therefore have a different retry policy.

If React owns lifecycle cancellation, I am not interested only in `loading -> success`.

Unmount during the request is more interesting.

So is a late completion after unmount.

So is reload after an error.

And so is an old request finishing after the newer one.

Those are the cases that tell me whether the protection actually works or just exists in the code.

I also added a contract test using the real `server/data.json`.

Before that, frontend tests could use their own fixture.

That leaves a pretty unpleasant hole: the backend mock dataset changes, the frontend fixture does not, all unit tests stay green, and the application no longer accepts the real response.

The real dataset now goes through the same chain: schema -> mapper -> semantic validation -> application projections.

At the same time, I did not want to write tests only for percentages.

Recharts does not execute every callback inside jsdom in the same way it does with a real browser layout.

I could completely mock the library, manually call every callback, and get a nicer coverage report.

For me that test would prove almost nothing about my application and would couple the suite to the implementation details of someone else's library.

I prefer testing observable behavior and the boundaries I actually own.
