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
