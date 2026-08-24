# React lifecycle

The reason for moving the hook was pretty direct here as well.

In the first version the application layer itself was less strict, so having the loading hook close to it did not bother me much. It was one small data-loading flow for one screen.

After `application` became a plain TypeScript layer that should work independently from React, the hook there simply started to look out of place.

`useEffect`, `useState`, cleanup, and component lifecycle are React concerns.

So the hook moved into `ui`.

It now owns the lifecycle.

A request starts on mount. On unmount it is cancelled. On reload the previous request becomes stale.

There is also a request ID because an `AbortController` alone is not a complete guarantee. A dependency can theoretically ignore the signal and still finish later. An old result must not overwrite newer state in that case.

The state is a discriminated union: `loading`, `success`, and `error`.

Why not three separate `useState` calls?

Because once reload and several async transitions exist, it becomes very easy to represent impossible combinations such as `loading = true` while old data and an error both exist.

The union simply does not allow those states at the type level.

After automatic retries are exhausted, the user gets an error state and a `Try again` button.

I wanted the failure flow to actually end somewhere useful. Retry existing inside the service does not mean much for UX if, after the final failure, the only recovery path is manually refreshing the whole page.
