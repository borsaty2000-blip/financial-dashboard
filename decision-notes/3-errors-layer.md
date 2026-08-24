# Errors

The first version did not have a separate error system either.

The reason was the same: one controlled request and one small flow did not give me enough reason to build my own error model.

After the service became a chain of transport, retries, validation, mapping, and semantic checks, plain `Error` objects with random messages became much less useful. I wanted to know at least which boundary had actually failed.

So I introduced a shared error shape and layer-specific factories for the different boundaries.

The transport understands network errors, aborts, bad HTTP responses, and invalid JSON.

The API boundary understands `invalid-response`: the HTTP request technically succeeded, but the data could not become a valid application model.

The application can report a problem discovered while building its own projections.

I deliberately did not couple the low-level validators directly to this error system. If the semantic validator finds a broken invariant, it just throws an error. At the service boundary that failure is normalized into an error with the `api` layer and `invalid-response` type.

The logic is simple for me: the validator should be able to say "these data are invalid," but it does not need to know which layer will classify that failure later.

I moved the common error shape and layer-specific factories into `shared`, while keeping validation and normalization at the boundaries that own them. I did not turn that small mechanism into a broader error framework without a concrete need.
