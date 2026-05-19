const DEFAULT_API_BASE_URL = 'https://external-api.kalshi.com/trade-api/v2';
const DEFAULT_TIMEOUT_MS = 7000;
const DEFAULT_MAX_MARKETS = 200;
const DEFAULT_ORDERBOOK_ENRICHMENT_LIMIT = 40;
const DEFAULT_ORDERBOOK_DEPTH = 10;
const DEFAULT_MVE_FILTER_MODE = 'exclude';
const ORDERBOOK_WORKER_COUNT = 6;
const PAGE_SIZE = 100;
type KalshiMveFilterMode = 'exclude' | 'only' | 'all';

export type KalshiMarket = {
	id: string;
	ticker: string;
	title: string;
	yesPrice: number | null;
	noPrice: number | null;
	liquidityUsd: number | null;
	volumeUsd: number | null;
	dailyRewardsUsd: number | null;
	closeTimeIso: string | null;
	updatedTimeIso: string | null;
	isLive: boolean | null;
	isResolved: boolean | null;
};

export type KalshiApiSnapshot = {
	markets: KalshiMarket[];
	fetchedAtIso: string;
	ok: boolean;
	error?: string;
};

const withTrailingTrim = (url: string): string => url.replace(/\/+$/, '');

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

const firstPositive = (...values: Array<number | null>): number | null => {
	for (const value of values) {
		if (value !== null && value > 0) return value;
	}
	return null;
};

const getTimeoutMs = (): number => {
	const parsed = Number(process.env.KALSHI_REQUEST_TIMEOUT_MS ?? DEFAULT_TIMEOUT_MS);
	if (!Number.isFinite(parsed) || parsed <= 0) return DEFAULT_TIMEOUT_MS;
	return parsed;
};

const getMaxMarkets = (): number => {
	const parsed = Number(process.env.KALSHI_MAX_MARKETS_PER_SCAN ?? DEFAULT_MAX_MARKETS);
	if (!Number.isFinite(parsed) || parsed <= 0) return DEFAULT_MAX_MARKETS;
	return Math.min(parsed, 1000);
};

const getOrderbookEnrichmentLimit = (): number => {
	const parsed = Number(process.env.KALSHI_ORDERBOOK_ENRICHMENT_LIMIT ?? DEFAULT_ORDERBOOK_ENRICHMENT_LIMIT);
	if (!Number.isFinite(parsed) || parsed < 0) return DEFAULT_ORDERBOOK_ENRICHMENT_LIMIT;
	return Math.min(parsed, 500);
};

const getOrderbookDepth = (): number => {
	const parsed = Number(process.env.KALSHI_ORDERBOOK_DEPTH ?? DEFAULT_ORDERBOOK_DEPTH);
	if (!Number.isFinite(parsed) || parsed < 0) return DEFAULT_ORDERBOOK_DEPTH;
	return Math.min(parsed, 100);
};

const getMarketStatus = (): string => {
	const raw = (process.env.KALSHI_MARKET_STATUS ?? 'open').trim().toLowerCase();
	if (!raw) return 'open';
	return raw;
};

const getMveFilterMode = (): KalshiMveFilterMode => {
	const raw = (process.env.KALSHI_MVE_FILTER ?? DEFAULT_MVE_FILTER_MODE).trim().toLowerCase();
	if (raw === 'only') return 'only';
	if (raw === 'all' || raw === 'none') return 'all';
	return 'exclude';
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

const extractMarketsArray = (payload: unknown): unknown[] => {
	if (!payload || typeof payload !== 'object') return [];
	const record = payload as Record<string, unknown>;
	if (Array.isArray(record.markets)) return record.markets;
	if (Array.isArray(record.data)) return record.data;
	return [];
};

const extractNextCursor = (payload: unknown): string | null => {
	if (!payload || typeof payload !== 'object') return null;
	const record = payload as Record<string, unknown>;
	return (
		toStringValue(record.cursor) ??
		toStringValue(record.next_cursor) ??
		toStringValue(record.nextCursor) ??
		null
	);
};

const resolveYesPrice = (record: Record<string, unknown>): number | null => {
	const yesBid = normalizeProbability(record.yes_bid_dollars);
	const yesAsk = normalizeProbability(record.yes_ask_dollars);
	if (yesBid !== null && yesAsk !== null && yesBid > 0 && yesAsk > 0 && yesBid <= yesAsk) {
		return (yesBid + yesAsk) / 2;
	}

	const candidates: unknown[] = [record.last_price_dollars, record.last_price, record.yes_price, record.yesPrice];
	const normalized = candidates.map(normalizeProbability);
	const positive = firstPositive(...normalized);
	if (positive !== null) return positive;
	return firstPositive(yesBid, yesAsk) ?? normalized.find((value) => value !== null) ?? yesBid ?? yesAsk ?? null;
};

const resolveNoPrice = (record: Record<string, unknown>, yesPrice: number | null): number | null => {
	if (yesPrice !== null) return Math.max(0, 1 - yesPrice);

	const noBid = normalizeProbability(record.no_bid_dollars);
	const noAsk = normalizeProbability(record.no_ask_dollars);
	if (noBid !== null && noAsk !== null && noBid > 0 && noAsk > 0 && noBid <= noAsk) {
		return (noBid + noAsk) / 2;
	}

	const candidates: unknown[] = [record.no_price, record.noPrice];
	const normalized = candidates.map(normalizeProbability);
	const positive = firstPositive(...normalized);
	if (positive !== null) return positive;
	return firstPositive(noBid, noAsk) ?? normalized.find((value) => value !== null) ?? noBid ?? noAsk ?? null;
};

const resolveQuotedLiquidity = (record: Record<string, unknown>): number | null => {
	const yesBidPrice = normalizeProbability(record.yes_bid_dollars);
	const yesBidSize = normalizeUsd(record.yes_bid_size_fp);
	const yesAskPrice = normalizeProbability(record.yes_ask_dollars);
	const yesAskSize = normalizeUsd(record.yes_ask_size_fp);
	const noBidPrice = normalizeProbability(record.no_bid_dollars);
	const noBidSize = normalizeUsd(record.no_bid_size_fp);
	const noAskPrice = normalizeProbability(record.no_ask_dollars);
	const noAskSize = normalizeUsd(record.no_ask_size_fp);

	const notionals = [
		yesBidPrice !== null && yesBidSize !== null ? yesBidPrice * yesBidSize : null,
		yesAskPrice !== null && yesAskSize !== null ? yesAskPrice * yesAskSize : null,
		noBidPrice !== null && noBidSize !== null ? noBidPrice * noBidSize : null,
		noAskPrice !== null && noAskSize !== null ? noAskPrice * noAskSize : null
	];

	return notionals.reduce<number>((sum, value) => sum + (value ?? 0), 0) || null;
};

const isMveMarket = (record: Record<string, unknown>): boolean => {
	const ticker = toStringValue(record.ticker);
	const eventTicker = toStringValue(record.event_ticker);
	const mveCollection = toStringValue(record.mve_collection_ticker);
	const mveSelectedLegs = record.mve_selected_legs;
	return (
		(mveCollection !== null && mveCollection.length > 0) ||
		(Array.isArray(mveSelectedLegs) && mveSelectedLegs.length > 0) ||
		(ticker !== null && ticker.startsWith('KXMV')) ||
		(eventTicker !== null && eventTicker.startsWith('KXMV'))
	);
};

const shouldIncludeMarket = (record: Record<string, unknown>, mveFilterMode: KalshiMveFilterMode): boolean => {
	const mveMarket = isMveMarket(record);
	if (mveFilterMode === 'only') return mveMarket;
	if (mveFilterMode === 'all') return true;
	return !mveMarket;
};

const toKalshiMarket = (raw: unknown): KalshiMarket | null => {
	if (!raw || typeof raw !== 'object') return null;
	const record = raw as Record<string, unknown>;

	const ticker = toStringValue(record.ticker);
	if (!ticker) return null;

	const title =
		toStringValue(record.title) ??
		toStringValue(record.subtitle) ??
		toStringValue(record.market_title) ??
		ticker;

	const yesPrice = resolveYesPrice(record);
	const noPrice = resolveNoPrice(record, yesPrice);
	const liquidityUsd =
		firstPositive(
			normalizeUsd(record.liquidity_dollars),
			normalizeUsd(record.liquidity),
			resolveQuotedLiquidity(record),
			normalizeUsd(record.open_interest_dollars),
			normalizeUsd(record.open_interest_fp)
		) ?? normalizeUsd(record.liquidity_dollars);
	const volumeUsd =
		firstPositive(
			normalizeUsd(record.volume_dollars),
			normalizeUsd(record.volume_fp),
			normalizeUsd(record.volume_24h_dollars),
			normalizeUsd(record.volume_24h_fp),
			normalizeUsd(record.volume_24h),
			normalizeUsd(record.volume)
		) ?? normalizeUsd(record.volume_fp);

	const status = toStringValue(record.status)?.toLowerCase();
	const isResolved = status ? /settled|resolved|finalized|closed/.test(status) : null;
	const isLive = status ? /open|active/.test(status) : null;

	return {
		id: ticker,
		ticker,
		title,
		yesPrice,
		noPrice,
		liquidityUsd,
		volumeUsd,
		dailyRewardsUsd: null,
		closeTimeIso:
			toStringValue(record.close_time) ??
			toStringValue(record.latest_expiration_time) ??
			toStringValue(record.expiration_time),
		updatedTimeIso: toStringValue(record.updated_time) ?? toStringValue(record.created_time),
		isLive,
		isResolved
	};
};

const loadMarkets = async (
	baseUrl: string,
	timeoutMs: number,
	maxMarkets: number,
	status: string,
	mveFilterMode: KalshiMveFilterMode
): Promise<KalshiMarket[]> => {
	const all: KalshiMarket[] = [];
	let cursor: string | null = null;
	const pages = Math.ceil(maxMarkets / PAGE_SIZE);

	for (let page = 0; page < pages; page += 1) {
		const queryParts = [`limit=${PAGE_SIZE}`, `status=${encodeURIComponent(status)}`];
		if (mveFilterMode !== 'all') queryParts.push(`mve_filter=${encodeURIComponent(mveFilterMode)}`);
		if (cursor) queryParts.push(`cursor=${encodeURIComponent(cursor)}`);
		const url = `${baseUrl}/markets?${queryParts.join('&')}`;
		const payload = await fetchJson(url, timeoutMs);
		const rawMarkets = extractMarketsArray(payload);
		for (const raw of rawMarkets) {
			if (!raw || typeof raw !== 'object') continue;
			const record = raw as Record<string, unknown>;
			if (!shouldIncludeMarket(record, mveFilterMode)) continue;
			const mapped = toKalshiMarket(raw);
			if (mapped) all.push(mapped);
			if (all.length >= maxMarkets) break;
		}
		if (all.length >= maxMarkets) break;

		const nextCursor = extractNextCursor(payload);
		if (!nextCursor || nextCursor === cursor || rawMarkets.length < PAGE_SIZE) break;
		cursor = nextCursor;
	}

	const deduped = new Map<string, KalshiMarket>();
	for (const market of all) deduped.set(market.ticker, market);
	return [...deduped.values()];
};

const extractOrderbookSide = (payload: unknown, side: 'yes_dollars' | 'no_dollars'): Array<[number, number]> => {
	if (!payload || typeof payload !== 'object') return [];
	const orderbook = (payload as Record<string, unknown>).orderbook_fp;
	if (!orderbook || typeof orderbook !== 'object') return [];
	const levels = (orderbook as Record<string, unknown>)[side];
	if (!Array.isArray(levels)) return [];

	const parsed: Array<[number, number]> = [];
	for (const level of levels) {
		if (!Array.isArray(level) || level.length < 2) continue;
		const price = toNumberValue(level[0]);
		const size = toNumberValue(level[1]);
		if (price === null || size === null || price < 0 || size <= 0) continue;
		parsed.push([price, size]);
	}
	return parsed;
};

const calculateOrderbookDepthUsd = (levels: Array<[number, number]>): number | null => {
	const depth = levels.reduce((sum, [price, size]) => sum + price * size, 0);
	return depth > 0 ? depth : null;
};

const enrichMarketWithOrderbook = async (
	market: KalshiMarket,
	baseUrl: string,
	timeoutMs: number,
	depth: number
): Promise<KalshiMarket> => {
	const url = `${baseUrl}/markets/${encodeURIComponent(market.ticker)}/orderbook?depth=${depth}`;
	const payload = await fetchJson(url, timeoutMs);
	const yesLevels = extractOrderbookSide(payload, 'yes_dollars');
	const noLevels = extractOrderbookSide(payload, 'no_dollars');
	const yesBestBid = yesLevels[0]?.[0] ?? null;
	const noBestBid = noLevels[0]?.[0] ?? null;
	const orderbookDepthUsd = [calculateOrderbookDepthUsd(yesLevels), calculateOrderbookDepthUsd(noLevels)].reduce<number>(
		(sum, value) => sum + (value ?? 0),
		0
	);
	const normalizedDepth = orderbookDepthUsd > 0 ? orderbookDepthUsd : null;

	return {
		...market,
		yesPrice: market.yesPrice ?? yesBestBid,
		noPrice:
			market.noPrice ??
			(market.yesPrice !== null ? Math.max(0, 1 - market.yesPrice) : null) ??
			(yesBestBid !== null ? Math.max(0, 1 - yesBestBid) : null) ??
			noBestBid,
		liquidityUsd: firstPositive(market.liquidityUsd, normalizedDepth)
	};
};

const enrichMarketsWithOrderbooks = async (
	markets: KalshiMarket[],
	baseUrl: string,
	timeoutMs: number,
	limit: number,
	depth: number
): Promise<KalshiMarket[]> => {
	if (limit <= 0 || markets.length === 0) return markets;

	const enriched = [...markets];
	const targetIndexes = markets
		.map((market, index) => ({ market, index }))
		.filter(({ market }) => (market.liquidityUsd ?? 0) <= 0 || market.yesPrice === null || market.noPrice === null)
		.slice(0, limit);
	let cursor = 0;

	const worker = async () => {
		while (cursor < targetIndexes.length) {
			const next = targetIndexes[cursor];
			cursor += 1;
			if (!next) continue;
			enriched[next.index] = await enrichMarketWithOrderbook(next.market, baseUrl, timeoutMs, depth).catch(
				() => next.market
			);
		}
	};

	await Promise.all(Array.from({ length: Math.min(ORDERBOOK_WORKER_COUNT, targetIndexes.length) }, worker));
	return enriched;
};

export const loadKalshiApiSnapshot = async (): Promise<KalshiApiSnapshot> => {
	const baseUrl = withTrailingTrim(process.env.KALSHI_API_BASE_URL ?? DEFAULT_API_BASE_URL);
	const timeoutMs = getTimeoutMs();
	const maxMarkets = getMaxMarkets();
	const status = getMarketStatus();
	const mveFilterMode = getMveFilterMode();
	const orderbookEnrichmentLimit = getOrderbookEnrichmentLimit();
	const orderbookDepth = getOrderbookDepth();

	try {
		const rawMarkets = await loadMarkets(baseUrl, timeoutMs, maxMarkets, status, mveFilterMode);
		const markets = await enrichMarketsWithOrderbooks(
			rawMarkets,
			baseUrl,
			timeoutMs,
			orderbookEnrichmentLimit,
			orderbookDepth
		);
		return {
			markets,
			fetchedAtIso: new Date().toISOString(),
			ok: markets.length > 0,
			error: markets.length > 0 ? undefined : 'No Kalshi markets returned'
		};
	} catch (error) {
		return {
			markets: [],
			fetchedAtIso: new Date().toISOString(),
			ok: false,
			error: error instanceof Error ? error.message : 'Unknown Kalshi API error'
		};
	}
};
