/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_WORKER_URL?: string;
  /** The Access Token `npm run local` minted (#63), filled in on setup in dev builds only. */
  readonly VITE_LOCAL_ACCESS_TOKEN?: string;
}
