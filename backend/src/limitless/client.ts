const DEFAULT_API_BASE_URL = 'https://api.limitless.exchange';
const DEFAULT_TIMEOUT_MS = 7000;
const DEFAULT_MAX_MARKETS = 100;
const DEFAULT_SORT_BY = 'newest';
const DEFAULT_PAGE_SIZE = 25;
const MAX_PAGE_SIZE = 25;
const MIN_REQUEST_GAP_MS = 300;

export type LimitlessMarket = {
	id: string;
	slug: string;
	title: string;
	yesPrice: number | null;
	noPrice: number | null;
	liquidityUsd: number | null;
	volumeUsd: number | null;
	dailyRewardsUsd: number | null;
	isLive: boolean | null;
	isResolved: boolean | null;
	expiryLabel: string;
	categories: string[];
	assetType: string | null;
};

export type LimitlessApiSnapshot = {
	markets: LimitlessMarket[];
	fetchedAtIso: string;
	ok: boolean;
	error?: string;
};

const withTrailingTrim = (url: string): string => url.replace(/\/+$/, '');

const sleep = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

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

const parseFormattedUsd = (value: unknown): number | null => {
	const numberValue = toNumberValue(value);
	if (numberValue === null || numberValue < 0) return null;
	return numberValue;
};

const getTimeoutMs = (): number => {
	const parsed = Number(process.env.LIMITLESS_REQUEST_TIMEOUT_MS ?? DEFAULT_TIMEOUT_MS);
	if (!Number.isFinite(parsed) || parsed <= 0) return DEFAULT_TIMEOUT_MS;
	return parsed;
};

const getMaxMarkets = (): number => {
	const parsed = Number(process.env.LIMITLESS_MAX_MARKETS_PER_SCAN ?? DEFAULT_MAX_MARKETS);
	if (!Number.isFinite(parsed) || parsed <= 0) return DEFAULT_MAX_MARKETS;
	return Math.min(parsed, 500);
};

const getSortBy = (): string => {
	const raw = (process.env.LIMITLESS_SORT_BY ?? DEFAULT_SORT_BY).trim();
	return raw.length > 0 ? raw : DEFAULT_SORT_BY;
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
	if (Array.isArray(record.data)) return record.data;
	if (Array.isArray(record.markets)) return record.markets;
	return [];
};

const hasNestedMarkets = (record: Record<string, unknown>): boolean => {
	const nested = record.markets;
	return Array.isArray(nested) && nested.length > 0;
};

const isBinaryCompatible = (record: Record<string, unknown>): boolean => {
	const tradeType = toStringValue(record.tradeType)?.toLowerCase();
	if (tradeType === 'group') return false;
	if (hasNestedMarkets(record)) return false;

	const marketType = toStringValue(record.marketType)?.toLowerCase();
	if (marketType && marketType !== 'single') return false;

	const prices = record.prices;
	if (!Array.isArray(prices) || prices.length !== 2) return false;

	const yesPrice = normalizeProbability(prices[0]);
	const noPrice = normalizeProbability(prices[1]);
	return yesPrice !== null && noPrice !== null;
};

const formatExpiryLabel = (record: Record<string, unknown>): string => {
	const expirationTimestamp = toNumberValue(record.expirationTimestamp);
	if (expirationTimestamp !== null && expirationTimestamp > 0) {
		const days = Math.max(0, Math.ceil((expirationTimestamp - Date.now()) / (1000 * 60 * 60 * 24)));
		if (days <= 0) return '0d';
		return `${days}d`;
	}

	const expirationDate = toStringValue(record.expirationDate);
	if (expirationDate) return expirationDate;

	return '30d';
};

const resolveVolumeUsd = (record: Record<string, unknown>): number | null => {
	return (
		parseFormattedUsd(record.volumeFormatted) ??
		parseFormattedUsd(record.volume) ??
		parseFormattedUsd(record.volumeNum)
	);
};

const resolveLiquidityUsd = (record: Record<string, unknown>): number | null => {
	return (
		parseFormattedUsd(record.liquidityFormatted) ??
		parseFormattedUsd(record.liquidity) ??
		parseFormattedUsd(record.openInterestFormatted) ??
		parseFormattedUsd(record.openInterest)
	);
};

const extractStringArray = (value: unknown): string[] => {
	if (!Array.isArray(value)) return [];
	return value
		.map((item) => toStringValue(item))
		.filter((item): item is string => item !== null);
};

const resolveAssetType = (record: Record<string, unknown>): string | null => {
	const metadata = record.priceOracleMetadata;
	if (!metadata || typeof metadata !== 'object') return null;
	return toStringValue((metadata as Record<string, unknown>).assetType);
};

const resolveDailyRewardsUsd = (record: Record<string, unknown>): number | null => {
	const settings = record.settings;
	if (!settings || typeof settings !== 'object') return null;
	const settingsRecord = settings as Record<string, unknown>;
	return parseFormattedUsd(settingsRecord.dailyReward);
};

const toLimitlessMarket = (raw: unknown): LimitlessMarket | null => {
	if (!raw || typeof raw !== 'object') return null;
	const record = raw as Record<string, unknown>;
	if (!isBinaryCompatible(record)) return null;

	const slug = toStringValue(record.slug);
	const title = toStringValue(record.title) ?? toStringValue(record.proxyTitle);
	if (!slug || !title) return null;

	const prices = record.prices as unknown[];
	const yesPrice = normalizeProbability(prices[0]);
	const noPrice = normalizeProbability(prices[1]);
	if (yesPrice === null || noPrice === null) return null;

	const expired = record.expired === true;
	const status = toStringValue(record.status)?.toLowerCase();
	const isResolved = expired || status === 'resolved' || status === 'settled';
	const isLive = !isResolved && (status === null || status === 'funded' || status === 'active' || status === 'open');

	const id =
		toStringValue(record.id) ??
		toStringValue(record.address) ??
		slug;

	return {
		id,
		slug,
		title,
		yesPrice,
		noPrice,
		liquidityUsd: resolveLiquidityUsd(record),
		volumeUsd: resolveVolumeUsd(record),
		dailyRewardsUsd: resolveDailyRewardsUsd(record),
		isLive,
		isResolved,
		expiryLabel: formatExpiryLabel(record),
		categories: extractStringArray(record.categories),
		assetType: resolveAssetType(record)
	};
};

const loadActiveMarketsPage = async (
	baseUrl: string,
	timeoutMs: number,
	page: number,
	limit: number,
	sortBy: string
): Promise<unknown[]> => {
	const query = new URLSearchParams({
		page: String(page),
		limit: String(limit),
		sortBy
	});
	const url = `${baseUrl}/markets/active?${query.toString()}`;
	const payload = await fetchJson(url, timeoutMs);
	return extractMarketsArray(payload);
};

const loadActiveMarkets = async (
	baseUrl: string,
	timeoutMs: number,
	maxMarkets: number,
	sortBy: string
): Promise<LimitlessMarket[]> => {
	const deduped = new Map<string, LimitlessMarket>();
	const pageSize = Math.min(DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE, maxMarkets);
	const maxPages = Math.ceil(maxMarkets / pageSize);

	for (let page = 1; page <= maxPages; page += 1) {
		if (page > 1) await sleep(MIN_REQUEST_GAP_MS);

		const rawMarkets = await loadActiveMarketsPage(baseUrl, timeoutMs, page, pageSize, sortBy);
		if (rawMarkets.length === 0) break;

		for (const raw of rawMarkets) {
			const mapped = toLimitlessMarket(raw);
			if (!mapped) continue;
			deduped.set(mapped.slug, mapped);
			if (deduped.size >= maxMarkets) break;
		}

		if (deduped.size >= maxMarkets || rawMarkets.length < pageSize) break;
	}

	return [...deduped.values()];
};

export const loadLimitlessApiSnapshot = async (): Promise<LimitlessApiSnapshot> => {
	const baseUrl = withTrailingTrim(process.env.LIMITLESS_API_BASE_URL ?? DEFAULT_API_BASE_URL);
	const timeoutMs = getTimeoutMs();
	const maxMarkets = getMaxMarkets();
	const sortBy = getSortBy();

	try {
		const markets = await loadActiveMarkets(baseUrl, timeoutMs, maxMarkets, sortBy);
		return {
			markets,
			fetchedAtIso: new Date().toISOString(),
			ok: markets.length > 0,
			error: markets.length > 0 ? undefined : 'No binary-compatible Limitless markets returned'
		};
	} catch (error) {
		return {
			markets: [],
			fetchedAtIso: new Date().toISOString(),
			ok: false,
			error: error instanceof Error ? error.message : 'Unknown Limitless API error'
		};
	}
};
