# Emirates Auction homepage mock

Local, front-end-only Next.js prototype of the Emirates Auction homepage shell. Auction listings, prices, countdowns and bid actions are mock data for visual evaluation.

## Run locally

```bash
npm install
npm run dev
```

Open `http://127.0.0.1:3000`.

## Cloudflare Worker

The project is configured as a static Next.js export for the Cloudflare Worker
named `official` in account `193587dc312e2f19fde56519a0b920a5`.

```bash
npm run build
npx wrangler deploy
```

The expected public URL is `https://official.emiratesauction.workers.dev` when
the account's `workers.dev` subdomain is configured as `emiratesauction`.

## Checks

```bash
npm run typecheck
npm run build
```

This prototype is not affiliated with or connected to a production auction backend. The official Emirates Auction logo is loaded from the official website for review purposes.
