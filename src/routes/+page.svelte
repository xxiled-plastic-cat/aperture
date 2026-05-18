<script lang="ts">
	import CommandBar from '$lib/components/CommandBar.svelte';
	import Header from '$lib/components/Header.svelte';
	import MarketFeed from '$lib/components/MarketFeed.svelte';
	import Panel from '$lib/components/Panel.svelte';
	import Sidebar from '$lib/components/Sidebar.svelte';
	import SignalTable from '$lib/components/SignalTable.svelte';
	import StatCard from '$lib/components/StatCard.svelte';
	import {
		dashboardTimestamp,
		marketFeed,
		navItems,
		probabilityDrift,
		signalRows,
		stats,
		venueHealth
	} from '$lib/mock/markets';
</script>

<svelte:head>
	<title>Aperture Terminal</title>
</svelte:head>

<div class="min-h-screen bg-bg text-textPrimary">
	<Header timestamp={dashboardTimestamp} />

	<div class="grid min-h-[calc(100vh-41px)] grid-cols-[170px_1fr]">
		<Sidebar items={navItems} active="Overview" />

		<main class="flex min-h-0 flex-col p-3">
			<div class="min-h-0 flex-1 space-y-3 overflow-y-auto pr-1">
				<Panel title="Market Snapshot" subtitle="EDGE DETECTED">
					<div class="grid grid-cols-2 gap-2 xl:grid-cols-3">
						{#each stats as stat}
							<StatCard label={stat.label} value={stat.value} />
						{/each}
					</div>
				</Panel>

				<Panel title="Signal Scanner" subtitle={`${signalRows.length} opportunities`}>
					<SignalTable rows={signalRows} />
				</Panel>

				<div class="grid gap-3 lg:grid-cols-3">
					<Panel title="Market Feed" subtitle="ALPHA FEED">
						<MarketFeed events={marketFeed} />
					</Panel>

					<Panel title="Venue Health">
						<div class="space-y-1 font-mono text-[11px] text-textSecondary">
							<div class="flex justify-between border-b border-border/60 py-1">
								<span>Venue</span>
								<span class="text-textPrimary">{venueHealth.venue}</span>
							</div>
							<div class="flex justify-between border-b border-border/60 py-1">
								<span>Status</span>
								<span class="text-terminalGreen">{venueHealth.status}</span>
							</div>
							<div class="flex justify-between border-b border-border/60 py-1">
								<span>Markets Indexed</span>
								<span class="tabular-nums text-textPrimary">{venueHealth.marketsIndexed}</span>
							</div>
							<div class="flex justify-between border-b border-border/60 py-1">
								<span>Last Sync</span>
								<span>{venueHealth.lastSync}</span>
							</div>
							<div class="flex justify-between border-b border-border/60 py-1">
								<span>API Mode</span>
								<span class="text-mutedGold">{venueHealth.apiMode}</span>
							</div>
							<div class="flex justify-between border-b border-border/60 py-1">
								<span>Liquidity Score</span>
								<span>{venueHealth.liquidityScore}</span>
							</div>
							<div class="flex justify-between py-1">
								<span>Volume Signal</span>
								<span class="text-amber">{venueHealth.volumeSignal}</span>
							</div>
						</div>
					</Panel>

					<Panel title="Probability Drift">
						<div class="space-y-2 font-mono text-[11px] text-textSecondary">
							<p class="text-textPrimary">Market: {probabilityDrift.market}</p>
							<div class="rounded-sm border border-border bg-panelAlt px-2 py-3 text-center text-sm tabular-nums">
								<span class="text-textSecondary">{probabilityDrift.start}</span>
								<span class="mx-2 text-signalCyan">{probabilityDrift.sparkline}</span>
								<span class="text-terminalGreen">{probabilityDrift.end}</span>
							</div>
							<div class="grid grid-cols-3 gap-2 text-center">
								<div class="rounded-sm border border-border bg-panelAlt px-1 py-1">
									<p class="text-textMuted">1h</p>
									<p class="tabular-nums text-terminalGreen">{probabilityDrift.oneHour}</p>
								</div>
								<div class="rounded-sm border border-border bg-panelAlt px-1 py-1">
									<p class="text-textMuted">24h</p>
									<p class="tabular-nums text-terminalGreen">{probabilityDrift.twentyFourHour}</p>
								</div>
								<div class="rounded-sm border border-border bg-panelAlt px-1 py-1">
									<p class="text-textMuted">Spread</p>
									<p class="tabular-nums text-amber">{probabilityDrift.spread}</p>
								</div>
							</div>
						</div>
					</Panel>
				</div>
			</div>

			<div class="sticky bottom-0 mt-3 border-t border-border bg-bg pt-3">
				<CommandBar />
			</div>
		</main>
	</div>
</div>
