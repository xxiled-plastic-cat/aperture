import 'dotenv/config';

import cors from 'cors';
import express from 'express';

import { loadAlphaApiSnapshot } from './alpha/client';
import { loadAlphaDbSnapshot } from './alpha/db';
import { loadKalshiApiSnapshot } from './kalshi/client';
import { loadLimitlessApiSnapshot } from './limitless/client';
import { loadPolymarketApiSnapshot } from './polymarket/client';
import { loadPolymarketDbSnapshot } from './polymarket/db';
import { buildDashboardResponse } from './services/dashboard';
import { buildMarketsResponse } from './services/markets';

const app = express();
const port = Number(process.env.PORT ?? 8787);
const corsOrigin = process.env.CORS_ORIGIN ?? '*';

app.use(cors({ origin: corsOrigin }));
app.use(express.json());

app.get('/api/health', async (_req, res) => {
	const dashboard = await buildDashboardResponse();
	res.json({
		ok: true,
		service: 'aperture-backend',
		meta: dashboard.meta,
		feedMode: dashboard.feedMode
	});
});

app.get('/api/dashboard', async (_req, res) => {
	try {
		const dashboard = await buildDashboardResponse();
		res.json(dashboard);
	} catch (error) {
		res.status(500).json({
			ok: false,
			error: error instanceof Error ? error.message : 'Unknown dashboard error'
		});
	}
});

app.get('/api/markets', async (_req, res) => {
	try {
		const markets = await buildMarketsResponse();
		res.json(markets);
	} catch (error) {
		res.status(500).json({
			ok: false,
			error: error instanceof Error ? error.message : 'Unknown markets error'
		});
	}
});

app.get('/api/markets/status/alpha', async (_req, res) => {
	try {
		const dbSnapshot = await loadAlphaDbSnapshot();
		const snapshot = await loadAlphaApiSnapshot(dbSnapshot.liveMarkets);
		res.json({
			venue: 'Alpha',
			ok: snapshot.ok,
			marketsIndexed: snapshot.markets.length,
			error: snapshot.error
		});
	} catch (error) {
		res.status(500).json({
			venue: 'Alpha',
			ok: false,
			error: error instanceof Error ? error.message : 'Unknown Alpha status error'
		});
	}
});

app.get('/api/markets/status/polymarket', async (_req, res) => {
	try {
		const dbSnapshot = await loadPolymarketDbSnapshot();
		const snapshot = await loadPolymarketApiSnapshot(dbSnapshot.liveMarkets);
		res.json({
			venue: 'Polymarket',
			ok: snapshot.ok,
			marketsIndexed: snapshot.markets.length,
			error: snapshot.error
		});
	} catch (error) {
		res.status(500).json({
			venue: 'Polymarket',
			ok: false,
			error: error instanceof Error ? error.message : 'Unknown Polymarket status error'
		});
	}
});

app.get('/api/markets/status/kalshi', async (_req, res) => {
	try {
		const snapshot = await loadKalshiApiSnapshot();
		res.json({
			venue: 'Kalshi',
			ok: snapshot.ok,
			marketsIndexed: snapshot.markets.length,
			error: snapshot.error
		});
	} catch (error) {
		res.status(500).json({
			venue: 'Kalshi',
			ok: false,
			error: error instanceof Error ? error.message : 'Unknown Kalshi status error'
		});
	}
});

app.get('/api/markets/status/limitless', async (_req, res) => {
	try {
		const snapshot = await loadLimitlessApiSnapshot();
		res.json({
			venue: 'Limitless',
			ok: snapshot.ok,
			marketsIndexed: snapshot.markets.length,
			error: snapshot.error
		});
	} catch (error) {
		res.status(500).json({
			venue: 'Limitless',
			ok: false,
			error: error instanceof Error ? error.message : 'Unknown Limitless status error'
		});
	}
});

app.listen(port, () => {
	console.log(`Aperture backend listening on http://localhost:${port}`);
});
