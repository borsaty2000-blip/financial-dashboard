# Architecture

## Overview

The `financial-report` feature is organized around four main areas:

1. `services`
2. `application`
3. `types`
4. `ui`

A feature composition root connects concrete services to application use cases. The
`shared` directory contains mechanisms and renderers that do not depend on the
financial-report domain.

The central idea is that external data becomes progressively more trusted as it
moves through the application:

```text
Express API
    -> HTTP transport
    -> retry, timeout, and cancellation
    -> runtime shape validation
    -> DTO mapping
    -> candidate FinancialReport
    -> semantic validation
    -> trusted FinancialReport
    -> application projections
    -> React lifecycle
    -> feature UI
    -> shared renderers
```

The service layer owns the external boundary. The application layer prepares
trusted domain data for the current use case. Domain types describe the internal
financial-report model. The UI layer owns React lifecycle and feature-specific
presentation.

Feature-relative paths below start at
`client/src/modules/financial-report`. Paths beginning with `shared` start at
`client/src`.

## Repository topology

The repository contains two locally run processes:

```text
Browser -> Vite client (:5173) -> /api proxy -> Express server (:4000)
```

`server/index.ts` serves the financial report from `server/data.json` through
`/api/financial-report` and avatar files through `/api/avatars/:fileName`. During
development, Vite proxies `/api` requests to `http://localhost:4000`, so the browser
uses same-origin relative URLs.

The current deployment model is local-only and does not define a remote API
deployment or a separate production CORS contract.

## Service layer

The service layer turns an unknown external response into a trusted
`FinancialReport`. Raw API responses do not cross this boundary.

```text
unknown response
    -> transport handling
    -> retry policy
    -> structural validation
    -> DTO
    -> explicit mapping
    -> FinancialReport
    -> semantic validation
    -> trusted FinancialReport
```

### `services/financial-report-api.ts`

The HTTP transport is responsible for:

- calling `/api/financial-report`;
- passing an `AbortSignal` to `fetch`;
- distinguishing network failures from aborts;
- handling non-successful HTTP responses;
- parsing the response body;
- distinguishing malformed JSON from response-body stream failures.

It returns `unknown` and has no knowledge of Zod, DTO mapping, application
projections, or React.

### `services/financial-report-api-adapter.ts`

The adapter composes:

- transport;
- retry behavior;
- runtime validation;
- DTO mapping;
- semantic validation.

It is the boundary that exposes a trusted `FinancialReport` to the application
layer. Schema, mapping, and semantic validation failures are normalized here as
API-level `invalid-response` errors.

### `services/utils/financial-report.schema.ts`

The Zod schema validates the external response structure before the application
trusts it. It checks required fields, primitive types, hierarchy shape, leaf-node
structure, employee image references, non-empty names, and numeric value arrays.

Structural validation does not attempt to express relationships between totals.

### `services/utils/map-financial-report-dto.ts`

The mapper explicitly converts the validated external DTO into the internal
`FinancialReport` model. This keeps the external API contract separate from the
model consumed by the application.

### `services/utils/validate-financial-report.ts`

Semantic validation checks relationships that cannot be verified from individual
fields alone:

- periods represent real calendar dates;
- periods are unique;
- node IDs are globally unique when rendered as strings;
- every node contains one value per period;
- parent totals equal the sum of their direct children;
- company totals equal the values represented by channel leaves.

After this step, the report is treated as trusted.

## Shared service infrastructure

Service mechanisms that are not specific to financial reports live in `shared`.

### `shared/service-utils/retry-policy/with-retry.ts`

The generic retry mechanism owns:

- a limited number of attempts;
- a cooperative timeout for each attempt;
- external cancellation;
- `AbortSignal` propagation;
- discarding late results from cancelled or timed-out attempts.

It does not know about HTTP and does not decide which transport errors are
retryable. A timeout created by this mechanism is retried while attempts remain;
an external abort stops the operation.

### `shared/service-utils/retry-policy/should-retry-http-error.ts`

The HTTP policy decides which transport failures are worth retrying:

- network failures are retryable;
- `408`, `429`, and selected `5xx` responses are retryable;
- HTTP aborts and malformed JSON are not retryable.

This keeps retry mechanics separate from transport policy. Runtime and semantic
validation happen after request retries have completed, so an invalid API response
never enters the HTTP retry policy.

## Error model

Owned failures use a shared structured shape instead of relying only on arbitrary
error messages:

```text
shared/errors/
|-- create-error-factory.ts
|-- error-type-guard.ts
|-- http-error.ts
|-- api-error.ts
`-- application-error.ts
```

- `createHttpError` creates transport failures such as `network`, `abort`,
  `bad-response`, and `invalid-json`.
- `createApiError` creates a failure for a response that was received but could not
  become a valid application model.
- `createApplicationError` creates a failure for inconsistent trusted data
  discovered while building application projections.

Low-level validators remain independent of this model. They may throw a regular
`Error`; the boundary that understands the failure normalizes it.

## Domain model

The domain types form the internal read model used after the service boundary has
validated and mapped the response. This is intentionally a typed read model, not a
full domain-driven design implementation.

### `types/financial-report.ts`

Defines the root `FinancialReport`, which contains the periods and root company.

### `types/financial-node.ts`

Defines the hierarchy:

```text
Company
    -> Branch
        -> Employee
            -> Channel
```

These types are separate from the DTO contract owned by the service layer.

## Application layer

The application layer receives trusted domain data and creates the representations
required by the use case. It does not depend on `fetch`, HTTP, Zod, React, or
Recharts.

```text
FinancialReport
    |-- FinancialChartView
    `-- FinancialTableData
```

### `application/load-financial-report-view.ts`

This is the main application use-case factory. It accepts a function capable of
loading a `FinancialReport`, waits for the trusted model, and creates both UI
projections. The concrete service is injected as a function rather than imported
by the application layer.

### `application/create-financial-chart-view.ts`

Builds chart data points and series while aggregating channel values across the
financial hierarchy. React does not need to understand how the domain tree is
aggregated. It retains a defensive assertion for the number of channel values even
though the service boundary already validates that invariant.

### `application/create-financial-table-data-view.ts`

Builds formatted columns and hierarchical table rows. It also enforces the
projection invariant that every row has one value for every data column.

### `application/utils/flatten-financial-report-data.ts`

Flattens the financial hierarchy in preorder using an iterative stack. Each row
contains the depth, ancestor IDs, image reference, values, and expansion metadata
required by the hierarchical UI.

This transformation remains feature-specific instead of pretending to be a generic
tree utility.

### `application/types/financial-table.ts`

Defines the table projection types consumed at the UI boundary.

## Composition root

`financial-report.composition.ts` connects the concrete service implementation to
the application use case:

```text
financialReportApiAdapter
    -> createLoadFinancialReportView
    -> loadFinancialReportView
```

The application factory depends only on the capability to load a
`FinancialReport`. A dependency-injection container would add no value to this
small dependency graph.

## UI layer

The UI layer owns React lifecycle and feature-specific presentation. It consumes
prepared application projections instead of rebuilding the financial model inside
components.

### `ui/FinancialReportSection.tsx`

The feature entry point renders loading, error, and success states. The successful
state contains the chart and hierarchical table; the error state exposes manual
recovery through `Try again`.

### `ui/hooks/use-financial-report.ts`

The hook owns the request lifecycle:

- starting report loading;
- representing loading, success, and error as a discriminated union;
- cancelling work during unmount;
- cancelling stale work during reload;
- preventing older results from overwriting newer state;
- exposing manual reload.

Lifecycle cancellation is control flow, not a user-facing failure.

### `ui/FinancialBarChart.tsx`

This feature adapter configures the shared chart with the palette, period
formatting, value accessors, and financial accessibility text. It does not own the
low-level Recharts renderer.

### `ui/FinancialTable.tsx`

This feature adapter owns expanded-row state, visible-row derivation, and financial
column configuration. Shared table components do not know about the financial
domain.

## Shared UI

Shared UI components are deliberately narrow abstractions rather than a custom
chart framework or universal data grid.

### Stacked bar chart

`shared/kit/chart/ui/StackedBarChart.tsx` is a reusable Recharts renderer. It
receives data points, series definitions, value accessors, formatting functions,
and accessibility information. `FinancialBarChart` configures it for this feature.

### Hierarchical table

The shared hierarchical-table package contains:

```text
shared/kit/table/
|-- table-types.ts
`-- ui/
    |-- HierarchicalTable.tsx
    |-- HierarchicalTableHeader.tsx
    `-- HierarchicalTableBody.tsx
```

The abstraction is explicitly hierarchical. It owns depth-based indentation,
expandable nodes, hierarchical row contracts, native row headers, and sticky
row-header presentation without exposing financial concepts. The financial
feature derives the visible rows from their ancestor IDs before passing them to the
shared renderer.

Expandable rows use a native `<button aria-expanded>` inside `<th scope="row">`.
Leaf rows remain non-interactive.

## Request lifecycle

The call path is:

```text
UI mount or reload
    -> AbortController
    -> loadFinancialReportView
    -> financialReportApiAdapter
    -> withRetry
    -> financialReportApi
    -> Express API
```

The response path is:

```text
unknown response
    -> runtime validation
    -> DTO mapping
    -> candidate FinancialReport
    -> semantic validation
    -> trusted FinancialReport
    -> chart and table projections
    -> FinancialReportView
    -> UI state
```

Retryable transport failures start another attempt while the retry budget remains.
A final failure produces the UI error state and a manual retry action. Unmounting
or superseding a request aborts the work without showing a cancellation error.

## Accessibility

Accessibility is treated as behavior, not only as a collection of ARIA attributes.

The table preserves native semantics:

```text
table
caption
th scope="col"
th scope="row"
button aria-expanded
```

- Expandable rows use native buttons and inherit keyboard behavior.
- Leaf rows are not interactive.
- The horizontally scrollable table is a named, keyboard-focusable region.
- The sticky row-header column remains available during horizontal scrolling.
- The chart exposes an accessible name and description through the Recharts
  accessibility layer and has a visible focus state.
- Chart data is also available through the legend, tooltip, and detailed table.
- Loading and error states use status and alert semantics.

## Testing boundaries

Tests follow the contracts owned by each layer.

The service tests cover transport classification, cancellation, HTTP failures,
response-body failures, retry and timeout behavior, schema validation, DTO mapping,
semantic invariants, and adapter normalization.

The application tests cover chart and table projections, hierarchy flattening,
period formatting, and use-case orchestration.

The UI tests cover request states, recovery, stale results, unmount cancellation,
hierarchical interaction, and accessibility behavior.

An integration-style contract test passes the actual `server/data.json` through
the schema, mapper, semantic validator, and both application projections. This
prevents the shipped server fixture and the client contract from silently drifting.

## Dependency direction

The feature is not a single linear dependency chain. The composition root is the
only place that connects the application use case to the concrete service:

```text
Feature UI --------> Application view APIs and types
    |--------------> Domain identifier type
    |--------------> Shared UI
    `--------------> Composition root
                           |       |
                           v       v
                     Application  Services
                           |       |
                           `---> Domain <---'

Application -------> Shared errors
Services ----------> Shared service utilities
Services ----------> Shared errors
```

The important constraints are:

- application code does not depend on React or HTTP;
- UI code does not parse API responses;
- shared UI does not depend on the financial-report feature;
- retry mechanics do not depend on HTTP retry policy;
- external DTOs do not automatically become the internal domain model;
- concrete service wiring stays outside the application layer.

## Further reading

This document describes the current architecture. For the reasoning and trade-offs
behind these decisions, see the
[architecture decision notes](./decision-notes/README.md).
