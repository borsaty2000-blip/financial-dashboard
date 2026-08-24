# Financial Dashboard

Financial reporting dashboard built with React, TypeScript, and Node.js.

## Tech stack

- React
- TypeScript
- Vite
- Tailwind CSS
- Recharts
- Vitest
- React Testing Library
- Node.js
- Express

## Architecture

The financial-report module is split into `application`, `services`, `types`, `ui`, and `utils` layers. Generic
hierarchical table components and utilities live in `shared/kit/table`. The report returned by the API remains the single source of truth for both the chart and table. The report tree is flattened before rendering, expansion state is stored separately, and visible rows are derived from their ancestor identifiers. Vitest reuses the Vite configuration so tests and the application share the same import aliases and transformations.

## Notes

- The local Node.js server exposes the report and avatar files through REST endpoints.
- The mock dataset contains the complete hierarchy used by the dashboard.
- The table remains usable on narrow screens through horizontal scrolling, and expandable rows support keyboard interaction.

## Installation

Install the backend and root tooling dependencies:

```bash
npm install
```

Install the client dependencies:

```bash
cd client
npm install
cd ..
```

## Running locally

Start the REST API from the project root:

```bash
npm run server
```

Start the client in another terminal:

```bash
npm run client
```

Open [http://localhost:5173](http://localhost:5173). The API runs on `http://localhost:4000` and is available to the client through the Vite development proxy.

## Tests

Run the test suite once:

```bash
npm test
```

Run tests in watch mode:

```bash
npm run test:watch
```

Generate a coverage report:

```bash
npm run coverage
```

## Run checks

```bash
npm run typecheck
npm run lint
npm run build
```

The production client bundle is written to `client/dist`.
