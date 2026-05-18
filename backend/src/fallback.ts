import type { DashboardViewModel } from './types';

export const navItems = [
	'Overview',
	'Markets',
	'Scanner',
	'Signals',
	'Venues',
	'Portfolio',
	'Alerts',
	'Workspace'
];

export const commandPrompts = ['scan parity gaps', 'show reward lanes', 'find stale prices'];

export const fallbackDashboard: DashboardViewModel = {
	dashboardTimestamp: '2026-05-18 13:18:42 UTC',
	navItems,
	stats: [
		{ label: 'Total Markets', value: '128' },
		{ label: 'Active Venues', value: '1' },
		{ label: 'Avg Spread', value: '4.2%' },
		{ label: 'Open Signal Count', value: '17' },
		{ label: 'Reward Eligible', value: '9' },
		{ label: 'Estimated Edge', value: '$38.40' }
	],
	signalRows: [
		{
			signal: 'Spread capture',
			market: 'UEFA Champions League Winner - Arsenal',
			venue: 'Alpha',
			side: 'NO',
			price: '0.41',
			fair: '0.37',
			edge: '+4.0%',
			liquidity: '$1,240',
			confidence: 'HIGH'
		},
		{
			signal: 'Parity gap',
			market: 'Bitcoin above $100k in June',
			venue: 'Alpha',
			side: 'YES',
			price: '0.58',
			fair: '0.54',
			edge: '+4.0%',
			liquidity: '$840',
			confidence: 'MED'
		}
	],
	marketFeed: [
		'12:42:18  spread widened on Arsenal NO',
		'12:41:03  reward lane detected on Liverpool YES',
		'12:39:44  parity deviation cleared: BTC > $100k'
	],
	venueHealth: {
		venue: 'Alpha Arcade',
		status: 'Fallback',
		marketsIndexed: '128',
		lastSync: 'n/a',
		apiMode: 'Mock',
		liquidityScore: '42/100',
		volumeSignal: 'Low'
	},
	probabilityDrift: {
		market: 'BTC above $100k in June',
		start: '0.49',
		end: '0.58',
		sparkline: '▂▃▄▅▃▆▇',
		oneHour: '+2.1%',
		twentyFourHour: '+6.8%',
		spread: '5.4%'
	},
	commandPrompts,
	feedMode: 'STATIC'
};
