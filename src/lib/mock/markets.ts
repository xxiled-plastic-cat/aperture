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

export const dashboardTimestamp = '2026-05-18 13:18:42 UTC';

export const navItems = [
	'Overview',
	'Markets',
	'Scanner',
	'Signals',
	'Venues',
	'Portfolio',
	'Alerts',
	'Settings'
];

export const stats: Stat[] = [
	{ label: 'Total Markets', value: '128' },
	{ label: 'Active Venues', value: '1' },
	{ label: 'Avg Spread', value: '4.2%' },
	{ label: 'Open Signal Count', value: '17' },
	{ label: 'Reward Eligible', value: '9' },
	{ label: 'Estimated Edge', value: '$38.40' }
];

export const signalRows: SignalRow[] = [
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
	},
	{
		signal: 'Reward lane',
		market: 'Premier League Winner - Liverpool',
		venue: 'Alpha',
		side: 'YES',
		price: '0.22',
		fair: '0.21',
		edge: '+1.0%',
		liquidity: '$420',
		confidence: 'HIGH'
	},
	{
		signal: 'Stale price',
		market: 'US Election Popular Vote',
		venue: 'Alpha',
		side: 'NO',
		price: '0.63',
		fair: '0.59',
		edge: '+4.0%',
		liquidity: '$2,100',
		confidence: 'MED'
	},
	{
		signal: 'Order imbalance',
		market: 'Eurovision Winner',
		venue: 'Alpha',
		side: 'YES',
		price: '0.31',
		fair: '0.29',
		edge: '+2.0%',
		liquidity: '$180',
		confidence: 'LOW'
	}
];

export const marketFeed = [
	'12:42:18  spread widened on Arsenal NO',
	'12:41:03  reward lane detected on Liverpool YES',
	'12:39:44  parity deviation cleared: BTC > $100k',
	'12:36:12  low-liquidity warning: Eurovision Winner',
	'12:31:08  new market indexed: US CPI above forecast'
];

export const venueHealth = {
	venue: 'Alpha Arcade',
	status: 'Online',
	marketsIndexed: '128',
	lastSync: '8s ago',
	apiMode: 'Mock',
	liquidityScore: '42/100',
	volumeSignal: 'Low'
};

export const probabilityDrift = {
	market: 'BTC above $100k in June',
	start: '0.49',
	end: '0.58',
	sparkline: '▂▃▄▅▃▆▇',
	oneHour: '+2.1%',
	twentyFourHour: '+6.8%',
	spread: '5.4%'
};

export const commandPrompts = ['scan parity gaps', 'show reward lanes', 'find stale prices'];
