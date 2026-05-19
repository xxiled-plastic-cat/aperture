<script lang="ts">
	import CommandBar from '$lib/components/CommandBar.svelte';
	import Header from '$lib/components/Header.svelte';
	import MarketDataErrorBanner from '$lib/components/MarketDataErrorBanner.svelte';
	import MarketFeed from '$lib/components/MarketFeed.svelte';
	import Panel from '$lib/components/Panel.svelte';
	import Sidebar from '$lib/components/Sidebar.svelte';
	import SignalTable from '$lib/components/SignalTable.svelte';
	import StatCard from '$lib/components/StatCard.svelte';
	import {
		buildDashboardFromMarketSnapshot,
		getMarketDataContext,
		initialMarketDataSnapshot
	} from '$lib/context/marketData';
	import type { DashboardApiResponse } from '$lib/types/dashboard';
	const marketData = getMarketDataContext();
	let data: DashboardApiResponse = buildDashboardFromMarketSnapshot(initialMarketDataSnapshot);

	$: data = buildDashboardFromMarketSnapshot($marketData);
</script>

<svelte:head>
	<title>Aperture Terminal</title>
</svelte:head>

<div class="flex h-[100dvh] max-h-[100dvh] flex-col overflow-hidden bg-bg text-textPrimary">
	<Header timestamp={data.dashboardTimestamp} feedMode={data.feedMode} />
	<MarketDataErrorBanner message={$marketData.error} />

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
						<SignalTable rows={data.signalRows} showUnavailable={!!$marketData.error} />
					</Panel>

					<div class="grid gap-3 lg:grid-cols-3">
						<Panel title="Market Feed" subtitle="MULTI-VENUE FEED" fill={true}>
							<MarketFeed events={data.marketFeed} />
						</Panel>

						<Panel title="Venue Health" subtitle={`${data.venueHealth.length} venues`}>
							<div class="space-y-2 font-mono text-[11px] text-textSecondary">
								{#each data.venueHealth as venue}
									<div class="rounded-sm border border-border bg-panelAlt p-2">
										<div class="mb-1 flex items-center justify-between">
											<span class="text-textPrimary">{venue.venue}</span>
											<span
												class={venue.status === 'Online'
													? 'text-terminalGreen'
													: venue.status === 'Degraded'
														? 'text-amber'
														: 'text-textMuted'}
											>
												{venue.status}
											</span>
										</div>
										<div class="grid grid-cols-2 gap-x-3 gap-y-1">
											<span>Markets</span>
											<span class="text-right tabular-nums text-textPrimary">{venue.marketsIndexed}</span>
											<span>Last Sync</span>
											<span class="text-right">{venue.lastSync}</span>
											<span>API Mode</span>
											<span class="text-right text-mutedGold">{venue.apiMode}</span>
											<span>Liquidity</span>
											<span class="text-right">{venue.liquidityScore}</span>
											<span>Volume</span>
											<span class="text-right text-amber">{venue.volumeSignal}</span>
										</div>
									</div>
								{/each}
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
