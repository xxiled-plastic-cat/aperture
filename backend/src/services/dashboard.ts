import { commandPrompts, fallbackDashboard, navItems } from '../fallback';
import type { DashboardApiResponse, FeedMode, MarketRow, SignalRow, Stat, Venue } from '../types';
import { buildMarketsResponse } from './markets';

const venueOrder: Venue[] = ['Alpha', 'Polymarket', 'Kalshi'];

const formatPct = (value: number): string => `${value.toFixed(1)}%`;
const formatMoney = (value: number): string =>
	`$${new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(Math.max(0, value))}`;

const signalLabel = (market: MarketRow): string => {
	const primarySignal = market.signals.find((signal) => signal !== 'NONE') ?? 'NONE';
	if (primarySignal === 'SPREAD') return 'Spread capture';
	if (primarySignal === 'PARITY') return 'Parity gap';
	if (primarySignal === 'REWARD') return 'Reward lane';
	if (primarySignal === 'STALE') return 'Stale price';
	if (primarySignal === 'LOW LIQ') return 'Low liquidity';
	return 'Market watch';
};

const confidenceForLiquidity = (liquidity: number): SignalRow['confidence'] => {
	if (liquidity >= 1500) return 'HIGH';
	if (liquidity >= 600) return 'MED';
	return 'LOW';
};

const signalRowsFromMarkets = (markets: MarketRow[]): SignalRow[] => {
	return markets
		.filter((market) => !market.signals.includes('NONE'))
		.map((market) => {
			const fair = Math.max(0, Math.min(1, 1 - market.noPrice));
			const edge = Math.max(market.spread / 100, Math.abs(fair - market.yesPrice));
			return {
				signal: signalLabel(market),
				market: market.name,
				venue: market.venue,
				side: fair >= market.yesPrice ? 'YES' : 'NO',
				price: market.yesPrice.toFixed(2),
				fair: fair.toFixed(2),
				edge: `+${(edge * 100).toFixed(1)}%`,
				liquidity: formatMoney(market.liquidity),
				confidence: confidenceForLiquidity(market.liquidity)
			} satisfies SignalRow;
		})
		.sort((a, b) => Number.parseFloat(b.edge) - Number.parseFloat(a.edge))
		.slice(0, 12);
};

const venueStatus = (venue: Venue, meta: DashboardApiResponse['meta'], feedMode: FeedMode): string => {
	if (venue === 'Alpha') {
		if (meta.alphaApiOk) return 'Online';
		if (meta.alphaDbOk && meta.alphaDbLiveMarkets > 0) return 'Degraded';
		return feedMode === 'STATIC' ? 'Fallback' : 'Offline';
	}
	if (venue === 'Polymarket') {
		if (meta.polyApiOk) return 'Online';
		if (meta.polyDbOk && meta.polyDbLiveMarkets > 0) return 'Degraded';
		return feedMode === 'STATIC' ? 'Fallback' : 'Offline';
	}
	if (meta.kalshiApiOk) return 'Online';
	return feedMode === 'STATIC' ? 'Fallback' : 'Offline';
};

const venueApiMode = (venue: Venue, meta: DashboardApiResponse['meta']): string => {
	if (venue === 'Alpha') return meta.alphaApiOk ? 'API + DB' : meta.alphaDbOk ? 'DB fallback' : 'Unavailable';
	if (venue === 'Polymarket') return meta.polyApiOk ? 'API + DB' : meta.polyDbOk ? 'DB fallback' : 'Unavailable';
	return meta.kalshiApiOk ? 'Public API' : 'Unavailable';
};

export const buildDashboardResponse = async (): Promise<DashboardApiResponse> => {
	const marketsResponse = await buildMarketsResponse();
	const markets = marketsResponse.markets;
	const signalRows = signalRowsFromMarkets(markets);
	const spreadValues = markets.map((market) => market.spread).filter((spread) => spread > 0);
	const avgSpread =
		spreadValues.length > 0 ? spreadValues.reduce((acc, spread) => acc + spread, 0) / spreadValues.length : null;
	const rewardEligibleCount = markets.filter((market) => market.reward).length;
	const estimatedEdge = signalRows.reduce((acc, row) => {
		const edgePct = Number.parseFloat(row.edge.replace('%', '')) / 100;
		const liquidity = Number.parseFloat(row.liquidity.replace(/[$,]/g, ''));
		if (!Number.isFinite(edgePct) || !Number.isFinite(liquidity)) return acc;
		return acc + edgePct * liquidity;
	}, 0);
	const stats: Stat[] = [
		{ label: 'Total Markets', value: String(marketsResponse.marketsIndexed) },
		{ label: 'Active Venues', value: String(marketsResponse.activeVenueCount) },
		{ label: 'Avg Spread', value: avgSpread !== null ? formatPct(avgSpread) : 'n/a' },
		{ label: 'Open Signal Count', value: String(signalRows.length) },
		{ label: 'Reward Eligible', value: String(rewardEligibleCount) },
		{ label: 'Estimated Edge', value: formatMoney(estimatedEdge) }
	];
	const now = new Date();
	const marketFeed = signalRows.slice(0, 5).map((row) => {
		const stamp = now.toISOString().slice(11, 19);
		return `${stamp}  ${row.venue}: ${row.signal.toLowerCase()} ${row.edge} on ${row.market}`;
	});
	if (marketFeed.length === 0) {
		marketFeed.push(`${now.toISOString().slice(11, 19)}  multi-venue sync complete with no fresh edges`);
	}
	const meta = {
		...marketsResponse.meta,
		fetchedAtIso: new Date().toISOString()
	};
	const venueHealth = venueOrder.map((venue) => {
		const venueMarkets = markets.filter((market) => market.venue === venue);
		const liquidityPool = venueMarkets.reduce((acc, market) => acc + market.liquidity, 0);
		const volumePool = venueMarkets.reduce((acc, market) => acc + market.volume, 0);
		const liquidityScore = Math.min(100, Math.round(liquidityPool / 5000));
		return {
			venue,
			status: venueStatus(venue, meta, marketsResponse.feedMode),
			marketsIndexed: String(venueMarkets.length),
			lastSync: venueMarkets.length > 0 ? 'just now' : 'n/a',
			apiMode: venueApiMode(venue, meta),
			liquidityScore: `${liquidityScore}/100`,
			volumeSignal: volumePool > 100_000 ? 'High' : volumePool > 0 ? 'Tracked' : 'None'
		};
	});
	const driftCandidate = signalRows[0];
	const probabilityDrift = driftCandidate
		? {
				market: driftCandidate.market,
				start: driftCandidate.fair,
				end: driftCandidate.price,
				sparkline: '▂▃▄▅▃▆▇',
				oneHour: driftCandidate.edge,
				twentyFourHour: driftCandidate.edge,
				spread: avgSpread !== null ? formatPct(avgSpread) : 'n/a'
			}
		: fallbackDashboard.probabilityDrift;
	const payload = {
		dashboardTimestamp: marketsResponse.dashboardTimestamp,
		navItems,
		stats,
		signalRows,
		marketFeed,
		venueHealth,
		probabilityDrift,
		commandPrompts,
		feedMode: marketsResponse.feedMode
	};
	return {
		...payload,
		meta
	};
};
