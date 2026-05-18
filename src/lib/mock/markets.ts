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
	'Workspace'
];

export const stats: Stat[] = [
	{ label: 'Total Markets', value: '384' },
	{ label: 'Active Venues', value: '3' },
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

export const venueHealth = [
	{
		venue: 'Alpha',
		status: 'Online',
		marketsIndexed: '128',
		lastSync: '8s ago',
		apiMode: 'Mock',
		liquidityScore: '42/100',
		volumeSignal: 'Low'
	},
	{
		venue: 'Polymarket',
		status: 'Online',
		marketsIndexed: '128',
		lastSync: '8s ago',
		apiMode: 'Mock',
		liquidityScore: '55/100',
		volumeSignal: 'Tracked'
	},
	{
		venue: 'Kalshi',
		status: 'Online',
		marketsIndexed: '128',
		lastSync: '8s ago',
		apiMode: 'Mock',
		liquidityScore: '48/100',
		volumeSignal: 'Tracked'
	}
];

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

export type MarketCategory = 'Sports' | 'Crypto' | 'Politics' | 'Macro' | 'Culture' | 'Tech';
export type MarketSignal = 'SPREAD' | 'PARITY' | 'REWARD' | 'STALE' | 'LOW LIQ' | 'NONE';

export type MockMarket = {
	id: string;
	name: string;
	venue: 'Alpha';
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

export const mockMarkets: MockMarket[] = [
	{
		id: 'mkt-uefa-arsenal',
		name: 'UEFA Champions League Winner - Arsenal',
		venue: 'Alpha',
		category: 'Sports',
		yesPrice: 0.59,
		noPrice: 0.41,
		spread: 4.0,
		volume: 8420,
		liquidity: 1240,
		reward: true,
		expiry: '12d',
		signals: ['SPREAD'],
		updated: '8s ago'
	},
	{
		id: 'mkt-premier-liverpool',
		name: 'Premier League Winner - Liverpool',
		venue: 'Alpha',
		category: 'Sports',
		yesPrice: 0.22,
		noPrice: 0.78,
		spread: 2.1,
		volume: 6190,
		liquidity: 910,
		reward: true,
		expiry: '18d',
		signals: ['REWARD'],
		updated: '15s ago'
	},
	{
		id: 'mkt-nba-celtics',
		name: 'NBA Finals Winner - Celtics',
		venue: 'Alpha',
		category: 'Sports',
		yesPrice: 0.64,
		noPrice: 0.36,
		spread: 3.4,
		volume: 7720,
		liquidity: 1330,
		reward: false,
		expiry: '9d',
		signals: ['PARITY'],
		updated: '11s ago'
	},
	{
		id: 'mkt-btc-100k-june',
		name: 'Bitcoin Above $100k In June',
		venue: 'Alpha',
		category: 'Crypto',
		yesPrice: 0.58,
		noPrice: 0.42,
		spread: 5.4,
		volume: 11520,
		liquidity: 2020,
		reward: true,
		expiry: '24d',
		signals: ['SPREAD', 'REWARD'],
		updated: '6s ago'
	},
	{
		id: 'mkt-eth-etf-q3',
		name: 'ETH ETF Net Inflows Positive By Q3',
		venue: 'Alpha',
		category: 'Crypto',
		yesPrice: 0.47,
		noPrice: 0.53,
		spread: 3.8,
		volume: 6380,
		liquidity: 1490,
		reward: false,
		expiry: '31d',
		signals: ['SPREAD'],
		updated: '19s ago'
	},
	{
		id: 'mkt-sol-ath-year',
		name: 'Solana New ATH Before Year End',
		venue: 'Alpha',
		category: 'Crypto',
		yesPrice: 0.35,
		noPrice: 0.65,
		spread: 1.7,
		volume: 3010,
		liquidity: 490,
		reward: false,
		expiry: '198d',
		signals: ['LOW LIQ'],
		updated: '54s ago'
	},
	{
		id: 'mkt-us-election-popular',
		name: 'US Election Popular Vote - Democrat',
		venue: 'Alpha',
		category: 'Politics',
		yesPrice: 0.63,
		noPrice: 0.37,
		spread: 4.6,
		volume: 14200,
		liquidity: 2380,
		reward: false,
		expiry: '171d',
		signals: ['SPREAD'],
		updated: '12s ago'
	},
	{
		id: 'mkt-us-senate-control',
		name: 'US Senate Control - GOP',
		venue: 'Alpha',
		category: 'Politics',
		yesPrice: 0.49,
		noPrice: 0.51,
		spread: 2.9,
		volume: 5870,
		liquidity: 990,
		reward: false,
		expiry: '168d',
		signals: ['PARITY'],
		updated: '21s ago'
	},
	{
		id: 'mkt-uk-general-election',
		name: 'UK General Election Before November',
		venue: 'Alpha',
		category: 'Politics',
		yesPrice: 0.27,
		noPrice: 0.73,
		spread: 0.9,
		volume: 1290,
		liquidity: 180,
		reward: false,
		expiry: '66d',
		signals: ['STALE', 'LOW LIQ'],
		updated: '9m ago'
	},
	{
		id: 'mkt-fed-cut-sept',
		name: 'Fed Rate Cut By September Meeting',
		venue: 'Alpha',
		category: 'Macro',
		yesPrice: 0.52,
		noPrice: 0.48,
		spread: 3.1,
		volume: 10110,
		liquidity: 1820,
		reward: true,
		expiry: '113d',
		signals: ['REWARD'],
		updated: '16s ago'
	},
	{
		id: 'mkt-cpi-yoy-above-3',
		name: 'US CPI YoY Above 3.0% Next Print',
		venue: 'Alpha',
		category: 'Macro',
		yesPrice: 0.38,
		noPrice: 0.62,
		spread: 4.3,
		volume: 4740,
		liquidity: 810,
		reward: false,
		expiry: '27d',
		signals: ['SPREAD'],
		updated: '23s ago'
	},
	{
		id: 'mkt-eu-gdp-rebound',
		name: 'Eurozone GDP Rebound In Q3',
		venue: 'Alpha',
		category: 'Macro',
		yesPrice: 0.44,
		noPrice: 0.56,
		spread: 2.2,
		volume: 2280,
		liquidity: 410,
		reward: false,
		expiry: '74d',
		signals: ['NONE'],
		updated: '41s ago'
	},
	{
		id: 'mkt-eurovision-winner',
		name: 'Eurovision Winner - Sweden',
		venue: 'Alpha',
		category: 'Culture',
		yesPrice: 0.31,
		noPrice: 0.69,
		spread: 6.2,
		volume: 980,
		liquidity: 120,
		reward: false,
		expiry: '4d',
		signals: ['SPREAD', 'LOW LIQ'],
		updated: '3m ago'
	},
	{
		id: 'mkt-oscar-best-picture',
		name: 'Oscars Best Picture - Indie Film',
		venue: 'Alpha',
		category: 'Culture',
		yesPrice: 0.19,
		noPrice: 0.81,
		spread: 2.7,
		volume: 740,
		liquidity: 105,
		reward: false,
		expiry: '202d',
		signals: ['LOW LIQ'],
		updated: '5m ago'
	},
	{
		id: 'mkt-superbowl-halftime',
		name: 'Super Bowl Halftime - Pop Artist X',
		venue: 'Alpha',
		category: 'Culture',
		yesPrice: 0.42,
		noPrice: 0.58,
		spread: 1.2,
		volume: 1620,
		liquidity: 260,
		reward: true,
		expiry: '211d',
		signals: ['REWARD'],
		updated: '58s ago'
	},
	{
		id: 'mkt-openai-gpt6-year',
		name: 'OpenAI Ships GPT-6 This Calendar Year',
		venue: 'Alpha',
		category: 'Tech',
		yesPrice: 0.55,
		noPrice: 0.45,
		spread: 3.6,
		volume: 8930,
		liquidity: 1450,
		reward: true,
		expiry: '226d',
		signals: ['SPREAD', 'REWARD'],
		updated: '10s ago'
	},
	{
		id: 'mkt-apple-vision-v2',
		name: 'Apple Announces Vision Pro V2 By Q4',
		venue: 'Alpha',
		category: 'Tech',
		yesPrice: 0.33,
		noPrice: 0.67,
		spread: 2.5,
		volume: 3560,
		liquidity: 690,
		reward: false,
		expiry: '142d',
		signals: ['PARITY'],
		updated: '35s ago'
	},
	{
		id: 'mkt-nvidia-4t-revenue',
		name: 'NVIDIA Quarterly Revenue Above $40B',
		venue: 'Alpha',
		category: 'Tech',
		yesPrice: 0.61,
		noPrice: 0.39,
		spread: 4.8,
		volume: 9740,
		liquidity: 1720,
		reward: false,
		expiry: '39d',
		signals: ['SPREAD'],
		updated: '13s ago'
	},
	{
		id: 'mkt-ai-reg-act-eu',
		name: 'EU AI Regulation Act Fully Enforced By Q1',
		venue: 'Alpha',
		category: 'Tech',
		yesPrice: 0.29,
		noPrice: 0.71,
		spread: 0.8,
		volume: 890,
		liquidity: 140,
		reward: false,
		expiry: '267d',
		signals: ['STALE'],
		updated: '12m ago'
	},
	{
		id: 'mkt-oil-90-sept',
		name: 'Brent Crude Above $90 Before September',
		venue: 'Alpha',
		category: 'Macro',
		yesPrice: 0.46,
		noPrice: 0.54,
		spread: 3.3,
		volume: 6480,
		liquidity: 1090,
		reward: false,
		expiry: '96d',
		signals: ['SPREAD'],
		updated: '18s ago'
	},
	{
		id: 'mkt-olympics-us-top-medals',
		name: 'Olympics 2028 - USA Tops Medal Table',
		venue: 'Alpha',
		category: 'Sports',
		yesPrice: 0.67,
		noPrice: 0.33,
		spread: 2.0,
		volume: 1870,
		liquidity: 310,
		reward: false,
		expiry: '794d',
		signals: ['NONE'],
		updated: '1m ago'
	}
];
