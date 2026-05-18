import type { FeedMode } from './dashboard';

export type Venue = 'Alpha' | 'Polymarket' | 'Kalshi' | 'Limitless';
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
	meta?: {
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
		limitlessApiOk: boolean;
		limitlessApiError?: string;
		fetchedAtIso: string;
	};
};
