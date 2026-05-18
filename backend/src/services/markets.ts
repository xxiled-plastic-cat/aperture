import { loadAlphaApiSnapshot } from '../alpha/client';
import { loadAlphaDbSnapshot } from '../alpha/db';
import { loadKalshiApiSnapshot, type KalshiMarket } from '../kalshi/client';
import { loadLimitlessApiSnapshot, type LimitlessMarket } from '../limitless/client';
import { loadPolymarketDbSnapshot } from '../polymarket/db';
import { loadPolymarketApiSnapshot, type PolymarketMarket } from '../polymarket/client';
import type { AlphaMarket, MarketCategory, MarketRow, MarketSignal, MarketsApiResponse, Venue } from '../types';

const formatUtcTimestamp = (date: Date): string =>
	date.toISOString().replace('T', ' ').replace('Z', ' UTC');

const LIMITLESS_CATEGORY_ALIASES: Record<string, MarketCategory> = {
	crypto: 'Crypto',
	bitcoin: 'Crypto',
	ethereum: 'Crypto',
	solana: 'Crypto',
	xrp: 'Crypto',
	sports: 'Sports',
	sport: 'Sports',
	politics: 'Politics',
	politic: 'Politics',
	finance: 'Macro',
	macro: 'Macro',
	culture: 'Culture',
	tech: 'Tech',
	'esports': 'Tech',
	esport: 'Tech'
};

const categoryFromLimitless = (market: LimitlessMarket): MarketCategory => {
	if (market.assetType?.trim().toUpperCase() === 'CRYPTO') return 'Crypto';

	for (const category of market.categories) {
		const normalized = category.trim().toLowerCase();
		const mapped = LIMITLESS_CATEGORY_ALIASES[normalized];
		if (mapped) return mapped;
	}

	return categoryFromTitle(market.title);
};

const categoryFromTitle = (title: string): MarketCategory => {
	const normalized = title.toLowerCase();
	if (
		/(bitcoin|btc|eth|ethereum|solana|sol\b|bnb|xrp|doge|hype|ondo|bch|xmr|crypto|token|defi|altcoin|up or down)/.test(
			normalized
		)
	)
		return 'Crypto';
	if (/(election|senate|president|government|parliament|vote|politic)/.test(normalized))
		return 'Politics';
	if (/(fed|cpi|inflation|gdp|oil|rate|macro|yield|recession)/.test(normalized)) return 'Macro';
	if (/(oscar|eurovision|culture|movie|series|music|festival|celebrity)/.test(normalized))
		return 'Culture';
	if (/(openai|ai |apple|nvidia|tesla|tech|gpt|meta|microsoft|google)/.test(normalized))
		return 'Tech';
	return 'Sports';
};

const toSignals = (
	market: Pick<AlphaMarket, 'dailyRewardsUsd' | 'liquidityUsd' | 'isResolved' | 'yesPrice' | 'noPrice'>,
	spreadPct: number,
	hasTwoSidedPrices: boolean
): MarketSignal[] => {
	const signals: MarketSignal[] = [];
	const hasReward = (market.dailyRewardsUsd ?? 0) > 0;
	const lowLiquidity = (market.liquidityUsd ?? 0) > 0 && (market.liquidityUsd ?? 0) < 300;

	if (spreadPct >= 3) signals.push('SPREAD');
	if (hasTwoSidedPrices && market.yesPrice !== null && market.noPrice !== null && spreadPct > 0) {
		signals.push('PARITY');
	}
	if (hasReward) signals.push('REWARD');
	if (lowLiquidity) signals.push('LOW LIQ');
	if (market.isResolved === true) signals.push('STALE');
	if (signals.length === 0) signals.push('NONE');
	return signals;
};

const mapCommonRow = ({
	id,
	name,
	venue,
	category,
	yesPrice,
	noPrice,
	liquidityUsd,
	dailyRewardsUsd,
	isResolved
}: {
	id: string;
	name: string;
	venue: Venue;
	category?: MarketCategory;
	yesPrice: number | null;
	noPrice: number | null;
	liquidityUsd: number | null;
	dailyRewardsUsd: number | null;
	isResolved: boolean | null;
}): MarketRow => {
	const hasTwoSidedPrices = yesPrice !== null && noPrice !== null;
	const safeYes = yesPrice ?? 0.5;
	const safeNo = noPrice ?? Math.max(0, 1 - safeYes);
	const spread = Math.max(0, Math.abs(1 - safeYes - safeNo) * 100);
	const reward = (dailyRewardsUsd ?? 0) > 0;
	const signals = toSignals(
		{
			dailyRewardsUsd,
			liquidityUsd,
			isResolved,
			yesPrice: safeYes,
			noPrice: safeNo
		},
		spread,
		hasTwoSidedPrices
	);
	return {
		id,
		name,
		venue,
		category: category ?? categoryFromTitle(name),
		yesPrice: Number(safeYes.toFixed(2)),
		noPrice: Number(safeNo.toFixed(2)),
		spread: Number(spread.toFixed(1)),
		volume: Math.max(0, Math.round(liquidityUsd ?? 0)),
		liquidity: Math.max(0, Math.round((liquidityUsd ?? 0) * 0.2)),
		reward,
		expiry: reward ? '14d' : '30d',
		signals,
		updated: 'just now'
	};
};

const toAlphaMarketRow = (market: AlphaMarket): MarketRow => {
	return mapCommonRow({
		id: market.id,
		name: market.title,
		venue: 'Alpha',
		yesPrice: market.yesPrice,
		noPrice: market.noPrice,
		liquidityUsd: market.liquidityUsd,
		dailyRewardsUsd: market.dailyRewardsUsd,
		isResolved: market.isResolved
	});
};

const toPolymarketRow = (market: PolymarketMarket): MarketRow => {
	return mapCommonRow({
		id: market.id,
		name: market.title,
		venue: 'Polymarket',
		yesPrice: market.yesPrice,
		noPrice: market.noPrice,
		liquidityUsd: market.liquidityUsd ?? market.volumeUsd ?? null,
		dailyRewardsUsd: market.dailyRewardsUsd,
		isResolved: market.isResolved
	});
};

const toKalshiRow = (market: KalshiMarket): MarketRow => {
	return mapCommonRow({
		id: market.id,
		name: market.title,
		venue: 'Kalshi',
		yesPrice: market.yesPrice,
		noPrice: market.noPrice,
		liquidityUsd: market.liquidityUsd ?? market.volumeUsd,
		dailyRewardsUsd: market.dailyRewardsUsd,
		isResolved: market.isResolved
	});
};

const toLimitlessRow = (market: LimitlessMarket): MarketRow => {
	const row = mapCommonRow({
		id: market.slug,
		name: market.title,
		venue: 'Limitless',
		category: categoryFromLimitless(market),
		yesPrice: market.yesPrice,
		noPrice: market.noPrice,
		liquidityUsd: market.liquidityUsd ?? market.volumeUsd,
		dailyRewardsUsd: market.dailyRewardsUsd,
		isResolved: market.isResolved
	});
	return {
		...row,
		expiry: market.expiryLabel
	};
};

export const buildMarketsResponse = async (): Promise<MarketsApiResponse> => {
	const dbSnapshot = await loadAlphaDbSnapshot();
	const polyDbSnapshot = await loadPolymarketDbSnapshot();
	const apiSnapshot = await loadAlphaApiSnapshot(dbSnapshot.liveMarkets).catch(() => ({
		markets: [],
		orderbooks: new Map(),
		fetchedAtIso: new Date().toISOString(),
		ok: false,
		error: 'Failed to load Alpha API snapshot'
	}));
	const polySnapshot = await loadPolymarketApiSnapshot(polyDbSnapshot.liveMarkets).catch(() => ({
		markets: [],
		fetchedAtIso: new Date().toISOString(),
		ok: polyDbSnapshot.liveMarkets.length > 0,
		error: 'Failed to load Polymarket API snapshot'
	}));
	const kalshiSnapshot = await loadKalshiApiSnapshot().catch(() => ({
		markets: [],
		fetchedAtIso: new Date().toISOString(),
		ok: false,
		error: 'Failed to load Kalshi API snapshot'
	}));
	const limitlessSnapshot = await loadLimitlessApiSnapshot().catch(() => ({
		markets: [],
		fetchedAtIso: new Date().toISOString(),
		ok: false,
		error: 'Failed to load Limitless API snapshot'
	}));

	const alphaMarkets = apiSnapshot.markets.map(toAlphaMarketRow);
	const polyMarkets = polySnapshot.markets.map(toPolymarketRow);
	const kalshiMarkets = kalshiSnapshot.markets.map(toKalshiRow);
	const limitlessMarkets = limitlessSnapshot.markets.map(toLimitlessRow);
	const markets = [...alphaMarkets, ...polyMarkets, ...kalshiMarkets, ...limitlessMarkets].sort(
		(a, b) => b.volume - a.volume
	);
	const hasAlpha = apiSnapshot.ok && alphaMarkets.length > 0;
	const hasPoly = polySnapshot.ok && polyMarkets.length > 0;
	const hasKalshi = kalshiSnapshot.ok && kalshiMarkets.length > 0;
	const hasLimitless = limitlessSnapshot.ok && limitlessMarkets.length > 0;
	const hasDbData =
		(dbSnapshot.ok && dbSnapshot.liveMarkets.length > 0) ||
		(polyDbSnapshot.ok && polyDbSnapshot.liveMarkets.length > 0);
	const liveVenueCount = [hasAlpha, hasPoly, hasKalshi, hasLimitless].filter(Boolean).length;
	const feedMode =
		liveVenueCount >= 4 ? 'LIVE' : liveVenueCount > 0 || hasDbData ? 'PARTIAL' : 'STATIC';
	const venues: Venue[] = [];
	if (alphaMarkets.length > 0) venues.push('Alpha');
	if (polyMarkets.length > 0) venues.push('Polymarket');
	if (kalshiMarkets.length > 0) venues.push('Kalshi');
	if (limitlessMarkets.length > 0) venues.push('Limitless');

	return {
		dashboardTimestamp: formatUtcTimestamp(new Date()),
		feedMode,
		venues,
		activeVenueCount: venues.length,
		marketsIndexed: markets.length,
		markets,
		meta: {
			alphaApiOk: apiSnapshot.ok,
			alphaApiError: apiSnapshot.error,
			alphaDbOk: dbSnapshot.ok,
			alphaDbError: dbSnapshot.error,
			alphaDbLiveMarkets: dbSnapshot.liveMarkets.length,
			polyDbOk: polyDbSnapshot.ok,
			polyDbError: polyDbSnapshot.error,
			polyDbLiveMarkets: polyDbSnapshot.liveMarkets.length,
			polyApiOk: polySnapshot.ok,
			polyApiError: polySnapshot.error,
			kalshiApiOk: kalshiSnapshot.ok,
			kalshiApiError: kalshiSnapshot.error,
			limitlessApiOk: limitlessSnapshot.ok,
			limitlessApiError: limitlessSnapshot.error,
			fetchedAtIso: new Date().toISOString()
		}
	};
};
