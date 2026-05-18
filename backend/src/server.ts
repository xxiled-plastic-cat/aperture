import 'dotenv/config';

import cors from 'cors';
import express from 'express';

import { buildDashboardResponse } from './services/dashboard';

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

app.listen(port, () => {
	console.log(`Aperture backend listening on http://localhost:${port}`);
});
