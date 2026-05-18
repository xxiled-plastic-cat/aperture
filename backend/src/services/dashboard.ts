import { loadAlphaApiSnapshot } from '../alpha/client';
import { loadAlphaDbSnapshot } from '../alpha/db';
import { mapDashboard } from '../alpha/mapDashboard';
import type { DashboardApiResponse } from '../types';

export const buildDashboardResponse = async (): Promise<DashboardApiResponse> => {
	const dbSnapshot = await loadAlphaDbSnapshot();
	const apiSnapshot = await loadAlphaApiSnapshot(dbSnapshot.liveMarkets);
	const payload = mapDashboard(apiSnapshot, dbSnapshot);
	return {
		...payload,
		meta: {
			apiOk: apiSnapshot.ok,
			apiError: apiSnapshot.error,
			dbOk: dbSnapshot.ok,
			dbError: dbSnapshot.error,
			dbLiveMarkets: dbSnapshot.liveMarkets.length,
			fetchedAtIso: new Date().toISOString()
		}
	};
};
