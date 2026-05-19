import { and, desc, eq, sql } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';

import { alphaMarketStatus, botStates } from '../../drizzle/schema';
import type {
	AlphaBotStateSummary,
	AlphaDbLiveMarket,
	AlphaDbSnapshot,
	AlphaMarketStatusSummary
} from '../types';

const toNumber = (value: unknown): number | null => {
	if (typeof value === 'number' && Number.isFinite(value)) return value;
	if (typeof value === 'string' && value.trim()) {
		const parsed = Number(value);
		return Number.isFinite(parsed) ? parsed : null;
	}
	return null;
};

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

const normalizeBotState = (state: unknown): AlphaBotStateSummary | null => {
	if (!state || typeof state !== 'object') return null;
	const row = state as Record<string, unknown>;
	return {
		cash: toNumber(row.cash),
		realisedPnl: toNumber(row.realisedPnl),
		unrealisedPnl: toNumber(row.unrealisedPnl),
		totalPnl: toNumber(row.totalPnl),
		estimatedRewardsUsd: toNumber(row.estimatedRewardsUsd),
		lastUpdated: typeof row.lastUpdated === 'string' ? row.lastUpdated : null
	};
};

const loadBotState = async (db: ReturnType<typeof drizzle>): Promise<AlphaBotStateSummary | null> => {
	const stateKey = process.env.ALPHA_STATE_KEY || 'alpha';
	const result = await db
		.select({ state: botStates.state })
		.from(botStates)
		.where(eq(botStates.key, stateKey))
		.limit(1);
	return normalizeBotState(result.at(0)?.state);
};

const loadMarketStatusSummary = async (
	db: ReturnType<typeof drizzle>
): Promise<AlphaMarketStatusSummary | null> => {
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
    from alpha_market_status`);
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

const loadLiveMarkets = async (db: ReturnType<typeof drizzle>): Promise<AlphaDbLiveMarket[]> => {
	const limit = Number(process.env.ALPHA_DB_LIVE_MARKETS_LIMIT ?? 1000);
	const result = await db
		.select({
			marketAppId: alphaMarketStatus.marketAppId,
			marketId: alphaMarketStatus.marketId,
			slug: alphaMarketStatus.slug,
			lastSeenAt: alphaMarketStatus.lastSeenAt,
			endTs: alphaMarketStatus.endTs,
			closeTime: alphaMarketStatus.closeTime
		})
		.from(alphaMarketStatus)
		.where(and(eq(alphaMarketStatus.isLive, true), eq(alphaMarketStatus.isResolved, false)))
		.orderBy(desc(alphaMarketStatus.lastSeenAt))
		.limit(limit);

	return result
		.map((row) => {
			const marketAppId = toNumber(row.marketAppId);
			if (marketAppId === null) return null;
			return {
				marketAppId,
				marketId: row.marketId ?? null,
				slug: row.slug ?? null,
				lastSeenAt: row.lastSeenAt ? row.lastSeenAt.toISOString() : null,
				endTs: toNumber(row.endTs),
				closeTime: row.closeTime ? row.closeTime.toISOString() : null
			} satisfies AlphaDbLiveMarket;
		})
		.filter((row): row is AlphaDbLiveMarket => row !== null);
};

export const loadAlphaDbSnapshot = async (): Promise<AlphaDbSnapshot> => {
	const db = getDb();
	if (!db) {
		return {
			botState: null,
			marketStatus: null,
			liveMarkets: [],
			ok: false,
			error: 'DATABASE_URL is not configured'
		};
	}

	try {
		const [botState, marketStatus, liveMarkets] = await Promise.all([
			loadBotState(db).catch(() => null),
			loadMarketStatusSummary(db).catch(() => null),
			loadLiveMarkets(db).catch(() => [])
		]);
		return {
			botState,
			marketStatus,
			liveMarkets,
			ok: botState !== null || marketStatus !== null || liveMarkets.length > 0,
			error:
				botState === null && marketStatus === null && liveMarkets.length === 0
					? 'No Alpha DB rows found'
					: undefined
		};
	} catch (error) {
		return {
			botState: null,
			marketStatus: null,
			liveMarkets: [],
			ok: false,
			error: error instanceof Error ? error.message : 'Unknown DB error'
		};
	}
};
