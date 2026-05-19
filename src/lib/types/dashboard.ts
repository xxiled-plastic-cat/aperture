import type { SignalRow, Stat } from './views';

export type { Confidence, SignalRow, Stat } from './views';

export type FeedMode = 'LIVE' | 'PARTIAL' | 'STATIC';

export type DashboardViewModel = {
	dashboardTimestamp: string;
	navItems: string[];
	stats: Stat[];
	signalRows: SignalRow[];
	marketFeed: string[];
	venueHealth: {
		venue: string;
		status: string;
		marketsIndexed: string;
		lastSync: string;
		apiMode: string;
		liquidityScore: string;
		volumeSignal: string;
	}[];
	probabilityDrift: {
		market: string;
		start: string;
		end: string;
		sparkline: string;
		oneHour: string;
		twentyFourHour: string;
		spread: string;
	};
	commandPrompts: string[];
	feedMode: FeedMode;
};

export type DashboardApiResponse = DashboardViewModel & {
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
		fetchedAtIso: string;
	};
};
