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

There is a subtlety here that testing caught. With a *relative* base, the
fallback resolves `./assets/*` against the directory of whatever URL was
requested, not the app root:

| Requested URL | `./assets/` resolves to | Boots? |
| --- | --- | --- |
| `/POS-Masinloc/` | `/POS-Masinloc/assets/` | yes |
| `/POS-Masinloc/orders` | `/POS-Masinloc/assets/` | yes |
| `/POS-Masinloc/a/b` | `/POS-Masinloc/a/assets/` | **no** |

So the deploy workflow now runs `actions/configure-pages` *before* the build
and feeds the real deployed sub-path into `VITE_BASE_PATH`. The URLs become
absolute and the fallback boots at any depth. The relative default is still
what gets built everywhere else, because a host path that cannot be declared —
`/posmasinloqueño`, with its non-ASCII segment — needs it.

Public assets referenced from `index.html` (the manifest and the icons) are
written as root-absolute paths (`/icons/...`), which is the Vite idiom: Vite
rewrites them to whatever base the build declares. Written as `./icons/...`
they are left untouched and break the same way.

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
   automatic; on nginx use `error_page 404 /posmasinloqueño/404.html;`. Because
   this host's path cannot be declared as an ASCII base, the fallback boots at
   the app root and one level down but not deeper — see the table above. If
   deeper URLs matter here, rewrite them to the app root at the proxy
   (`rewrite ^/posmasinloqueño/.+ /posmasinloqueño/ redirect;`) instead of
   relying on `404.html`. The app has no router, so it never produces such a
   URL itself.

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

Three steps, in order. The first two can only be done by someone with admin
rights on the repository.

1. **Enable GitHub Pages.** Settings → Pages → Source: **GitHub Actions**.
   Without this the deploy job fails at `actions/configure-pages`. Note that
   Pages on a *private* repository requires a paid GitHub plan; on a public
   repository it is free.

2. **Add the staging code.** Settings → Secrets and variables → Actions →
   New repository secret, named `STAGING_ACCESS_CODE`. This is the code the
   team types to open the build. The workflow refuses to publish without it —
   verified: a dispatch with the secret unset fails at the guard step and
   skips the build, upload and deploy jobs entirely.

   Optionally add a repository *variable* `BASE_PATH`. Leave it unset in
   almost all cases — see below.

3. **Run it.** Actions → Deploy staging → Run workflow, on `main`.

The published URL will be `https://<owner>.github.io/<repo>/` — a sub-path,
not the domain root. Leave `BASE_PATH` unset: the workflow reads the real
sub-path from `actions/configure-pages` and builds against it, which is what
makes the 404 fallback work at any depth. Set `BASE_PATH` only to override
that for a different host, and keep the value ASCII.

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
