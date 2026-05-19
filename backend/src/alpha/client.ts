import { AlphaClient, DEFAULT_MARKET_CREATOR_ADDRESS, type Market } from '@alpha-arcade/sdk';
import algosdk from 'algosdk';

import type { AlphaApiSnapshot, AlphaDbLiveMarket, AlphaMarket, AlphaOrderbook } from '../types';

const DEFAULT_TIMEOUT_MS = 7000;
const DEFAULT_ALGOD_URL = 'https://mainnet-api.algonode.cloud';
const DEFAULT_INDEXER_URL = 'https://mainnet-idx.algonode.cloud';
const DEFAULT_MATCHER_APP_ID = 3_078_581_851;
const DEFAULT_USDC_ASSET_ID = 31_566_704;

let alphaClient: AlphaClient | null = null;

const withTimeout = async <T>(promise: Promise<T>, timeoutMs: number, label: string): Promise<T> => {
	let timeoutHandle: ReturnType<typeof setTimeout> | undefined;
	const timeoutPromise = new Promise<never>((_, reject) => {
		timeoutHandle = setTimeout(() => reject(new Error(`${label} timed out`)), timeoutMs);
	});
	try {
		return await Promise.race([promise, timeoutPromise]);
	} finally {
		if (timeoutHandle) clearTimeout(timeoutHandle);
	}
};

const parseSdkUrl = (rawUrl: string): { server: string; port: number } => {
	const parsed = new URL(rawUrl);
	const basePath = parsed.pathname && parsed.pathname !== '/' ? parsed.pathname : '';
	const server = `${parsed.protocol}//${parsed.host}${basePath}`;
	const port = parsed.port ? Number(parsed.port) : parsed.protocol === 'https:' ? 443 : 80;
	return { server, port };
};

const buildReadOnlySigner = (): algosdk.TransactionSigner => {
	return async () => {
		throw new Error('Read-only signer cannot sign transactions');
	};
};

const normalizeProbability = (value: unknown): number | null => {
	if (typeof value !== 'number' || !Number.isFinite(value)) return null;
	if (value <= 1) return value;
	if (value <= 100) return value / 100;
	if (value <= 1_000_000) return value / 1_000_000;
	return null;
};

const normalizeMoney = (value: unknown): number | null => {
	if (typeof value !== 'number' || !Number.isFinite(value)) return null;
	if (value >= 1_000_000) return value / 1_000_000;
	return value;
};

const toUpdatedAtIso = (market: Market): string | null => {
	if (typeof market.lastRewardTs === 'number' && market.lastRewardTs > 0) {
		return new Date(market.lastRewardTs * 1000).toISOString();
	}
	return null;
};

const mapMarket = (market: Market): AlphaMarket => {
	const rewardRaw =
		(typeof market.totalRewards === 'number' ? market.totalRewards : null) ??
		(typeof market.totalPregameRewards === 'number' ? market.totalPregameRewards : null);
	const volumeUsd = normalizeMoney(market.volume);
	const liquidityRaw = (market as Record<string, unknown>).liquidity;
	const liquidityUsd =
		typeof liquidityRaw === 'number' ? normalizeMoney(liquidityRaw) : null;
	return {
		marketAppId: market.marketAppId,
		id: String(market.id ?? market.marketAppId),
		slug: market.slug ?? String(market.id ?? market.marketAppId),
		title: market.title ?? market.slug ?? String(market.marketAppId),
		yesPrice: normalizeProbability(market.yesProb),
		noPrice: normalizeProbability(market.noProb),
		volumeUsd,
		liquidityUsd,
		dailyRewardsUsd: rewardRaw !== null ? rewardRaw / 1_000_000 : null,
		endTs: typeof market.endTs === 'number' && market.endTs > 0 ? market.endTs : null,
		updatedAtIso: toUpdatedAtIso(market),
		isLive: typeof market.isLive === 'boolean' ? market.isLive : null,
		isResolved: typeof market.isResolved === 'boolean' ? market.isResolved : null
	};
};

const mapDbLiveMarket = (market: AlphaDbLiveMarket): AlphaMarket => {
	const slug = market.slug ?? market.marketId ?? String(market.marketAppId);
	return {
		marketAppId: market.marketAppId,
		id: market.marketId ?? String(market.marketAppId),
		slug,
		title: slug,
		yesPrice: null,
		noPrice: null,
		volumeUsd: null,
		liquidityUsd: null,
		dailyRewardsUsd: null,
		endTs: market.endTs,
		updatedAtIso: market.lastSeenAt ?? market.closeTime,
		isLive: true,
		isResolved: false
	};
};

const createSdkClient = (): AlphaClient => {
	const algodUrl = process.env.ALPHA_ALGOD_URL || DEFAULT_ALGOD_URL;
	const indexerUrl = process.env.ALPHA_INDEXER_URL || DEFAULT_INDEXER_URL;
	const algodParsed = parseSdkUrl(algodUrl);
	const indexerParsed = parseSdkUrl(indexerUrl);

	return new AlphaClient({
		algodClient: new algosdk.Algodv2(
			process.env.ALPHA_ALGOD_TOKEN || '',
			algodParsed.server,
			algodParsed.port
		),
		indexerClient: new algosdk.Indexer(
			process.env.ALPHA_INDEXER_TOKEN || '',
			indexerParsed.server,
			indexerParsed.port
		),
		signer: buildReadOnlySigner(),
		activeAddress: process.env.ALPHA_ACTIVE_ADDRESS || DEFAULT_MARKET_CREATOR_ADDRESS,
		matcherAppId: Number(process.env.ALPHA_MATCHER_APP_ID ?? DEFAULT_MATCHER_APP_ID),
		usdcAssetId: Number(process.env.ALPHA_USDC_ASSET_ID ?? DEFAULT_USDC_ASSET_ID),
		apiKey: process.env.ALPHA_API_KEY,
		apiBaseUrl: process.env.ALPHA_API_BASE_URL
	});
};

const getSdkClient = (): AlphaClient => {
	if (!alphaClient) alphaClient = createSdkClient();
	return alphaClient;
};

export const loadAlphaApiSnapshot = async (dbLiveMarkets: AlphaDbLiveMarket[] = []): Promise<AlphaApiSnapshot> => {
	const timeoutMs = Number(process.env.ALPHA_REQUEST_TIMEOUT_MS ?? DEFAULT_TIMEOUT_MS);
	const client = getSdkClient();

	try {
		const liveMarkets = dbLiveMarkets.map(mapDbLiveMarket);
		const rewardMarketsRaw = await withTimeout(
			client.getRewardMarkets(),
			timeoutMs,
			'getRewardMarkets'
		).catch(() => []);

		const deduped = new Map<number, AlphaMarket>();
		for (const market of liveMarkets) deduped.set(market.marketAppId, market);
		for (const market of rewardMarketsRaw) deduped.set(market.marketAppId, mapMarket(market));
		const markets = [...deduped.values()];

		return {
			markets,
			orderbooks: new Map<number, AlphaOrderbook>(),
			fetchedAtIso: new Date().toISOString(),
			ok: markets.length > 0,
			error: markets.length === 0 ? 'No live markets returned from DB or reward API' : undefined
		};
	} catch (error) {
		return {
			markets: dbLiveMarkets.map(mapDbLiveMarket),
			orderbooks: new Map(),
			fetchedAtIso: new Date().toISOString(),
			ok: dbLiveMarkets.length > 0,
			error: error instanceof Error ? error.message : 'Unknown Alpha SDK error'
		};
	}
};
