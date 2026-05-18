export type FeedMode = 'LIVE' | 'PARTIAL' | 'STATIC';

export type Confidence = 'HIGH' | 'MED' | 'LOW';

export type Stat = {
	label: string;
	value: string;
};

export type SignalRow = {
	signal: string;
	market: string;
	venue: string;
	side: 'YES' | 'NO';
	price: string;
	fair: string;
	edge: string;
	liquidity: string;
	confidence: Confidence;
};

export type ProbabilityDriftView = {
	market: string;
	start: string;
	end: string;
	sparkline: string;
	oneHour: string;
	twentyFourHour: string;
	spread: string;
};

export type VenueHealthView = {
	venue: string;
	status: string;
	marketsIndexed: string;
	lastSync: string;
	apiMode: string;
	liquidityScore: string;
	volumeSignal: string;
};

export type DashboardViewModel = {
	dashboardTimestamp: string;
	navItems: string[];
	stats: Stat[];
	signalRows: SignalRow[];
	marketFeed: string[];
	venueHealth: VenueHealthView;
	probabilityDrift: ProbabilityDriftView;
	commandPrompts: string[];
	feedMode: FeedMode;
};

export type AlphaMarket = {
	marketAppId: number;
	id: string;
	slug: string;
	title: string;
	yesPrice: number | null;
	noPrice: number | null;
	liquidityUsd: number | null;
	dailyRewardsUsd: number | null;
	isLive: boolean | null;
	isResolved: boolean | null;
};

export type AlphaOrderbook = {
	marketAppId: number;
	bestBid: number | null;
	bestAsk: number | null;
	mid: number | null;
	spread: number | null;
	source: 'live' | 'unavailable' | 'error';
};

export type AlphaApiSnapshot = {
	markets: AlphaMarket[];
	orderbooks: Map<number, AlphaOrderbook>;
	fetchedAtIso: string;
	ok: boolean;
	error?: string;
};

export type AlphaBotStateSummary = {
	cash: number | null;
	realisedPnl: number | null;
	unrealisedPnl: number | null;
	totalPnl: number | null;
	estimatedRewardsUsd: number | null;
	lastUpdated: string | null;
};

export type AlphaMarketStatusSummary = {
	liveMarkets: number;
	resolvedMarkets: number;
	closedMarkets: number;
	totalKnownMarkets: number;
	lastSeenAt: string | null;
};

export type AlphaDbLiveMarket = {
	marketAppId: number;
	marketId: string | null;
	slug: string | null;
	lastSeenAt: string | null;
};

export type AlphaDbSnapshot = {
	botState: AlphaBotStateSummary | null;
	marketStatus: AlphaMarketStatusSummary | null;
	liveMarkets: AlphaDbLiveMarket[];
	ok: boolean;
	error?: string;
};

export type PolymarketDbLiveMarket = {
	conditionId: string;
	marketId: string | null;
	marketSlug: string | null;
	title: string | null;
	lastSeenAt: string | null;
};

export type PolymarketMarketStatusSummary = {
	liveMarkets: number;
	resolvedMarkets: number;
	closedMarkets: number;
	totalKnownMarkets: number;
	lastSeenAt: string | null;
};

export type PolymarketDbSnapshot = {
	marketStatus: PolymarketMarketStatusSummary | null;
	liveMarkets: PolymarketDbLiveMarket[];
	ok: boolean;
	error?: string;
};

export type DashboardApiResponse = DashboardViewModel & {
	meta: {
		apiOk: boolean;
		apiError?: string;
		dbOk: boolean;
		dbError?: string;
		dbLiveMarkets: number;
		fetchedAtIso: string;
	};
};

export type Venue = 'Alpha' | 'Polymarket' | 'Kalshi';
export type MarketCategory = 'Sports' | 'Crypto' | 'Politics' | 'Macro' | 'Culture' | 'Tech';
export type MarketSignal = 'SPREAD' | 'PARITY' | 'REWARD' | 'STALE' | 'LOW LIQ' | 'NONE';

export type MarketRow = {
	id: string;
	name: string;
	venue: Venue;
	category: MarketCategory;
	yesPrice: number;
	noPrice: number;
	spread: number;
	volume: number;
	liquidity: number;
	reward: boolean;
	expiry: string;
	signals: MarketSignal[];
	updated: string;
};

export type MarketsApiResponse = {
	dashboardTimestamp: string;
	feedMode: FeedMode;
	venues: Venue[];
	activeVenueCount: number;
	marketsIndexed: number;
	markets: MarketRow[];
	meta: {
		alphaApiOk: boolean;
		alphaApiError?: string;
		alphaDbOk: boolean;
		alphaDbError?: string;
		alphaDbLiveMarkets: number;
		polyDbOk: boolean;
		polyDbError?: string;
		polyDbLiveMarkets: number;
		polyApiOk: boolean;
		polyApiError?: string;
		kalshiApiOk: boolean;
		kalshiApiError?: string;
		fetchedAtIso: string;
	};
};
