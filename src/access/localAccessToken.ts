// The Access Token `npm run local` minted for this machine (#63), filled in on setup so a reviewer only presses
// Continue. Only a dev build reads it: in a production build `import.meta.env.DEV` is false, so this is null and the
// bundler drops the variable entirely.
export const localAccessToken = (): string | null => (import.meta.env.DEV ? (import.meta.env.VITE_LOCAL_ACCESS_TOKEN ?? null) : null);
