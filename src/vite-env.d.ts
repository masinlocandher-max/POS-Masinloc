/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Deployment sub-path. Leave unset for a relative base — see vite.config.ts. */
  readonly VITE_BASE_PATH?: string
  /** Staging access code. Empty disables the staging lock (local development). */
  readonly VITE_STAGING_ACCESS_CODE?: string
  /** Set to 'true' only at public launch to remove the staging lock. */
  readonly VITE_PUBLIC_LAUNCH?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
