import { getContext, setContext } from 'svelte';
import { writable } from 'svelte/store';

import { commandPrompts, navItems } from '$lib/constants/terminal';
import type { DashboardApiResponse } from '$lib/types/dashboard';
import type { MarketRow, MarketsApiResponse, Venue } from '$lib/types/markets';

type VenueStatusSlug = 'alpha' | 'polymarket' | 'kalshi' | 'limitless';

export type VenueLoadState = 'loading' | 'ready' | 'error';

export type MarketDataSnapshot = {
	data: MarketsApiResponse;
	isLoading: boolean;
	error: string | null;
	venueLoadState: Record<Venue, VenueLoadState>;
};

export type MarketDataRefreshOptions = {
	background?: boolean;
};

export type MarketDataContext = {
	subscribe: ReturnType<typeof writable<MarketDataSnapshot>>['subscribe'];
	refresh: (options?: MarketDataRefreshOptions) => Promise<void>;
};

export const venueOrder: Venue[] = ['Alpha', 'Polymarket', 'Kalshi', 'Limitless'];

const MARKET_DATA_CONTEXT_KEY = Symbol('market-data-context');

const UNAVAILABLE = '⚠️';

const baseVenueLoadState: Record<Venue, VenueLoadState> = {
	Alpha: 'loading',
	Polymarket: 'loading',
	Kalshi: 'loading',
	Limitless: 'loading'
};

const venueSlugMap: Record<Venue, VenueStatusSlug> = {
	Alpha: 'alpha',
	Polymarket: 'polymarket',
	Kalshi: 'kalshi',
	Limitless: 'limitless'
};

export const emptyMarketsData: MarketsApiResponse = {
	dashboardTimestamp: '—',
	feedMode: 'STATIC',
	venues: [],
	activeVenueCount: 0,
	marketsIndexed: 0,
	markets: []
};

export const initialMarketDataSnapshot: MarketDataSnapshot = {
	data: emptyMarketsData,
	isLoading: true,
	error: null,
	venueLoadState: { ...baseVenueLoadState }
};

const valueOrUnavailable = (snapshot: MarketDataSnapshot, value: string): string =>
	snapshot.error ? UNAVAILABLE : value;

const formatMoney = (value: number): string =>
	`$${new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(Math.max(0, value))}`;

const formatPercent = (value: number): string => `${value.toFixed(1)}%`;

const withTimeout = async <T>(promise: Promise<T>, ms: number): Promise<T> => {
	const controller = new AbortController();
	const timeout = setTimeout(() => controller.abort(), ms);
	try {
		return await promise;
	} finally {
		clearTimeout(timeout);
	}
};

const signalLabel = (market: MarketRow): string => {
	const primarySignal = market.signals.find((signal) => signal !== 'NONE') ?? 'NONE';
	if (primarySignal === 'SPREAD') return 'Spread capture';
	if (primarySignal === 'PARITY') return 'Parity gap';
	if (primarySignal === 'REWARD') return 'Reward lane';
	if (primarySignal === 'STALE') return 'Stale price';
	if (primarySignal === 'LOW LIQ') return 'Low liquidity';
	return 'Market watch';
};

const confidenceForLiquidity = (liquidity: number): 'HIGH' | 'MED' | 'LOW' => {
	if (liquidity >= 1500) return 'HIGH';
	if (liquidity >= 600) return 'MED';
	return 'LOW';
};

const readApiBaseUrl = (): string | null => {
	const baseUrl = (
		(import.meta.env.PUBLIC_API_BASE_URL as string | undefined) ??
		(import.meta.env.VITE_PUBLIC_API_BASE_URL as string | undefined)
	)?.trim();
	return baseUrl && baseUrl.length > 0 ? baseUrl : null;
};

const normalizeMarketsPayload = (payload: MarketsApiResponse): MarketsApiResponse => ({
	...payload,
	marketsIndexed: payload.marketsIndexed || payload.markets.length,
	activeVenueCount: payload.activeVenueCount || payload.venues.length
});

const loadVenueState = async (baseUrl: string, venue: Venue): Promise<VenueLoadState> => {
	try {
		const response = await withTimeout(
			fetch(`${baseUrl}/api/markets/status/${venueSlugMap[venue]}`),
			12_000
		);
		if (!response.ok) return 'error';
		const payload = (await response.json()) as { ok?: boolean };
		return payload.ok === false ? 'error' : 'ready';
	} catch {
		return 'error';
	}
};

const deriveVenueStatus = (
	venue: Venue,
	markets: MarketRow[],
	knownVenues: Venue[],
	venueLoadState: Record<Venue, VenueLoadState>,
	feedMode: MarketsApiResponse['feedMode']
): string => {
	const hasVenue = knownVenues.includes(venue) || markets.some((market) => market.venue === venue);
	if (hasVenue) return 'Online';
	if (venueLoadState[venue] === 'loading') return 'Degraded';
	if (feedMode === 'STATIC') return 'Fallback';
	return 'Offline';
};

export const buildDashboardFromMarketSnapshot = (
	snapshot: MarketDataSnapshot
): DashboardApiResponse => {
	const { data, isLoading, venueLoadState, error } = snapshot;
	const spreadValues = data.markets.map((market) => market.spread).filter((spread) => spread > 0);
	const avgSpread =
		spreadValues.length > 0
			? spreadValues.reduce((acc, spread) => acc + spread, 0) / spreadValues.length
			: null;

	const signalRows = error
		? []
		: data.markets
				.filter((market) => !market.signals.includes('NONE'))
				.map((market) => {
					const fair = Math.max(0, Math.min(1, 1 - market.noPrice));
					const edge = Math.max(market.spread / 100, Math.abs(fair - market.yesPrice));
					return {
						signal: signalLabel(market),
						market: market.name,
						venue: market.venue,
						side: (fair >= market.yesPrice ? 'YES' : 'NO') as 'YES' | 'NO',
						price: market.yesPrice.toFixed(2),
						fair: fair.toFixed(2),
						edge: `+${(edge * 100).toFixed(1)}%`,
						liquidity: formatMoney(market.liquidity),
						confidence: confidenceForLiquidity(market.liquidity)
					};
				})
				.sort((a, b) => Number.parseFloat(b.edge) - Number.parseFloat(a.edge))
				.slice(0, 12);

	const estimatedEdge = signalRows.reduce((acc, row) => {
		const edgePct = Number.parseFloat(row.edge.replace('%', '')) / 100;
		const liquidity = Number.parseFloat(row.liquidity.replace(/[$,]/g, ''));
		if (!Number.isFinite(edgePct) || !Number.isFinite(liquidity)) return acc;
		return acc + edgePct * liquidity;
	}, 0);

	const marketFeed = error
		? ['⚠️ Market data unavailable']
		: signalRows.length > 0
			? signalRows
					.slice(0, 5)
					.map((row) => `${row.venue}: ${row.signal.toLowerCase()} ${row.edge} on ${row.market}`)
			: [];

	const venueHealth = venueOrder.map((venue) => {
		const venueMarkets = data.markets.filter((market) => market.venue === venue);
		const liquidityPool = venueMarkets.reduce((acc, market) => acc + market.liquidity, 0);
		const volumePool = venueMarkets.reduce((acc, market) => acc + market.volume, 0);
		const liquidityScore = Math.min(100, Math.round(liquidityPool / 5000));
		return {
			venue,
			status: deriveVenueStatus(venue, data.markets, data.venues, venueLoadState, data.feedMode),
			marketsIndexed: error ? UNAVAILABLE : String(venueMarkets.length),
			lastSync: error
				? UNAVAILABLE
				: venueMarkets.length > 0
					? isLoading
						? 'syncing'
						: 'just now'
					: 'n/a',
			apiMode: error
				? UNAVAILABLE
				: venueLoadState[venue] === 'ready'
					? 'API'
					: venueLoadState[venue] === 'loading'
						? 'Pending'
						: data.feedMode === 'STATIC'
							? 'Mock'
							: 'Unavailable',
			liquidityScore: error ? UNAVAILABLE : `${liquidityScore}/100`,
			volumeSignal: error
				? UNAVAILABLE
				: volumePool > 100_000
					? 'High'
					: volumePool > 0
						? 'Tracked'
						: 'Low'
		};
	});

	// Historical probability drift is not available yet — no synthesized placeholders.
	const probabilityDrift = {
		market: UNAVAILABLE,
		start: UNAVAILABLE,
		end: UNAVAILABLE,
		sparkline: UNAVAILABLE,
		oneHour: UNAVAILABLE,
		twentyFourHour: UNAVAILABLE,
		spread: UNAVAILABLE
	};

	return {
		dashboardTimestamp: data.dashboardTimestamp,
		navItems,
		stats: [
			{
				label: 'Total Markets',
				value: valueOrUnavailable(snapshot, String(data.marketsIndexed))
			},
			{
				label: 'Active Venues',
				value: valueOrUnavailable(snapshot, String(data.activeVenueCount))
			},
			{
				label: 'Avg Spread',
				value: error ? UNAVAILABLE : avgSpread !== null ? formatPercent(avgSpread) : 'n/a'
			},
			{
				label: 'Open Signal Count',
				value: valueOrUnavailable(snapshot, String(signalRows.length))
			},
			{
				label: 'Reward Eligible',
				value: valueOrUnavailable(
					snapshot,
					String(data.markets.filter((market) => market.reward).length)
				)
			},
			{
				label: 'Estimated Edge',
				value: error ? UNAVAILABLE : formatMoney(estimatedEdge)
			}
		],
		signalRows,
		marketFeed,
		venueHealth,
		probabilityDrift,
		commandPrompts,
		feedMode: data.feedMode
	};
};

const createMarketDataContext = (): MarketDataContext => {
	const state = writable<MarketDataSnapshot>({
		data: emptyMarketsData,
		isLoading: true,
		error: null,
		venueLoadState: { ...baseVenueLoadState }
	});

	let refreshInFlight = false;

	const refresh = async (options?: MarketDataRefreshOptions): Promise<void> => {
		if (refreshInFlight) return;
		refreshInFlight = true;

		const background = options?.background === true;

		try {
			const baseUrl = readApiBaseUrl();
			if (!baseUrl) {
				if (background) return;
				state.set({
					data: emptyMarketsData,
					isLoading: false,
					error: 'PUBLIC_API_BASE_URL is missing.',
					venueLoadState: {
						Alpha: 'error',
						Polymarket: 'error',
						Kalshi: 'error',
						Limitless: 'error'
					}
				});
				return;
			}

			if (!background) {
				state.update((current) => ({
					...current,
					isLoading: true,
					error: null,
					venueLoadState: { ...baseVenueLoadState }
				}));
			}

			const [venueStates, marketsResponse] = await Promise.all([
				Promise.all(venueOrder.map(async (venue) => [venue, await loadVenueState(baseUrl, venue)] as const)),
				withTimeout(fetch(`${baseUrl}/api/markets`), 12_000)
			]);
			const venueLoadState = venueStates.reduce<Record<Venue, VenueLoadState>>(
				(acc, [venue, loadState]) => ({ ...acc, [venue]: loadState }),
				{ ...baseVenueLoadState }
			);

			if (!marketsResponse.ok) {
				if (background) return;
				state.set({
					data: emptyMarketsData,
					isLoading: false,
					error: `Markets API returned ${marketsResponse.status}.`,
					venueLoadState
				});
				return;
			}

			const payload = normalizeMarketsPayload((await marketsResponse.json()) as MarketsApiResponse);
			for (const venue of venueOrder) {
				const hasVenue =
					payload.venues.includes(venue) || payload.markets.some((market) => market.venue === venue);
				if (hasVenue) venueLoadState[venue] = 'ready';
			}

			state.update((current) => ({
				data: payload,
				isLoading: false,
				error: null,
				venueLoadState
			}));
		} catch {
			if (background) return;
			state.set({
				data: emptyMarketsData,
				isLoading: false,
				error: 'Failed to load market data.',
				venueLoadState: {
					Alpha: 'error',
					Polymarket: 'error',
					Kalshi: 'error',
					Limitless: 'error'
				}
			});
		} finally {
			refreshInFlight = false;
		}
	};

	return {
		subscribe: state.subscribe,
		refresh
	};
};

export const setMarketDataContext = (): MarketDataContext => {
	const context = createMarketDataContext();
	setContext(MARKET_DATA_CONTEXT_KEY, context);
	return context;
};

export const getMarketDataContext = (): MarketDataContext => {
	const context = getContext<MarketDataContext | undefined>(MARKET_DATA_CONTEXT_KEY);
	if (!context) {
		throw new Error('Market data context is not set. Call setMarketDataContext in a parent layout.');
	}
	return context;
};
