<script lang="ts">
	import { onMount } from 'svelte';

	import CommandBar from '$lib/components/CommandBar.svelte';
	import Header from '$lib/components/Header.svelte';
	import Sidebar from '$lib/components/Sidebar.svelte';
	import { dashboardTimestamp, mockMarkets, navItems } from '$lib/mock/markets';
	import type { MarketRow, MarketSignal, MarketsApiResponse } from '$lib/types/markets';

	type ChipFilter =
		| 'All'
		| 'Rewards'
		| 'Spread > 3%'
		| 'Parity Gaps'
		| 'High Liquidity'
		| 'Expiring Soon';

	const quickFilters: ChipFilter[] = [
		'All',
		'Rewards',
		'Spread > 3%',
		'Parity Gaps',
		'High Liquidity',
		'Expiring Soon'
	];

	const signalTone: Record<MarketSignal, string> = {
		SPREAD: 'border-terminalGreen/45 bg-terminalGreen/10 text-terminalGreen',
		PARITY: 'border-mutedGold/45 bg-mutedGold/10 text-mutedGold',
		REWARD: 'border-terminalGreen/45 bg-mutedGold/10 text-terminalGreen',
		STALE: 'border-amber/45 bg-amber/10 text-amber',
		'LOW LIQ': 'border-danger/45 bg-danger/10 text-danger',
		NONE: 'border-border bg-panelAlt text-textMuted'
	};

	const fallbackData: MarketsApiResponse = {
		dashboardTimestamp,
		feedMode: 'STATIC',
		venues: ['Alpha'],
		activeVenueCount: 1,
		marketsIndexed: mockMarkets.length,
		markets: mockMarkets
	};

	let data: MarketsApiResponse = fallbackData;

	const defaultMarket = fallbackData.markets[0]!;

	let query = '';
	let activeChip: ChipFilter = 'All';
	let selectedMarketId = defaultMarket.id;

	const formatCurrency = (value: number) =>
		new Intl.NumberFormat('en-US', {
			style: 'currency',
			currency: 'USD',
			maximumFractionDigits: 0
		}).format(value);

	const formatPrice = (value: number) => value.toFixed(2);
	const formatSpread = (value: number) => `${value.toFixed(1)}%`;

	const expiryDays = (expiry: string) => Number.parseInt(expiry.replace(/\D/g, ''), 10) || 999;

	const chipMatch = (market: MarketRow, chip: ChipFilter) => {
		if (chip === 'All') return true;
		if (chip === 'Rewards') return market.reward;
		if (chip === 'Spread > 3%') return market.spread > 3;
		if (chip === 'Parity Gaps') return market.signals.includes('PARITY');
		if (chip === 'High Liquidity') return market.liquidity >= 1200;
		return expiryDays(market.expiry) <= 14;
	};

	$: filteredMarkets = data.markets.filter((market) => {
		const normalized = query.trim().toLowerCase();
		const textMatch =
			!normalized ||
			market.name.toLowerCase().includes(normalized) ||
			market.category.toLowerCase().includes(normalized) ||
			market.signals.join(' ').toLowerCase().includes(normalized);

		return textMatch && chipMatch(market, activeChip);
	});

	$: selectedMarket =
		filteredMarkets.find((market) => market.id === selectedMarketId) ?? filteredMarkets[0] ?? defaultMarket;

	$: driftStart = Math.max(0.05, selectedMarket.yesPrice - 0.09).toFixed(2);
	$: driftOneHour = `+${Math.max(0.4, selectedMarket.spread * 0.5).toFixed(1)}%`;
	$: driftTwentyFourHour = `+${Math.max(1.2, selectedMarket.spread * 1.6).toFixed(1)}%`;

	const selectMarket = (market: MarketRow) => {
		selectedMarketId = market.id;
	};

	const selectFilter = (chip: ChipFilter) => {
		activeChip = chip;
	};

	onMount(async () => {
		const baseUrl = (
			(import.meta.env.PUBLIC_API_BASE_URL as string | undefined) ??
			(import.meta.env.VITE_PUBLIC_API_BASE_URL as string | undefined)
		)?.trim();
		if (!baseUrl) return;
		try {
			const response = await fetch(`${baseUrl}/api/markets`);
			if (!response.ok) return;
			const payload = (await response.json()) as MarketsApiResponse;
			if (payload && Array.isArray(payload.markets)) {
				data = {
					...payload,
					marketsIndexed: payload.marketsIndexed || payload.markets.length
				};
			}
		} catch {
			// Keep static fallback when backend is unavailable.
		}
	});
</script>

<svelte:head>
	<title>Aperture Terminal | Markets</title>
</svelte:head>

<div class="flex h-[100dvh] max-h-[100dvh] flex-col overflow-hidden bg-bg text-textPrimary">
	<Header timestamp={data.dashboardTimestamp} feedMode={data.feedMode} />

	<div class="grid min-h-0 flex-1 grid-cols-[136px_1fr] overflow-hidden">
		<div class="min-h-0 overflow-y-auto pb-[calc(7rem+env(safe-area-inset-bottom,0px))]">
			<Sidebar items={navItems} active="Markets" />
		</div>

		<main class="min-h-0 overflow-hidden">
			<div class="h-full space-y-3 overflow-y-auto p-3 pr-4 pb-[calc(7rem+env(safe-area-inset-bottom,0px))]">
				<section class="border border-border bg-panel px-3 py-2">
					<div class="flex flex-wrap items-center justify-between gap-2">
						<div>
							<h1 class="font-mono text-sm uppercase tracking-[0.18em] text-textPrimary">MARKETS</h1>
							<p class="mt-1 font-mono text-[11px] text-textSecondary">
								{data.marketsIndexed} indexed markets / {data.activeVenueCount} active venues / {data.feedMode.toLowerCase()} multi-venue feed
							</p>
						</div>
						<div class="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-wide">
							{#if data.venues.length === 0}
								<span class="rounded-sm border border-border bg-panelAlt px-2 py-0.5 text-textMuted">NO LIVE VENUES</span>
							{:else}
								{#each data.venues as venue}
									<span
										class={`rounded-sm border px-2 py-0.5 ${
											venue === 'Polymarket'
												? 'border-signalCyan/45 bg-signalCyan/10 text-signalCyan'
												: 'border-terminalGreen/40 bg-terminalGreen/10 text-terminalGreen'
										}`}
									>
										{venue}
									</span>
								{/each}
							{/if}
							<span class="rounded-sm border border-mutedGold/35 bg-mutedGold/10 px-2 py-0.5 text-mutedGold">{data.feedMode}</span>
							<span class="rounded-sm border border-border bg-panelAlt px-2 py-0.5 text-textMuted">READ ONLY</span>
						</div>
					</div>
				</section>

				<section class="space-y-2 border border-border bg-panel p-2.5">
					<div class="flex items-center rounded-sm border border-border bg-panelAlt px-2.5 py-1.5">
						<span class="mr-2 shrink-0 font-mono text-[11px] text-textMuted">QUERY:</span>
						<input
							class="min-w-0 flex-1 bg-transparent font-mono text-xs text-textPrimary outline-none placeholder:text-textMuted"
							bind:value={query}
							placeholder="filter markets: venue:polymarket spread:>3 reward:true"
							spellcheck="false"
							autocomplete="off"
						/>
					</div>
					<div class="flex flex-wrap gap-1.5">
						{#each quickFilters as chip}
							<button
								type="button"
								class={`rounded-sm border px-2 py-1 font-mono text-[10px] uppercase tracking-wide transition-colors ${
									chip === activeChip
										? 'border-terminalGreen/60 bg-terminalGreen/10 text-terminalGreen'
										: 'border-border bg-panelAlt text-textSecondary hover:text-textPrimary'
								}`}
								on:click={() => selectFilter(chip)}
							>
								{chip}
							</button>
						{/each}
					</div>
				</section>

				<section class="grid min-h-0 gap-3 xl:grid-cols-[minmax(0,1fr)_320px]">
					<div class="min-h-[620px] overflow-hidden border border-border bg-panel">
						<div class="h-full overflow-auto">
							<table class="w-full border-collapse font-mono text-[11px]">
								<thead class="sticky top-0 z-10 bg-panelAlt text-[10px] uppercase tracking-wide text-textMuted">
									<tr class="border-b border-border">
										<th class="px-2 py-2 text-left font-normal">Market</th>
										<th class="px-2 py-2 text-left font-normal">Venue</th>
										<th class="px-2 py-2 text-left font-normal">Category</th>
										<th class="px-2 py-2 text-right font-normal">YES</th>
										<th class="px-2 py-2 text-right font-normal">NO</th>
										<th class="px-2 py-2 text-right font-normal">Spread</th>
										<th class="px-2 py-2 text-right font-normal">Volume</th>
										<th class="px-2 py-2 text-right font-normal">Liquidity</th>
										<th class="px-2 py-2 text-center font-normal">Reward</th>
										<th class="px-2 py-2 text-left font-normal">Expiry</th>
										<th class="px-2 py-2 text-left font-normal">Signals</th>
										<th class="px-2 py-2 text-left font-normal">Updated</th>
									</tr>
								</thead>
								<tbody>
									{#if filteredMarkets.length === 0}
										<tr>
											<td colspan="12" class="px-3 py-6 text-center font-mono text-xs text-textMuted">
												NO MARKETS MATCH CURRENT FILTER
											</td>
										</tr>
									{:else}
										{#each filteredMarkets as market (market.id)}
											<tr
												class={`border-b border-border/80 transition-colors ${
													market.id === selectedMarket.id
														? 'bg-terminalGreen/10 text-textPrimary shadow-[inset_2px_0_0_0_rgba(127,219,127,0.8)]'
														: 'text-textSecondary hover:bg-panelAlt/80 hover:text-textPrimary'
												}`}
												on:click={() => selectMarket(market)}
												on:keydown={(event) => event.key === 'Enter' && selectMarket(market)}
												role="button"
												tabindex="0"
											>
												<td class="max-w-[340px] truncate px-2 py-1.5 text-textPrimary">{market.name}</td>
												<td class="px-2 py-1.5">{market.venue}</td>
												<td class="px-2 py-1.5">{market.category}</td>
												<td class="px-2 py-1.5 text-right tabular-nums text-terminalGreen">{formatPrice(market.yesPrice)}</td>
												<td class="px-2 py-1.5 text-right tabular-nums">{formatPrice(market.noPrice)}</td>
												<td class="px-2 py-1.5 text-right tabular-nums text-amber">{formatSpread(market.spread)}</td>
												<td class="px-2 py-1.5 text-right tabular-nums">{formatCurrency(market.volume)}</td>
												<td class="px-2 py-1.5 text-right tabular-nums">{formatCurrency(market.liquidity)}</td>
												<td class="px-2 py-1.5 text-center">
													<span
														class={`rounded-sm border px-1.5 py-[2px] text-[10px] uppercase ${
															market.reward
																? 'border-terminalGreen/40 bg-terminalGreen/10 text-terminalGreen'
																: 'border-border bg-panelAlt text-textMuted'
														}`}
													>
														{market.reward ? 'YES' : 'NO'}
													</span>
												</td>
												<td class="px-2 py-1.5">{market.expiry}</td>
												<td class="px-2 py-1.5">
													<div class="flex flex-wrap gap-1">
														{#each market.signals as signal}
															<span class={`rounded-sm border px-1.5 py-[1px] text-[10px] ${signalTone[signal]}`}>{signal}</span>
														{/each}
													</div>
												</td>
												<td class="px-2 py-1.5">{market.updated}</td>
											</tr>
										{/each}
									{/if}
								</tbody>
							</table>
						</div>
					</div>

					<aside class="space-y-2 border border-border bg-panel p-2.5 font-mono text-[11px] text-textSecondary">
						<div class="border-b border-border pb-2">
							<h2 class="text-[11px] uppercase tracking-[0.12em] text-textPrimary">MARKET INSPECTOR</h2>
						</div>

						<div class="space-y-1">
							<p class="text-xs text-textPrimary">{selectedMarket.name}</p>
							<div class="grid grid-cols-2 gap-x-3 gap-y-1">
								<p>Venue</p><p class="text-right text-textPrimary">{selectedMarket.venue}</p>
								<p>Category</p><p class="text-right text-textPrimary">{selectedMarket.category}</p>
								<p>YES price</p><p class="text-right tabular-nums text-terminalGreen">{formatPrice(selectedMarket.yesPrice)}</p>
								<p>NO price</p><p class="text-right tabular-nums text-textPrimary">{formatPrice(selectedMarket.noPrice)}</p>
								<p>Spread</p><p class="text-right tabular-nums text-amber">{formatSpread(selectedMarket.spread)}</p>
								<p>Liquidity</p><p class="text-right tabular-nums text-textPrimary">{formatCurrency(selectedMarket.liquidity)}</p>
								<p>Volume</p><p class="text-right tabular-nums text-textPrimary">{formatCurrency(selectedMarket.volume)}</p>
								<p>Expiry</p><p class="text-right text-textPrimary">{selectedMarket.expiry}</p>
								<p>Last update</p><p class="text-right text-textPrimary">{selectedMarket.updated}</p>
							</div>
						</div>

						<div class="border-t border-border pt-2">
							<p class="mb-1 text-[10px] uppercase tracking-wide text-textMuted">Signals</p>
							<div class="flex flex-wrap gap-1">
								{#each selectedMarket.signals as signal}
									<span class={`rounded-sm border px-1.5 py-[1px] text-[10px] ${signalTone[signal]}`}>{signal}</span>
								{/each}
							</div>
						</div>

						<div class="space-y-1 border-t border-border pt-2">
							<p class="text-[10px] uppercase tracking-wide text-textMuted">Mock probability drift</p>
							<p class="rounded-sm border border-border bg-panelAlt px-2 py-1.5 text-center text-xs tabular-nums">
								<span class="text-textSecondary">{driftStart}</span>
								<span class="mx-2 text-signalCyan">▂▃▄▅▃▆▇</span>
								<span class="text-terminalGreen">{formatPrice(selectedMarket.yesPrice)}</span>
							</p>
							<div class="grid grid-cols-3 gap-1 text-center">
								<div class="rounded-sm border border-border bg-panelAlt px-1 py-1">
									<p class="text-[10px] text-textMuted">1h</p>
									<p class="tabular-nums text-terminalGreen">{driftOneHour}</p>
								</div>
								<div class="rounded-sm border border-border bg-panelAlt px-1 py-1">
									<p class="text-[10px] text-textMuted">24h</p>
									<p class="tabular-nums text-terminalGreen">{driftTwentyFourHour}</p>
								</div>
								<div class="rounded-sm border border-border bg-panelAlt px-1 py-1">
									<p class="text-[10px] text-textMuted">Spread</p>
									<p class="tabular-nums text-amber">{formatSpread(selectedMarket.spread)}</p>
								</div>
							</div>
						</div>

						<div class="space-y-1 border-t border-border pt-2">
							<p class="text-[10px] uppercase tracking-wide text-textMuted">Mock venue comparison</p>
							<div class="space-y-1 rounded-sm border border-border bg-panelAlt p-2">
								<div class="flex justify-between">
									<span>{selectedMarket.venue}</span>
									<span class="tabular-nums text-textPrimary">{formatPrice(selectedMarket.yesPrice)}</span>
								</div>
								<div class="flex justify-between border-t border-border/60 pt-1 text-textMuted">
									<span>Other venues</span>
									<span>pending</span>
								</div>
							</div>
							<p class="text-[10px] text-textMuted">Cross-venue matching is not enabled in scanner-only mode.</p>
						</div>
					</aside>
				</section>
			</div>
		</main>
	</div>

	<div
		class="fixed bottom-0 left-0 right-0 z-40 border-t border-border bg-bg px-4 py-2 pb-[calc(0.5rem+env(safe-area-inset-bottom,0px))]"
	>
		<CommandBar label="QUERY CONSOLE" />
	</div>
</div>
