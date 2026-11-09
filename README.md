# Emirates Auction V2 — public frontend

Public Next.js 16 frontend for the Emirates Auction V2 migration. It preserves the official visual language while moving the public application to a static Cloudflare Worker deployment and keeping all privileged operations in the VPS APIs.

The administration interface is intentionally maintained in the separate sibling repository `../auction-admin-lab`. The backend is in `../emirates-auction-api`.

## Architecture

- Next.js static export (`out/`) for fast edge delivery.
- Cloudflare Worker BFF on `/api/*`; browser cookies remain same-origin and API secrets never enter the bundle.
- Auth, auction and payment namespaces are served by the VPS API.
- AED is the accounting/display currency. Crypto conversion and payment destinations come only from the configured payment provider.
- Worker preview hosts receive `noindex`; the future production hostname is indexable with canonical metadata.

## Local preview

```sh
npm ci
npm run build
npx wrangler dev --port 3000 \
  --var API_BASE_URL:http://127.0.0.1:18800 \
  --var UPSTREAM_ORIGIN:https://official.emiratesauction.workers.dev
```

`API_BASE_URL` must be HTTPS outside localhost. Production uses the dedicated TLS reverse-proxy hostname for the isolated VPS API. `INTERNAL_API_TOKEN` is a Worker secret and must match the VPS API configuration; never commit it.

## Validation

```sh
npm run typecheck
npm test
npm run build
```

The public flows include catalog/categories, login and phone registration, account wallet/bid/invoice history, variable lot deposits, bidding, add-funds rail selection, invoice payment instructions, winner popup and withdrawals. A live payment instruction is deliberately unavailable until provider credentials are configured on the VPS.

## Connected wallet checkout

EVM, TRON and Solana share a single Universal Provider and the official WalletConnect modal. The catalog is filtered to the selected chain; changing chains refreshes its wallet list. Connection cancellation, loading timeouts and explicit errors keep the checkout retryable. The Worker CSP permits only the required WalletConnect catalog/relay/verification origins and the public TRON/Solana transaction RPCs.

Payment amounts come exclusively from the server-owned `wallet_request.amount_atomic`. TRON signing negotiates the legacy nested payload or the v1 payload according to the approved session; unsigned or modified transactions are rejected before broadcast. An external exchange may not accept an amount-bearing payment URI, so its transfer screen still needs the exact amount shown by the platform. Settlement always requires the listener to reconcile the actual transfer.

Browser QA must use `wrangler dev` after building, so it includes the production security headers. A Next.js-only preview cannot validate Worker CSP behavior. Wallet selection/QR rendering is distinct from a real wallet signature and on-chain settlement test.
