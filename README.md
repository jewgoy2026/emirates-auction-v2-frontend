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

The login modal includes UAE Pass. Until official service-provider credentials are supplied, the button reports that onboarding configuration is pending. Once enabled, the same button starts the OAuth flow through the Worker callback while the `client_secret` remains only on the VPS.
