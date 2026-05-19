# Shared Backlog

Cross-cutting backlog items that should stay visible across provider integrations.

## v1 product direction

**Aperture Terminal v1 = read-only market intelligence terminal.**

The product should not become a worse single-venue prediction market frontend. With Alpha, Polymarket, Kalshi, and Limitless in scope, the core value is unified visibility into fragmented markets: normalization, querying, signal detection, venue comparison, and operator workflow.

### v1 principles
- Build for discovery and intelligence, not execution.
- Keep v1 read-only: no trading, wallet management, private portfolio, social layer, or mobile-first UX.
- Make cross-venue normalization the killer feature: one conceptual market can contain multiple venue markets, quotes, liquidity profiles, and signals.
- Treat the terminal as a desktop operator tool with dense tables, fast filtering, structured outputs, and inspectable market detail.
- Keep the LLM/query layer constrained to market queries that return tables, signals, and structured summaries rather than general-purpose chat.

### v1 pillars
- **Unified Market Explorer:** canonical market surface across Alpha, Polymarket, Kalshi, and Limitless with dense table, text search, natural-language query, venue, probability, liquidity, volume, spread, category, expiry, and signal flags.
- **Scanner:** opportunity/anomaly workflow for spreads, YES/NO parity, cross-venue divergence, stale pricing, and reward opportunities.
- **Market Inspector:** detail view for a selected market with probability history, venue comparison, liquidity, movement, related markets, signals, and event metadata.
- **Query Console:** constrained market intelligence interface for prompts like `show BTC markets expiring this week`, `find largest venue disagreements`, and `which markets moved most today`.
- **Venue Layer:** infrastructure-feeling provider view for venue health, indexed counts, sync status, liquidity metrics, latency, fee structures, and API health.

### v1 navigation
- Keep: Overview, Markets, Scanner, Signals, Venues, Watchlists, Alerts, Workspace.
- Remove or defer Portfolio until trading/private account support exists.
- Treat Watchlists as a read-only discovery aid, not account/position management.

### v1 data model direction
- Build normalized entities around `MarketCluster`, `VenueMarket`, `OutcomeQuote`, `Signal`, `Venue`, and `ProbabilitySnapshot`.
- Avoid letting platform-specific market types become the app model; provider clients should map into normalized domain entities.
- Store enough history to support movement, stale pricing, divergence, alerting, and inspector timelines.

### v1 killer workflow
- User opens Scanner.
- User sees cross-venue divergence.
- User opens Market Inspector.
- User compares venue probabilities and liquidity.
- User uses Query Console to explore related markets.
- User sets a read-only alert/watchlist item.

## App integration review (frontend + backend)

Current state: read-only market terminal with two implemented pages (`/`, `/markets`), backend REST aggregation, and frontend 3-minute polling. The app has provider market scans, but no normalized market-cluster layer, inspector page, query console, realtime backend stream, or route coverage for most v1 nav items.

### Mock/static data still in use
- Replace frontend fallback data in `src/lib/mock/markets.ts` and `src/lib/context/marketData.ts` with an explicit empty/error state once backend availability is required.
- Surface `$marketData.error` in the UI so missing `PUBLIC_API_BASE_URL` or failed API calls do not silently look like live data.
- Move domain view types (`SignalRow`, `Stat`) out of `$lib/mock/markets` into shared frontend types.
- ~~Decide whether `/api/dashboard` or frontend `buildDashboardFromMarketSnapshot` is the single dashboard source~~ — **Done:** `/api/markets` is the backend contract; Overview dashboard UI is built client-side via `buildDashboardFromMarketSnapshot`. Removed `/api/dashboard` and backend dashboard builders.
- ~~Replace synthesized values in `backend/src/services/markets.ts` (`updated: 'just now'`, heuristic expiry, liquidity proxy) with provider-native timestamps/fields where available.~~ — **Done:** rows now use venue volume/liquidity, native expiry/close times, and relative `updated` from provider timestamps (fallback: scan time).
- Replace fixed probability-drift sparkline and reused 1h/24h edge heuristics with real historical samples.
- ~~Deduplicate backend `fallback.ts` and frontend mock fixtures~~ — backend `fallback.ts` removed with dashboard endpoint; frontend mock fixtures already removed.

### Missing pages and route coverage
- Implement routes for v1 nav items currently missing or disabled: Scanner, Signals, Venues, Watchlists, Alerts, Workspace.
- Prioritize Markets, Scanner, Signals, and Market Inspector because they define the read-only intelligence workflow.
- Add a Venues page for provider health, API errors, indexed counts, last sync/freshness, and provider-specific status.
- Add Watchlists and Alerts after signal persistence or notification delivery exists.
- Defer Portfolio until trading/private account support exists.
- Decide whether `/` remains the authenticated terminal overview or whether a separate marketing landing page is needed.

### Wallet, identity, and private access (defer for v1)
- Do not add wallet connection or private account flows to v1 unless required for read-only watchlists/alerts.
- If watchlists/alerts need persistence, start with lightweight user/session identity rather than venue wallet execution.
- Keep provider secrets server-side only; never expose Kalshi/Limitless/venue API credentials to the Svelte app.
- Preserve read-only/demo mode as the default terminal experience.
- Revisit wallet/session architecture for v1.5 trading/private portfolio work.

### Realtime and freshness
- Move provider realtime integrations into the backend, then fan out normalized updates to the frontend via WebSocket or SSE.
- Use Limitless Socket.IO and Kalshi authenticated WebSocket work as the first provider-specific realtime tracks.
- Keep frontend 3-minute polling as a fallback, but show last successful refresh and stale-data warnings.
- Add reconnect, stale-connection detection, and metrics for provider streams.

### Backend API gaps
- Add single-market detail and orderbook-depth endpoints for drilldowns.
- Add scanner endpoints for parity gaps, reward lanes, stale markets, and low-liquidity warnings.
- Add market-cluster and venue-comparison endpoints to support cross-venue normalization.
- Add query-console endpoints that return structured market tables, signal sets, or summaries.
- Defer portfolio, positions, open orders, and order lifecycle endpoints until v1.5 auth/wallet work.
- ~~Align `DashboardApiResponse.meta` with `MarketsApiResponse.meta`~~ — moot after dashboard endpoint removal; frontend reads `MarketsApiResponse.meta` including Limitless.
- Add persistence for Kalshi/Limitless status/history if they need freshness, drift, or alerting views.

### Suggested build order
- First: expose API/config errors in the frontend, align dashboard source/meta, add Limitless to dashboard health, and remove/defer Portfolio from v1 nav.
- Second: introduce normalized market-cluster/domain models and build Markets, Scanner, Signals, and Market Inspector around them.
- Third: add real freshness/history models for drift, stale pricing, cross-venue divergence, watchlists, and alerts.
- Fourth: add constrained Query Console for structured market queries.
- Fifth: revisit wallet/session/private provider auth as v1.5 after discovery workflows are strong.

## Kalshi (deferred, authenticated)

### API key lifecycle and secure storage
- Add `KALSHI_API_KEY_ID` and `KALSHI_PRIVATE_KEY_PATH` backend env support.
- Store private key material outside the repository and load via secure runtime secret paths.
- Add startup validation so authenticated mode fails fast with clear config errors.
- Document local, staging, and production key rotation procedures.

### Auth signing implementation
- Implement `KALSHI-ACCESS-KEY`, `KALSHI-ACCESS-TIMESTAMP`, and `KALSHI-ACCESS-SIGNATURE` headers for private REST routes.
- Build a shared signer utility that uses RSA-PSS + SHA256 and signs `timestamp + method + path_without_query`.
- Add tests for signature generation correctness and timestamp skew handling.
- Add retry/backoff policy for `401`, `403`, and temporary network errors.

### Authenticated WebSocket support
- Add authenticated WebSocket handshake support for `wss://external-api-ws.kalshi.com/trade-api/ws/v2`.
- Implement subscription lifecycle helpers (`subscribe`, `unsubscribe`, reconnect, resubscribe).
- Start with market data channels, then add private channels for account/order updates.
- Add reconnection telemetry and stale-connection detection.

### Trading/private endpoint support
- Add private portfolio/order clients for balances, positions, open orders, create/cancel/amend flows.
- Implement idempotency and client-order-id conventions for safe retries.
- Map private Kalshi responses into internal execution and portfolio models.
- Add guardrails for dry-run/paper mode before enabling live order placement.

### Rate-limit strategy
- Implement token-bucket-aware request scheduler for separate read/write budgets.
- Add exponential backoff on `429` responses and queue draining when budget refills.
- Capture per-endpoint token cost assumptions in code comments and docs.
- Add metrics for request rate, `429`s, and dropped/queued operations.

## Limitless (deferred, authenticated + realtime)

Current state: public REST market scan only (`backend/src/limitless/client.ts` → `/api/markets`). No scoped-token auth, no WebSocket. Docs: [Authentication](https://docs.limitless.exchange/developers/authentication), [WebSocket](https://docs.limitless.exchange/developers/quickstart/websocket).

### Scoped token lifecycle and secure storage
- Add `LIMITLESS_TOKEN_ID` and `LIMITLESS_TOKEN_SECRET` (base64, one-time at derive) backend env support.
- Document token derivation via `POST /auth/api-tokens/derive` (Privy `identity` bearer) and required scopes (`trading` minimum for private flows).
- Store secrets outside the repository; fail fast at startup when authenticated mode is enabled but credentials are missing.
- Support optional legacy `LIMITLESS_API_KEY` (`X-API-Key`) for WebSocket auth during migration; plan deprecation in favor of scoped tokens for REST.

### HMAC request signing (REST)
- Implement shared signer for `lmts-api-key`, `lmts-timestamp`, `lmts-signature` headers.
- Sign canonical message: `{ISO-8601 timestamp}\n{METHOD}\n{path with query}\n{body}` using HMAC-SHA256 over base64-decoded secret.
- Enforce 30-second clock skew tolerance; add tests for path+query and empty-body GET cases.
- Wire signer into authenticated Limitless REST clients (orders, portfolio, withdrawals) behind a feature flag.

### WebSocket integration (`wss://ws.limitless.exchange`, namespace `/markets`)
- Add backend Socket.IO client (WebSocket transport only, no polling) with connect/disconnect lifecycle.
- **Public mode:** subscribe to `subscribe_market_prices` (`marketAddresses` / `marketSlugs`); handle `newPriceData`, `orderbookUpdate`, `system`, `exception`.
- **Authenticated mode:** pass `X-API-Key` (or successor auth header per Limitless docs) on connect; handle `authenticated`; support `subscribe_positions` and `positions` events.
- Implement reconnect + resubscribe on `connect` (subscriptions are not persisted server-side).
- Map live price/orderbook updates into internal market snapshot models and expose freshness to the frontend (reduce reliance on 3-minute REST polling for Limitless rows).
- Add stale-connection detection, backoff, and metrics (connected, reconnect count, last event age).

### Trading and private REST (post-auth)
- Add private clients for order placement/cancel, balances, and positions using HMAC-signed routes.
- Map Limitless order/position payloads into internal execution and portfolio models.
- Add dry-run/paper guardrails before enabling live order placement.
- Align Ethereum address fields with EIP-55 checksummed format in requests.
