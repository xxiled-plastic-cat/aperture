import { and, desc, eq, sql } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';

import { polymarketMarketStatus } from '../../drizzle/schema';
import type {
	PolymarketDbLiveMarket,
	PolymarketDbSnapshot,
	PolymarketMarketStatusSummary
} from '../types';

const toIsoString = (value: unknown): string | null => {
	if (value instanceof Date) return value.toISOString();
	if (typeof value === 'string') return value;
	return null;
};

let client: postgres.Sql | null = null;

const getDb = () => {
	if (!process.env.DATABASE_URL) return null;
	if (!client) {
		client = postgres(process.env.DATABASE_URL, { prepare: false });
	}
	return drizzle(client);
};

const loadMarketStatusSummary = async (
	db: ReturnType<typeof drizzle>
): Promise<PolymarketMarketStatusSummary | null> => {
	const result = await db.execute(sql<{
		live_markets: number;
		resolved_markets: number;
		closed_markets: number;
		total_known_markets: number;
		last_seen_at: Date | null;
	}>`select
      coalesce(sum(case when is_live then 1 else 0 end), 0) as live_markets,
      coalesce(sum(case when is_resolved then 1 else 0 end), 0) as resolved_markets,
      coalesce(sum(case when is_closed then 1 else 0 end), 0) as closed_markets,
      coalesce(count(*), 0) as total_known_markets,
      max(last_seen_at) as last_seen_at
    from polymarket_market_status`);
	const row = result.at(0);
	if (!row) return null;
	return {
		liveMarkets: Number(row.live_markets ?? 0),
		resolvedMarkets: Number(row.resolved_markets ?? 0),
		closedMarkets: Number(row.closed_markets ?? 0),
		totalKnownMarkets: Number(row.total_known_markets ?? 0),
		lastSeenAt: toIsoString(row.last_seen_at)
	};
};

const loadLiveMarkets = async (db: ReturnType<typeof drizzle>): Promise<PolymarketDbLiveMarket[]> => {
	const limit = Number(process.env.POLY_DB_LIVE_MARKETS_LIMIT ?? 1000);
	const result = await db
		.select({
			conditionId: polymarketMarketStatus.conditionId,
			marketId: polymarketMarketStatus.marketId,
			marketSlug: polymarketMarketStatus.marketSlug,
			title: polymarketMarketStatus.title,
			lastSeenAt: polymarketMarketStatus.lastSeenAt
		})
		.from(polymarketMarketStatus)
		.where(
			and(
				eq(polymarketMarketStatus.isLive, true),
				eq(polymarketMarketStatus.isResolved, false),
				eq(polymarketMarketStatus.isClosed, false)
			)
		)
		.orderBy(desc(polymarketMarketStatus.lastSeenAt))
		.limit(limit);

	return result.map((row) => ({
		conditionId: row.conditionId,
		marketId: row.marketId ?? null,
		marketSlug: row.marketSlug ?? null,
		title: row.title ?? null,
		lastSeenAt: row.lastSeenAt ? row.lastSeenAt.toISOString() : null
	}));
};

export const loadPolymarketDbSnapshot = async (): Promise<PolymarketDbSnapshot> => {
	const db = getDb();
	if (!db) {
		return {
			marketStatus: null,
			liveMarkets: [],
			ok: false,
			error: 'DATABASE_URL is not configured'
		};
	}

	try {
		const [marketStatus, liveMarkets] = await Promise.all([
			loadMarketStatusSummary(db).catch(() => null),
			loadLiveMarkets(db).catch(() => [])
		]);
		return {
			marketStatus,
			liveMarkets,
			ok: marketStatus !== null || liveMarkets.length > 0,
			error: marketStatus === null && liveMarkets.length === 0 ? 'No Polymarket DB rows found' : undefined
		};
	} catch (error) {
		return {
			marketStatus: null,
			liveMarkets: [],
			ok: false,
			error: error instanceof Error ? error.message : 'Unknown DB error'
		};
	}
};
