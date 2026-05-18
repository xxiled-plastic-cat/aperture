import { commandPrompts, fallbackDashboard, navItems } from '../fallback';
import type { AlphaApiSnapshot, AlphaDbSnapshot, DashboardViewModel, FeedMode, SignalRow, Stat } from '../types';

const formatUtcTimestamp = (date: Date): string =>
	date.toISOString().replace('T', ' ').replace('Z', ' UTC');

const formatPct = (value: number): string => `${(value * 100).toFixed(1)}%`;
const formatMoney = (value: number): string =>
	`$${new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(Math.max(0, value))}`;

const sparklineFromDelta = (delta: number): string => {
	if (delta > 0.06) return '▁▂▃▄▅▆▇';
	if (delta > 0.02) return '▂▂▃▄▅▆▆';
	if (delta < -0.06) return '▇▆▅▄▃▂▁';
	if (delta < -0.02) return '▆▆▅▄▃▂▂';
	return '▃▃▄▅▄▅▅';
};

const deriveSignalType = (spread: number, hasRewards: boolean): string => {
	if (spread >= 0.05) return 'Spread capture';
	if (hasRewards) return 'Reward lane';
	return 'Parity gap';
};

const deriveConfidence = (liquidityUsd: number): SignalRow['confidence'] => {
	if (liquidityUsd >= 1500) return 'HIGH';
	if (liquidityUsd >= 600) return 'MED';
	return 'LOW';
};

export const mapDashboard = (api: AlphaApiSnapshot, db: AlphaDbSnapshot): DashboardViewModel => {
	const now = new Date();
	const hasApiData = api.ok && api.markets.length > 0;
	const hasDbData = db.ok && (db.botState !== null || db.marketStatus !== null || db.liveMarkets.length > 0);

	const feedMode: FeedMode = hasApiData && hasDbData ? 'LIVE' : hasApiData || hasDbData ? 'PARTIAL' : 'STATIC';
	if (!hasApiData && !hasDbData) {
		return fallbackDashboard;
	}

	const spreadValues: number[] = [];
	const signalRows: SignalRow[] = api.markets
		.map((market) => {
			const book = api.orderbooks.get(market.marketAppId);
			const price = market.yesPrice ?? book?.mid ?? null;
			const fair = market.noPrice !== null ? 1 - market.noPrice : book?.mid ?? null;
			const spread =
				book?.spread ??
				(market.yesPrice !== null && market.noPrice !== null
					? Math.abs(1 - market.yesPrice - market.noPrice)
					: null);
			if (spread !== null) spreadValues.push(spread);

			if (price === null || fair === null) return null;
			const edge = Math.abs(fair - price);
			if (edge <= 0.002) return null;

			const liquidity = market.liquidityUsd ?? 0;
			return {
				signal: deriveSignalType(spread ?? 0, (market.dailyRewardsUsd ?? 0) > 0),
				market: market.title,
				venue: 'Alpha',
				side: fair >= price ? 'YES' : 'NO',
				price: price.toFixed(2),
				fair: fair.toFixed(2),
				edge: `${fair >= price ? '+' : '-'}${(edge * 100).toFixed(1)}%`,
				liquidity: formatMoney(liquidity),
				confidence: deriveConfidence(liquidity)
			} satisfies SignalRow;
		})
		.filter((row): row is SignalRow => row !== null)
		.sort((a, b) => Number.parseFloat(b.edge) - Number.parseFloat(a.edge))
		.slice(0, 12);

	const avgSpread = spreadValues.length
		? spreadValues.reduce((acc, value) => acc + value, 0) / spreadValues.length
		: null;
	const rewardEligibleCount = api.markets.filter((market) => (market.dailyRewardsUsd ?? 0) > 0).length;
	const estimatedEdge = signalRows.reduce((acc, row) => {
		const edgePct = Number.parseFloat(row.edge.replace('%', '')) / 100;
		const liquidity = Number.parseFloat(row.liquidity.replace(/[$,]/g, ''));
		if (!Number.isFinite(edgePct) || !Number.isFinite(liquidity)) return acc;
		return acc + Math.max(0, edgePct) * liquidity;
	}, 0);

	const stats: Stat[] = [
		{ label: 'Total Markets', value: String(api.markets.length || db.marketStatus?.totalKnownMarkets || 0) },
		{ label: 'Active Venues', value: '1' },
		{ label: 'Avg Spread', value: avgSpread !== null ? formatPct(avgSpread) : 'n/a' },
		{ label: 'Open Signal Count', value: String(signalRows.length) },
		{ label: 'Reward Eligible', value: String(rewardEligibleCount) },
		{ label: 'Estimated Edge', value: formatMoney(estimatedEdge) }
	];

	const marketFeed = signalRows.slice(0, 5).map((row) => {
		const stamp = now.toISOString().slice(11, 19);
		return `${stamp}  ${row.signal.toLowerCase()} ${row.edge} on ${row.market}`;
	});
	if (marketFeed.length === 0) {
		marketFeed.push(`${now.toISOString().slice(11, 19)}  market sync complete with no fresh edges`);
	}

	const botCash = db.botState?.cash ?? 0;
	const botTotalPnl = db.botState?.totalPnl ?? 0;
	const liquidityPool = api.markets.reduce((acc, market) => acc + (market.liquidityUsd ?? 0), 0);
	const liquidityScore = Math.min(100, Math.round(liquidityPool / 5000));
	const venueHealth = [
		{
			venue: 'Alpha',
			status: feedMode === 'LIVE' ? 'Online' : feedMode === 'PARTIAL' ? 'Degraded' : 'Fallback',
			marketsIndexed: String(api.markets.length || db.marketStatus?.totalKnownMarkets || 0),
			lastSync: feedMode === 'STATIC' ? 'n/a' : 'just now',
			apiMode: feedMode === 'LIVE' ? 'Hybrid' : feedMode === 'PARTIAL' ? 'Partial' : 'Mock',
			liquidityScore: `${liquidityScore}/100`,
			volumeSignal: botCash > 0 || botTotalPnl !== 0 ? 'Tracked' : liquidityPool > 25_000 ? 'High' : 'Low'
		}
	];

	const driftCandidate = signalRows[0];
	const probabilityDrift = driftCandidate
		? (() => {
				const start = Number.parseFloat(driftCandidate.fair);
				const end = Number.parseFloat(driftCandidate.price);
				const delta = end - start;
				return {
					market: driftCandidate.market,
					start: start.toFixed(2),
					end: end.toFixed(2),
					sparkline: sparklineFromDelta(delta),
					oneHour: `${delta >= 0 ? '+' : ''}${(delta * 100).toFixed(1)}%`,
					twentyFourHour: `${delta >= 0 ? '+' : ''}${(delta * 260).toFixed(1)}%`,
					spread: avgSpread !== null ? formatPct(avgSpread) : 'n/a'
				};
			})()
		: fallbackDashboard.probabilityDrift;

	return {
		dashboardTimestamp: formatUtcTimestamp(now),
		navItems,
		stats,
		signalRows,
		marketFeed,
		venueHealth,
		probabilityDrift,
		commandPrompts,
		feedMode
	};
};
