import type { PolymarketDbLiveMarket } from '../types';

const DEFAULT_GAMMA_BASE_URL = 'https://gamma-api.polymarket.com';
const DEFAULT_CLOB_BASE_URL = 'https://clob.polymarket.com';
const DEFAULT_TIMEOUT_MS = 7000;
const DEFAULT_MAX_MARKETS = 200;
const GAMMA_PAGE_SIZE = 100;
const CLOB_REWARD_PAGE_SIZE = 100;

export type PolymarketMarket = {
	id: string;
	conditionId: string;
	slug: string;
	title: string;
	yesPrice: number | null;
	noPrice: number | null;
	liquidityUsd: number | null;
	volumeUsd: number | null;
	dailyRewardsUsd: number | null;
	isLive: boolean | null;
	isResolved: boolean | null;
};

export type PolymarketApiSnapshot = {
	markets: PolymarketMarket[];
	fetchedAtIso: string;
	ok: boolean;
	error?: string;
};

type RewardIndex = Map<string, number>;

const toStringValue = (value: unknown): string | null => {
	if (typeof value === 'string') {
		const trimmed = value.trim();
		return trimmed.length > 0 ? trimmed : null;
	}
	if (typeof value === 'number' && Number.isFinite(value)) return String(value);
	return null;
};

const toNumberValue = (value: unknown): number | null => {
	if (typeof value === 'number' && Number.isFinite(value)) return value;
	if (typeof value === 'string') {
		const parsed = Number(value);
		return Number.isFinite(parsed) ? parsed : null;
	}
	return null;
};

const toBooleanValue = (value: unknown): boolean | null => {
	if (typeof value === 'boolean') return value;
	if (typeof value === 'number') return value > 0;
	if (typeof value === 'string') {
		const normalized = value.trim().toLowerCase();
		if (normalized === 'true' || normalized === '1') return true;
		if (normalized === 'false' || normalized === '0') return false;
	}
	return null;
};

const normalizeProbability = (value: unknown): number | null => {
	const numberValue = toNumberValue(value);
	if (numberValue === null) return null;
	if (numberValue >= 0 && numberValue <= 1) return numberValue;
	if (numberValue > 1 && numberValue <= 100) return numberValue / 100;
	return null;
};

const normalizeUsd = (value: unknown): number | null => {
	const numberValue = toNumberValue(value);
	if (numberValue === null || numberValue < 0) return null;
	return numberValue;
};

const withTrailingTrim = (url: string): string => url.replace(/\/+$/, '');

const getTimeoutMs = (): number => {
	const parsed = Number(process.env.POLY_REQUEST_TIMEOUT_MS ?? DEFAULT_TIMEOUT_MS);
	if (!Number.isFinite(parsed) || parsed <= 0) return DEFAULT_TIMEOUT_MS;
	return parsed;
};

const getMaxMarkets = (): number => {
	const parsed = Number(process.env.POLY_MAX_MARKETS_PER_SCAN ?? DEFAULT_MAX_MARKETS);
	if (!Number.isFinite(parsed) || parsed <= 0) return DEFAULT_MAX_MARKETS;
	return Math.min(parsed, 1000);
};

const rewardsEnrichmentEnabled = (): boolean => {
	const raw = (process.env.POLY_ENABLE_REWARDS_ENRICHMENT ?? 'true').trim().toLowerCase();
	return raw !== 'false' && raw !== '0' && raw !== 'off';
};

const fetchJson = async (url: string, timeoutMs: number): Promise<unknown> => {
	const controller = new AbortController();
	const timeout = setTimeout(() => controller.abort(), timeoutMs);
	try {
		const response = await fetch(url, { signal: controller.signal });
		if (!response.ok) {
			throw new Error(`HTTP ${response.status} from ${url}`);
		}
		return (await response.json()) as unknown;
	} finally {
		clearTimeout(timeout);
	}
};

const extractArray = (payload: unknown): unknown[] => {
	if (Array.isArray(payload)) return payload;
	if (!payload || typeof payload !== 'object') return [];
	const asRecord = payload as Record<string, unknown>;
	if (Array.isArray(asRecord.data)) return asRecord.data;
	if (Array.isArray(asRecord.events)) return asRecord.events;
	if (Array.isArray(asRecord.markets)) return asRecord.markets;
	return [];
};

const extractGammaMarkets = (payload: unknown): unknown[] => {
	const topLevel = extractArray(payload);
	const markets: unknown[] = [];
	for (const item of topLevel) {
		if (item && typeof item === 'object') {
			const itemRecord = item as Record<string, unknown>;
			if (Array.isArray(itemRecord.markets)) {
				markets.push(...itemRecord.markets);
				continue;
			}
		}
		markets.push(item);
	}
	return markets;
};

const buildRewardsIndex = (rewardMarkets: unknown[]): RewardIndex => {
	const index: RewardIndex = new Map();
	for (const market of rewardMarkets) {
		if (!market || typeof market !== 'object') continue;
		const record = market as Record<string, unknown>;
		const conditionId =
			toStringValue(record.condition_id) ??
			toStringValue(record.conditionId) ??
			toStringValue(record.cond_id);
		if (!conditionId) continue;

		const dailyRewardRaw =
			toNumberValue(record.rate_per_day) ??
			toNumberValue(record.ratePerDay) ??
			toNumberValue(record.daily_reward) ??
			toNumberValue(record.dailyReward);
		if (dailyRewardRaw === null) continue;
		index.set(conditionId, Math.max(0, dailyRewardRaw));
	}
	return index;
};

const toPolymarketMarket = (raw: unknown, rewardsIndex: RewardIndex): PolymarketMarket | null => {
	if (!raw || typeof raw !== 'object') return null;
	const record = raw as Record<string, unknown>;
	const conditionId = toStringValue(record.conditionId) ?? toStringValue(record.condition_id);
	if (!conditionId) return null;

	const id =
		toStringValue(record.id) ??
		toStringValue(record.marketId) ??
		toStringValue(record.market_id) ??
		conditionId;
	const slug =
		toStringValue(record.marketSlug) ??
		toStringValue(record.slug) ??
		toStringValue(record.questionID) ??
		id;
	const title =
		toStringValue(record.question) ??
		toStringValue(record.title) ??
		toStringValue(record.market_name) ??
		slug;

	const yesPrice =
		normalizeProbability(record.yesPrice) ??
		normalizeProbability(record.outcomeYesPrice) ??
		normalizeProbability(record.bestBid) ??
		normalizeProbability(record.probability);
	const noPrice =
		normalizeProbability(record.noPrice) ??
		normalizeProbability(record.outcomeNoPrice) ??
		(yesPrice !== null ? Math.max(0, 1 - yesPrice) : null);

	const liquidityUsd = normalizeUsd(record.liquidity) ?? normalizeUsd(record.liquidityClob);
	const volumeUsd =
		normalizeUsd(record.volume24hr) ??
		normalizeUsd(record.volume24h) ??
		normalizeUsd(record.volume) ??
		normalizeUsd(record.volumeNum);
	const dailyRewardsUsd =
		rewardsIndex.get(conditionId) ??
		normalizeUsd(record.rewardsMinSize) ??
		normalizeUsd(record.dailyRewardsUsd) ??
		null;

	const isClosed = toBooleanValue(record.closed);
	const active = toBooleanValue(record.active);
	const resolved = toBooleanValue(record.resolved);
	const isResolved = resolved === true || isClosed === true;
	const isLive = isResolved ? false : active !== null ? active : isClosed !== null ? !isClosed : null;

	return {
		id,
		conditionId,
		slug,
		title,
		yesPrice,
		noPrice,
		liquidityUsd,
		volumeUsd,
		dailyRewardsUsd,
		isLive,
		isResolved
	};
};

const mapDbLiveMarket = (market: PolymarketDbLiveMarket): PolymarketMarket => {
	const title = market.title ?? market.marketSlug ?? market.marketId ?? market.conditionId;
	const slug = market.marketSlug ?? market.marketId ?? market.conditionId;
	const id = market.marketId ?? market.conditionId;
	return {
		id,
		conditionId: market.conditionId,
		slug,
		title,
		yesPrice: null,
		noPrice: null,
		liquidityUsd: null,
		volumeUsd: null,
		dailyRewardsUsd: null,
		isLive: true,
		isResolved: false
	};
};

const loadGammaMarkets = async (gammaBaseUrl: string, timeoutMs: number, maxMarkets: number): Promise<unknown[]> => {
	const pages = Math.ceil(maxMarkets / GAMMA_PAGE_SIZE);
	const all: unknown[] = [];
	for (let page = 0; page < pages; page += 1) {
		const offset = page * GAMMA_PAGE_SIZE;
		const url = `${gammaBaseUrl}/events?active=true&closed=false&limit=${GAMMA_PAGE_SIZE}&offset=${offset}`;
		const payload = await fetchJson(url, timeoutMs);
		const items = extractGammaMarkets(payload);
		all.push(...items);
		if (items.length < GAMMA_PAGE_SIZE) break;
	}
	return all.slice(0, maxMarkets);
};

const loadRewardMarkets = async (clobBaseUrl: string, timeoutMs: number): Promise<unknown[]> => {
	if (!rewardsEnrichmentEnabled()) return [];

	const rewardMarkets: unknown[] = [];
	let nextCursor: string | null = null;
	for (let page = 0; page < 5; page += 1) {
		const cursorParam = nextCursor ? `&next_cursor=${encodeURIComponent(nextCursor)}` : '';
		const url = `${clobBaseUrl}/rewards/markets/multi?page_size=${CLOB_REWARD_PAGE_SIZE}&order_by=rate_per_day&position=DESC${cursorParam}`;
		const payload = await fetchJson(url, timeoutMs);
		if (!payload || typeof payload !== 'object') break;
		const payloadRecord = payload as Record<string, unknown>;
		const markets = extractArray(payloadRecord.data ?? payloadRecord.markets ?? payloadRecord.results);
		rewardMarkets.push(...markets);
		nextCursor = toStringValue(payloadRecord.next_cursor) ?? toStringValue(payloadRecord.nextCursor);
		if (!nextCursor || markets.length < CLOB_REWARD_PAGE_SIZE) break;
	}
	return rewardMarkets;
};

export const loadPolymarketApiSnapshot = async (
	dbLiveMarkets: PolymarketDbLiveMarket[] = []
): Promise<PolymarketApiSnapshot> => {
	const gammaBaseUrl = withTrailingTrim(process.env.POLY_GAMMA_BASE_URL ?? DEFAULT_GAMMA_BASE_URL);
	const clobBaseUrl = withTrailingTrim(process.env.POLY_CLOB_BASE_URL ?? DEFAULT_CLOB_BASE_URL);
	const timeoutMs = getTimeoutMs();
	const maxMarkets = getMaxMarkets();

	try {
		const liveMarkets = dbLiveMarkets.map(mapDbLiveMarket);
		const dbLiveConditionIds = new Set(liveMarkets.map((market) => market.conditionId));
		const [rawMarkets, rewardMarkets] = await Promise.all([
			loadGammaMarkets(gammaBaseUrl, timeoutMs, maxMarkets),
			loadRewardMarkets(clobBaseUrl, timeoutMs).catch(() => [])
		]);
		const rewardsIndex = buildRewardsIndex(rewardMarkets);
		const deduped = new Map<string, PolymarketMarket>();
		for (const market of liveMarkets) deduped.set(market.conditionId, market);
		for (const raw of rawMarkets) {
			const mapped = toPolymarketMarket(raw, rewardsIndex);
			if (!mapped) continue;
			// When DB rows exist, DB lifecycle is canonical: only enrich known live condition IDs.
			if (dbLiveConditionIds.size > 0 && !dbLiveConditionIds.has(mapped.conditionId)) continue;
			const existing = deduped.get(mapped.conditionId);
			if (existing) {
				deduped.set(mapped.conditionId, {
					...mapped,
					isLive: existing.isLive,
					isResolved: existing.isResolved
				});
				continue;
			}
			deduped.set(mapped.conditionId, mapped);
		}
		const markets = [...deduped.values()];
		return {
			markets,
			fetchedAtIso: new Date().toISOString(),
			ok: markets.length > 0,
			error: markets.length > 0 ? undefined : 'No Polymarket scanner markets returned'
		};
	} catch (error) {
		return {
			markets: dbLiveMarkets.map(mapDbLiveMarket),
			fetchedAtIso: new Date().toISOString(),
			ok: dbLiveMarkets.length > 0,
			error: error instanceof Error ? error.message : 'Unknown Polymarket API error'
		};
	}
};
