# Vercel Production Audit — 14 September 2026

## External sources inspected

- Project settings: <https://vercel.com/borsaty1/financial-dashboard/settings>
- Build settings: <https://vercel.com/borsaty1/financial-dashboard/settings/build-and-deployment>
- Domain settings: <https://vercel.com/borsaty1/financial-dashboard/settings/domains>
- Runtime logs: <https://vercel.com/borsaty1/financial-dashboard/logs>
- Production domain: <https://borsatyai.com>

## Confirmed account and projects

The active Vercel scope is `borsaty1` under the signed-in user `borsaty2000-4525`. The relevant project is `financial-dashboard` (`prj_2EEjTVuo1p4yLZ8USzfG6gShdGfa`), linked to `borsaty2000-blip/financial-dashboard`. A separate `borsaty-main` project exists but is not the production-domain target.

## Domain assignment

Both `borsatyai.com` and `www.borsatyai.com` are assigned to `financial-dashboard` as Production domains. No domain transfer or deletion was required. The additional Vercel domain `financial-dashboard-iota-sand.vercel.app` reports Valid Configuration.

## Deployment before the fix

Deployment `3Kr1Aa6brBmNwJqV1yWZMzF71JDR` was Latest and Production from commit `a5ef9e8`, with deploy logs reporting 1m 7s. It served the old `Clients` financial-report component at `/` because `client/src/App.tsx` explicitly routed `/` to `FinancialReportSection`; this was not a domain-to-wrong-project problem.

Its Production Overrides were:

- Build: `npx prisma generate && npm run build`
- Install: `npm install --include=dev && npm --prefix client install --include=dev`

Project settings showed Framework `Other`, Build `npm run build`, Output `client/dist`, and Root Directory `client`. Root Directory was corrected to repository root (`./`) on 14 September 2026 so the frontend and `api/` Serverless function are built from one project.

## Runtime failure found

Vercel Runtime Logs showed five recent 500 errors. `/api/market/egx/summary`, `/api/market/tasi/summary`, and `/api/market/summary` failed with:

```text
Error [ERR_MODULE_NOT_FOUND]: Cannot find module '/var/task/server/index' imported from /var/task/api/index.js
```

The cause was a dynamic extensionless import in `api/index.ts`. It was changed to a static `import app from '../server/index.js'`, allowing the Vercel bundler to include the Express application and routes.

## Code correction

Commit `4464d36` (`fix(production): serve Borsaty home and bundle API`) changes `/` to a dedicated Arabic Borsaty public launch page, preserves the legacy report at `/financial-report`, adds public EGX/TASI and Elliott/Gann routes, and fixes Serverless bundling. The production deployment and final validation are documented below when complete.

## Redeploy and second runtime finding

The first deployment of commit `4464d36` failed in 10 seconds because it started before the Root Directory correction was saved. Vercel executed the root install override from `/vercel/path0/client`, producing an invalid `/vercel/path0/client/client/package.json` path. Root Directory was saved as `./`, then the same commit was redeployed without code changes. Deployment `3m6cN4KsqD8Waq2K1LEiUQbG5mxQ` became Ready in 1m 41s, and both the generated Vercel URL and `borsatyai.com` served the new Borsaty page.

The new static import correctly bundled the Express routes but exposed a second serverless compatibility problem in Runtime Logs: importing `profile.routes.ts` attempted `mkdir('/var/task/server/uploads/avatars')`. Vercel's deployed filesystem is read-only except `/tmp`, so this module initialization crashed every full Express request, including `/api/health`. The avatar route was changed to avoid filesystem initialization on Vercel and to return a transparent 503 until persistent object storage is configured; local development retains the current 2 MB JPEG/PNG/WebP disk upload behavior.
