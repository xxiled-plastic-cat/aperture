const MS_PER_DAY = 1000 * 60 * 60 * 24;

const parseIsoMs = (value: string | null | undefined): number | null => {
	if (!value) return null;
	const ms = Date.parse(value);
	return Number.isFinite(ms) ? ms : null;
};

const parseUnixSecondsMs = (value: number | null | undefined): number | null => {
	if (value === null || value === undefined || !Number.isFinite(value) || value <= 0) return null;
	return value > 1_000_000_000_000 ? value : value * 1000;
};

export const formatExpiryLabelFromMs = (ms: number | null): string => {
	if (ms === null) return 'n/a';
	const days = Math.max(0, Math.ceil((ms - Date.now()) / MS_PER_DAY));
	if (days <= 0) return '0d';
	return `${days}d`;
};

export const formatExpiryLabelFromIso = (iso: string | null | undefined): string =>
	formatExpiryLabelFromMs(parseIsoMs(iso));

export const formatExpiryLabelFromUnixSeconds = (seconds: number | null | undefined): string =>
	formatExpiryLabelFromMs(parseUnixSecondsMs(seconds));

export const formatUpdatedLabel = (
	updatedAtIso: string | null | undefined,
	fallbackIso: string
): string => {
	const updatedMs = parseIsoMs(updatedAtIso) ?? parseIsoMs(fallbackIso);
	if (updatedMs === null) return 'n/a';

	const ageSec = Math.max(0, Math.floor((Date.now() - updatedMs) / 1000));
	if (ageSec < 60) return `${ageSec}s ago`;
	if (ageSec < 3600) return `${Math.floor(ageSec / 60)}m ago`;
	if (ageSec < 86_400) return `${Math.floor(ageSec / 3600)}h ago`;
	return `${Math.floor(ageSec / 86_400)}d ago`;
};

export const roundUsd = (value: number | null | undefined): number =>
	Math.max(0, Math.round(value ?? 0));
