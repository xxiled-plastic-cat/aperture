import type { SignalRow, Stat } from '$lib/mock/markets';

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
	};
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
		apiOk: boolean;
		apiError?: string;
		dbOk: boolean;
		dbError?: string;
		dbLiveMarkets: number;
		fetchedAtIso: string;
	};
};
