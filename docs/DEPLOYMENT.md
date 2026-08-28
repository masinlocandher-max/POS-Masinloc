# Masinloc POS — Deployment & access

## The 404, and why it happened

A deployed build served nothing but 404s. There were four separate causes, all
of which had to be fixed:

### 1. The build did not produce anything

`npm run build` failed before Vite ever ran:

```
tsconfig.node.json(7,35): error TS5096: Option 'allowImportingTsExtensions' can only
be used when either 'noEmit' or 'emitDeclarationOnly' is set.
```

`tsconfig.app.json` was also missing `composite: true`, which `tsc -b` requires
of a referenced project. With no `dist/`, any deploy publishes an empty
directory and every URL is a 404.

### 2. A stale compiled config was overriding the real one

Because that broken `tsconfig.node.json` had no `noEmit`, `tsc -b` compiled
`vite.config.ts` and wrote **`vite.config.js` next to it**. Vite resolves
`vite.config.js` *before* `vite.config.ts`, so every later build silently used
the stale compiled copy and ignored edits to the TypeScript config.

Both files are now git-ignored, and `tsconfig.node.json` sets `noEmit`.

### 3. The base path was hardcoded

```ts
base: '/posmasinloqueño/'
```

That bakes absolute URLs into `index.html`:

```html
<script src="/posmasinloqueño/assets/index-BCUaNiFa.js">
```

Those resolve only when the app is served from exactly that path. Every preview
URL, every staging host, and the local `vite preview` returned 404 for
`/assets/*` — the page loaded as a blank shell.

The `ñ` compounded it. The browser requests the percent-encoded form
(`/posmasinloque%C3%B1o/...`) and not every static host, CDN, or reverse proxy
maps that back to the on-disk directory. GitHub Pages in particular will not
serve a non-ASCII project path.

**Fix:** the base is now relative (`./`) by default, so one `dist/` works
unchanged at `/`, at `/posmasinloqueño/`, and at any other subpath.
`VITE_BASE_PATH` can still force an absolute base for a host that needs one —
keep that value ASCII.

### 4. No SPA fallback, and Jekyll on Pages

A deep link or a refreshed bookmark hit the host's own 404 page. `dist/404.html`
(a copy of `index.html`) now covers that, and `dist/.nojekyll` stops GitHub
Pages from dropping files whose names begin with an underscore.

### The guard against a repeat

`scripts/postbuild.mjs` runs as part of `npm run build` and **fails the build**
if `index.html` ships asset URLs that are non-ASCII, or absolute without an
explicit `VITE_BASE_PATH`. CI runs the same build, so the 404 cannot come back
unnoticed.

## Serving the app under `/posmasinloqueño`

The target route in `REGISTRATION_AND_ACCESS.md` is:

```
https://www.masinloc-zambales.com/posmasinloqueño
```

That works with the relative base — copy `dist/` into the directory and serve
it. Two things to arrange on the host:

1. **Serve an ASCII alias too.** Publish `/posmasinloqueno` (no `ñ`) as a 301
   to the canonical path. Some keyboards, link shorteners, and printed QR
   codes will mangle the `ñ`.
2. **Point the directory's 404 handler at `404.html`.** On GitHub Pages this is
   automatic; on nginx use `error_page 404 /posmasinloqueño/404.html;`.

## No public access yet

The app is deployable, but it must not be publicly usable until the review is
finished. Four layers hold that:

| Layer | Where | Effect |
| --- | --- | --- |
| Staging code | `src/StagingGate.tsx` | Nothing renders until the code is entered |
| `noindex` | `index.html` | Keeps the build out of search results |
| `Disallow: /` | `public/robots.txt` | Same, for crawlers that read robots first |
| Manual deploy | `.github/workflows/deploy-staging.yml` | No push publishes; someone has to run it |

**The staging code is not authorization.** It ships inside the JavaScript
bundle, so anyone who opens devtools can read it. It stops casual visitors and
nothing more. If the staging URL must be genuinely private, put a real control
in front of the host:

- Cloudflare Access (or any identity-aware proxy) on the hostname
- HTTP basic auth at the reverse proxy
- an IP allowlist for the store's own network

This is the same rule `REGISTRATION_AND_ACCESS.md` already states for merchant
approval: never treat client-side state as an authorization boundary.

### Deploying staging

Set these in the repository before the first run:

- secret `STAGING_ACCESS_CODE` — the code the team types
- variable `BASE_PATH` — leave empty unless the host demands an absolute base

Then run the **Deploy staging** workflow manually. It refuses to publish if no
access code is set.

### Opening to the public, later

When the launch decision is made, in one change:

1. set `VITE_PUBLIC_LAUNCH=true` (or clear `VITE_STAGING_ACCESS_CODE`)
2. remove the `robots` meta tag from `index.html`
3. relax `public/robots.txt`
4. give the deploy workflow whatever trigger the launch calls for

Until all four happen, the build stays private.

## Local development

```bash
npm install
npm run dev        # staging lock is off when no access code is set
npm run build      # type-check, build, and run the 404 guards
npm run preview    # serve dist/ exactly as a host would
npm run icons      # regenerate the PWA icons from the brand mark
```

To rehearse the locked staging experience locally:

```bash
VITE_STAGING_ACCESS_CODE=some-code npm run build && npm run preview
```

## Mobile / PWA notes

- `public/manifest.webmanifest` makes the app installable to a phone's home
  screen; icons are generated by `scripts/generate-icons.mjs` (no image
  dependencies — it writes the PNGs directly).
- `viewport-fit=cover` plus `env(safe-area-inset-*)` keeps the bottom nav clear
  of the iPhone home indicator and the topbar clear of the notch.
- Inputs are at least 16px so iOS Safari does not zoom the viewport on focus.
- Orders and order chat persist to `localStorage`, so a locked screen or an
  evicted tab does not wipe the queue. This is device-local demo state; the
  server becomes the source of truth when the backend lands.
- An offline banner appears when the device loses connectivity, which is a
  normal condition in Masinloc rather than an edge case.
