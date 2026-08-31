/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL?: string
  readonly VITE_SUPABASE_PUBLISHABLE_KEY?: string
  /** Deployment sub-path. Leave unset for a relative base. */
  readonly VITE_BASE_PATH?: string
  /** Staging access code. Empty disables the staging lock locally. */
  readonly VITE_STAGING_ACCESS_CODE?: string
  /** Set to 'true' only at public launch. */
  readonly VITE_PUBLIC_LAUNCH?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
