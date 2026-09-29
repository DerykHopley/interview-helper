import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  // The local Worker allows only this origin (ALLOWED_ORIGIN in worker/wrangler.jsonc), so fail if the port is
  // taken rather than quietly moving to one whose calls the browser would block as CORS errors.
  server: { port: 5173, strictPort: true },
});
