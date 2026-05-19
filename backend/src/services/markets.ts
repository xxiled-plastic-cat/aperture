import { loadAlphaApiSnapshot } from '../alpha/client';
import { loadAlphaDbSnapshot } from '../alpha/db';
import { loadKalshiApiSnapshot, type KalshiMarket } from '../kalshi/client';
import { loadLimitlessApiSnapshot, type LimitlessMarket } from '../limitless/client';
import { loadPolymarketDbSnapshot } from '../polymarket/db';
import { loadPolymarketApiSnapshot, type PolymarketMarket } from '../polymarket/client';
import type { AlphaMarket, MarketCategory, MarketRow, MarketSignal, MarketsApiResponse, Venue } from '../types';
import {
	formatExpiryLabelFromIso,
	formatExpiryLabelFromUnixSeconds,
	formatUpdatedLabel,
	roundUsd
} from './marketRowFormat';

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

type RowFieldInput = {
	id: string;
	name: string;
	venue: Venue;
	category?: MarketCategory;
	yesPrice: number | null;
	noPrice: number | null;
	volumeUsd: number | null;
	liquidityUsd: number | null;
	dailyRewardsUsd: number | null;
	isResolved: boolean | null;
	expiryLabel: string;
	updatedAtIso: string | null;
};

const mapCommonRow = (input: RowFieldInput, fetchedAtIso: string): MarketRow => {
	const hasTwoSidedPrices = input.yesPrice !== null && input.noPrice !== null;
	const safeYes = input.yesPrice ?? 0.5;
	const safeNo = input.noPrice ?? Math.max(0, 1 - safeYes);
	const spread = Math.max(0, Math.abs(1 - safeYes - safeNo) * 100);
	const reward = (input.dailyRewardsUsd ?? 0) > 0;
	const signals = toSignals(
		{
			dailyRewardsUsd: input.dailyRewardsUsd,
			liquidityUsd: input.liquidityUsd,
			isResolved: input.isResolved,
			yesPrice: safeYes,
			noPrice: safeNo
		},
		spread,
		hasTwoSidedPrices
	);

	return {
		id: input.id,
		name: input.name,
		venue: input.venue,
		category: input.category ?? categoryFromTitle(input.name),
		yesPrice: Number(safeYes.toFixed(2)),
		noPrice: Number(safeNo.toFixed(2)),
		spread: Number(spread.toFixed(1)),
		volume: roundUsd(input.volumeUsd),
		liquidity: roundUsd(input.liquidityUsd),
		reward,
		expiry: input.expiryLabel,
		signals,
		updated: formatUpdatedLabel(input.updatedAtIso, fetchedAtIso)
	};
};

const alphaExpiryLabel = (market: AlphaMarket): string => {
	const fromEndTs = formatExpiryLabelFromUnixSeconds(market.endTs);
	return fromEndTs !== 'n/a' ? fromEndTs : 'n/a';
};

const toAlphaMarketRow = (market: AlphaMarket, fetchedAtIso: string): MarketRow =>
	mapCommonRow(
		{
			id: market.id,
			name: market.title,
			venue: 'Alpha',
			yesPrice: market.yesPrice,
			noPrice: market.noPrice,
			volumeUsd: market.volumeUsd,
			liquidityUsd: market.liquidityUsd,
			dailyRewardsUsd: market.dailyRewardsUsd,
			isResolved: market.isResolved,
			expiryLabel: alphaExpiryLabel(market),
			updatedAtIso: market.updatedAtIso
		},
		fetchedAtIso
	);

const toPolymarketRow = (market: PolymarketMarket, fetchedAtIso: string): MarketRow =>
	mapCommonRow(
		{
			id: market.id,
			name: market.title,
			venue: 'Polymarket',
			yesPrice: market.yesPrice,
			noPrice: market.noPrice,
			volumeUsd: market.volumeUsd,
			liquidityUsd: market.liquidityUsd,
			dailyRewardsUsd: market.dailyRewardsUsd,
			isResolved: market.isResolved,
			expiryLabel: formatExpiryLabelFromIso(market.endDateIso),
			updatedAtIso: market.updatedAtIso
		},
		fetchedAtIso
	);

const toKalshiRow = (market: KalshiMarket, fetchedAtIso: string): MarketRow =>
	mapCommonRow(
		{
			id: market.id,
			name: market.title,
			venue: 'Kalshi',
			yesPrice: market.yesPrice,
			noPrice: market.noPrice,
			volumeUsd: market.volumeUsd,
			liquidityUsd: market.liquidityUsd,
			dailyRewardsUsd: market.dailyRewardsUsd,
			isResolved: market.isResolved,
			expiryLabel: formatExpiryLabelFromIso(market.closeTimeIso),
			updatedAtIso: market.updatedTimeIso
		},
		fetchedAtIso
	);

const toLimitlessRow = (market: LimitlessMarket, fetchedAtIso: string): MarketRow =>
	mapCommonRow(
		{
			id: market.slug,
			name: market.title,
			venue: 'Limitless',
			category: categoryFromLimitless(market),
			yesPrice: market.yesPrice,
			noPrice: market.noPrice,
			volumeUsd: market.volumeUsd,
			liquidityUsd: market.liquidityUsd,
			dailyRewardsUsd: market.dailyRewardsUsd,
			isResolved: market.isResolved,
			expiryLabel: market.expiryLabel,
			updatedAtIso: market.updatedAtIso
		},
		fetchedAtIso
	);

export const buildMarketsResponse = async (): Promise<MarketsApiResponse> => {
	const fetchedAtIso = new Date().toISOString();
	const dbSnapshot = await loadAlphaDbSnapshot();
	const polyDbSnapshot = await loadPolymarketDbSnapshot();
	const apiSnapshot = await loadAlphaApiSnapshot(dbSnapshot.liveMarkets).catch(() => ({
		markets: [],
		orderbooks: new Map(),
		fetchedAtIso,
		ok: false,
		error: 'Failed to load Alpha API snapshot'
	}));
	const polySnapshot = await loadPolymarketApiSnapshot(polyDbSnapshot.liveMarkets).catch(() => ({
		markets: [],
		fetchedAtIso,
		ok: polyDbSnapshot.liveMarkets.length > 0,
		error: 'Failed to load Polymarket API snapshot'
	}));
	const kalshiSnapshot = await loadKalshiApiSnapshot().catch(() => ({
		markets: [],
		fetchedAtIso,
		ok: false,
		error: 'Failed to load Kalshi API snapshot'
	}));
	const limitlessSnapshot = await loadLimitlessApiSnapshot().catch(() => ({
		markets: [],
		fetchedAtIso,
		ok: false,
		error: 'Failed to load Limitless API snapshot'
	}));

	const alphaMarkets = apiSnapshot.markets.map((market) => toAlphaMarketRow(market, fetchedAtIso));
	const polyMarkets = polySnapshot.markets.map((market) => toPolymarketRow(market, fetchedAtIso));
	const kalshiMarkets = kalshiSnapshot.markets.map((market) => toKalshiRow(market, fetchedAtIso));
	const limitlessMarkets = limitlessSnapshot.markets.map((market) => toLimitlessRow(market, fetchedAtIso));
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
			fetchedAtIso
		}
	};
};
