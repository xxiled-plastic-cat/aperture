# Shared Backlog

Cross-cutting backlog items that should stay visible across provider integrations.

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
