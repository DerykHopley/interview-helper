# React + Vite static app instead of Next.js or Streamlit

The course brief suggests building the app with Streamlit or Next.js. We use a React + TypeScript + Vite static single-page app instead, with a separate Cloudflare Worker as the only server-side code. All Candidate data stays in the browser (ADR 0001), so there are no server-rendered pages or API routes for Next.js to provide, and a plain static build keeps deployment to Cloudflare Pages and the test setup simple. The course confirmed Next.js is optional.
