# Playwright E2E

The tests run against the Vite dev server and mock backend REST responses at the browser network layer. This keeps CI deterministic while still exercising the real React app, routing, buttons, forms and layouts.

Run locally:

```bash
npm run test:e2e
```

Open the report:

```bash
npm run test:e2e:report
```
