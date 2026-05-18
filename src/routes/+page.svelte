<script lang="ts">
	import { onMount } from 'svelte';

	import CommandBar from '$lib/components/CommandBar.svelte';
	import Header from '$lib/components/Header.svelte';
	import MarketFeed from '$lib/components/MarketFeed.svelte';
	import Panel from '$lib/components/Panel.svelte';
	import Sidebar from '$lib/components/Sidebar.svelte';
	import SignalTable from '$lib/components/SignalTable.svelte';
	import StatCard from '$lib/components/StatCard.svelte';
	import type { DashboardApiResponse } from '$lib/types/dashboard';
	import {
		commandPrompts,
		dashboardTimestamp,
		marketFeed,
		navItems,
		probabilityDrift,
		signalRows,
		stats,
		venueHealth
	} from '$lib/mock/markets';

	const fallbackData: DashboardApiResponse = {
		dashboardTimestamp,
		navItems,
		stats,
		signalRows,
		marketFeed,
		venueHealth: { ...venueHealth, status: 'Fallback', apiMode: 'Mock' },
		probabilityDrift,
		commandPrompts,
		feedMode: 'STATIC'
	};

	let data: DashboardApiResponse = fallbackData;

	onMount(async () => {
		const baseUrl = (
			(import.meta.env.PUBLIC_API_BASE_URL as string | undefined) ??
			(import.meta.env.VITE_PUBLIC_API_BASE_URL as string | undefined)
		)?.trim();
		if (!baseUrl) {
			console.warn('PUBLIC_API_BASE_URL is missing; staying on fallback data.');
			return;
		}
		try {
			const response = await fetch(`${baseUrl}/api/dashboard`);
			if (!response.ok) return;
			const payload = (await response.json()) as DashboardApiResponse;
			if (payload && Array.isArray(payload.stats) && Array.isArray(payload.signalRows)) {
				data = payload;
			}
		} catch {
			// Keep static fallback in UI when backend is unavailable.
		}
	});
</script>

<svelte:head>
	<title>Aperture Terminal</title>
</svelte:head>

<div class="flex h-[100dvh] max-h-[100dvh] flex-col overflow-hidden bg-bg text-textPrimary">
	<Header timestamp={data.dashboardTimestamp} feedMode={data.feedMode} />

	<div class="grid min-h-0 flex-1 grid-cols-[136px_1fr] overflow-hidden">
		<div class="min-h-0 overflow-y-auto pb-[calc(7rem+env(safe-area-inset-bottom,0px))]">
			<Sidebar items={data.navItems} active="Overview" />
		</div>

		<main class="min-h-0 overflow-hidden">
			<div class="h-full space-y-3 overflow-y-auto p-3 pr-4 pb-[calc(7rem+env(safe-area-inset-bottom,0px))]">
					<Panel title="Market Snapshot" subtitle="EDGE DETECTED">
						<div class="grid grid-cols-2 gap-2 xl:grid-cols-3">
							{#each data.stats as stat}
								<StatCard label={stat.label} value={stat.value} />
							{/each}
						</div>
					</Panel>

					<Panel title="Signal Scanner" subtitle={`${data.signalRows.length} opportunities`}>
						<SignalTable rows={data.signalRows} />
					</Panel>

					<div class="grid gap-3 lg:grid-cols-3">
						<Panel title="Market Feed" subtitle="ALPHA FEED">
							<MarketFeed events={data.marketFeed} />
						</Panel>

						<Panel title="Venue Health">
							<div class="space-y-1 font-mono text-[11px] text-textSecondary">
								<div class="flex justify-between border-b border-border/60 py-1">
									<span>Venue</span>
									<span class="text-textPrimary">{data.venueHealth.venue}</span>
								</div>
								<div class="flex justify-between border-b border-border/60 py-1">
									<span>Status</span>
									<span class={data.feedMode === 'LIVE' ? 'text-terminalGreen' : data.feedMode === 'PARTIAL' ? 'text-amber' : 'text-textMuted'}>{data.venueHealth.status}</span>
								</div>
								<div class="flex justify-between border-b border-border/60 py-1">
									<span>Markets Indexed</span>
									<span class="tabular-nums text-textPrimary">{data.venueHealth.marketsIndexed}</span>
								</div>
								<div class="flex justify-between border-b border-border/60 py-1">
									<span>Last Sync</span>
									<span>{data.venueHealth.lastSync}</span>
								</div>
								<div class="flex justify-between border-b border-border/60 py-1">
									<span>API Mode</span>
									<span class="text-mutedGold">{data.venueHealth.apiMode}</span>
								</div>
								<div class="flex justify-between border-b border-border/60 py-1">
									<span>Liquidity Score</span>
									<span>{data.venueHealth.liquidityScore}</span>
								</div>
								<div class="flex justify-between py-1">
									<span>Volume Signal</span>
									<span class="text-amber">{data.venueHealth.volumeSignal}</span>
								</div>
							</div>
						</Panel>

						<Panel title="Probability Drift">
							<div class="space-y-2 font-mono text-[11px] text-textSecondary">
								<p class="text-textPrimary">Market: {data.probabilityDrift.market}</p>
								<div class="rounded-sm border border-border bg-panelAlt px-2 py-3 text-center text-sm tabular-nums">
									<span class="text-textSecondary">{data.probabilityDrift.start}</span>
									<span class="mx-2 text-signalCyan">{data.probabilityDrift.sparkline}</span>
									<span class="text-terminalGreen">{data.probabilityDrift.end}</span>
								</div>
								<div class="grid grid-cols-3 gap-2 text-center">
									<div class="rounded-sm border border-border bg-panelAlt px-1 py-1">
										<p class="text-textMuted">1h</p>
										<p class="tabular-nums text-terminalGreen">{data.probabilityDrift.oneHour}</p>
									</div>
									<div class="rounded-sm border border-border bg-panelAlt px-1 py-1">
										<p class="text-textMuted">24h</p>
										<p class="tabular-nums text-terminalGreen">{data.probabilityDrift.twentyFourHour}</p>
									</div>
									<div class="rounded-sm border border-border bg-panelAlt px-1 py-1">
										<p class="text-textMuted">Spread</p>
										<p class="tabular-nums text-amber">{data.probabilityDrift.spread}</p>
									</div>
								</div>
							</div>
						</Panel>
					</div>
			</div>
		</main>
	</div>

	<div
		class="fixed bottom-0 left-0 right-0 z-40 border-t border-border bg-bg px-4 py-2 pb-[calc(0.5rem+env(safe-area-inset-bottom,0px))]"
	>
		<CommandBar />
	</div>
</div>
