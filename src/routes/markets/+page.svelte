<script lang="ts">
	import CommandBar from '$lib/components/CommandBar.svelte';
	import Header from '$lib/components/Header.svelte';
	import MarketDataErrorBanner from '$lib/components/MarketDataErrorBanner.svelte';
	import Sidebar from '$lib/components/Sidebar.svelte';
	import { navItems } from '$lib/constants/terminal';
	import { emptyMarketsData, getMarketDataContext, venueOrder } from '$lib/context/marketData';
	import type { MarketRow, MarketSignal, MarketsApiResponse, Venue } from '$lib/types/markets';

	type ChipFilter =
		| 'All'
		| 'Rewards'
		| 'Spread > 3%'
		| 'Parity Gaps'
		| 'High Liquidity'
		| 'Expiring Soon';
	type VenueFilter = 'All' | Venue;
	type VenueLoadState = 'loading' | 'ready' | 'error';
	type SortColumn =
		| 'name'
		| 'venue'
		| 'category'
		| 'yesPrice'
		| 'noPrice'
		| 'spread'
		| 'volume'
		| 'liquidity'
		| 'reward'
		| 'expiry'
		| 'signals'
		| 'updated';
	type SortDirection = 'asc' | 'desc';

	const sortableColumns: { key: SortColumn; label: string; align: 'left' | 'right' | 'center' }[] = [
		{ key: 'name', label: 'Market', align: 'left' },
		{ key: 'venue', label: 'Venue', align: 'left' },
		{ key: 'category', label: 'Category', align: 'left' },
		{ key: 'yesPrice', label: 'YES', align: 'right' },
		{ key: 'noPrice', label: 'NO', align: 'right' },
		{ key: 'spread', label: 'Spread', align: 'right' },
		{ key: 'volume', label: 'Volume', align: 'right' },
		{ key: 'liquidity', label: 'Liquidity', align: 'right' },
		{ key: 'reward', label: 'Reward', align: 'center' },
		{ key: 'expiry', label: 'Expiry', align: 'left' },
		{ key: 'signals', label: 'Signals', align: 'left' },
		{ key: 'updated', label: 'Updated', align: 'left' }
	];

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

	const marketData = getMarketDataContext();
	let data: MarketsApiResponse = emptyMarketsData;

	let activeChip: ChipFilter = 'All';
	let activeVenue: VenueFilter = 'All';
	let selectedMarketId = '';
	let sortColumn: SortColumn | null = null;
	let sortDirection: SortDirection = 'desc';
	let displayMarkets: MarketRow[] = [];
	let isMarketsLoading = true;
	let venueLoadState: Record<Venue, VenueLoadState> = {
		Alpha: 'loading',
		Polymarket: 'loading',
		Kalshi: 'loading',
		Limitless: 'loading'
	};
	let venueBadgeStateMap: Record<Venue, VenueLoadState | 'ready'> = {
		Alpha: 'loading',
		Polymarket: 'loading',
		Kalshi: 'loading',
		Limitless: 'loading'
	};

	const venueBadgeClass = (venue: Venue): string => {
		if (venue === 'Polymarket') return 'border-signalCyan/45 bg-signalCyan/10 text-signalCyan';
		if (venue === 'Limitless') return 'border-mutedGold/45 bg-mutedGold/10 text-mutedGold';
		return 'border-terminalGreen/40 bg-terminalGreen/10 text-terminalGreen';
	};

	const formatCurrency = (value: number) =>
		new Intl.NumberFormat('en-US', {
			style: 'currency',
			currency: 'USD',
			maximumFractionDigits: 0
		}).format(value);

	const formatPrice = (value: number) => value.toFixed(2);
	const formatSpread = (value: number) => `${value.toFixed(1)}%`;

	const expiryDays = (expiry: string) => Number.parseInt(expiry.replace(/\D/g, ''), 10) || 999;

	const sortValue = (market: MarketRow, column: SortColumn): string | number => {
		switch (column) {
			case 'name':
				return market.name.toLowerCase();
			case 'venue':
				return market.venue;
			case 'category':
				return market.category;
			case 'yesPrice':
				return market.yesPrice;
			case 'noPrice':
				return market.noPrice;
			case 'spread':
				return market.spread;
			case 'volume':
				return market.volume;
			case 'liquidity':
				return market.liquidity;
			case 'reward':
				return market.reward ? 1 : 0;
			case 'expiry':
				return expiryDays(market.expiry);
			case 'signals':
				return market.signals.join(',');
			case 'updated':
				return market.updated.toLowerCase();
		}
	};

	const compareMarkets = (
		a: MarketRow,
		b: MarketRow,
		column: SortColumn,
		direction: SortDirection
	): number => {
		const left = sortValue(a, column);
		const right = sortValue(b, column);
		let result = 0;
		if (typeof left === 'number' && typeof right === 'number') {
			result = left - right;
		} else {
			result = String(left).localeCompare(String(right));
		}
		return direction === 'asc' ? result : -result;
	};

	const sortIndicator = (column: SortColumn) => {
		if (sortColumn !== column) return '';
		return sortDirection === 'desc' ? ' ↓' : ' ↑';
	};

	const headerAlignClass = (align: 'left' | 'right' | 'center') => {
		if (align === 'right') return 'justify-end text-right';
		if (align === 'center') return 'justify-center text-center';
		return 'justify-start text-left';
	};

	const chipMatch = (market: MarketRow, chip: ChipFilter) => {
		if (chip === 'All') return true;
		if (chip === 'Rewards') return market.reward;
		if (chip === 'Spread > 3%') return market.spread > 3;
		if (chip === 'Parity Gaps') return market.signals.includes('PARITY');
		if (chip === 'High Liquidity') return market.liquidity >= 1200;
		return expiryDays(market.expiry) <= 14;
	};

	$: data = $marketData.data;
	$: isMarketsLoading = $marketData.isLoading;
	$: marketDataError = $marketData.error;
	$: venueLoadState = $marketData.venueLoadState;

	$: venueFilters = venueOrder.filter(
		(venue) => data.venues.includes(venue) || data.markets.some((market) => market.venue === venue)
	);

	$: venueBadgeStateMap = Object.fromEntries(
		venueOrder.map((venue) => [
			venue,
			data.venues.includes(venue) || data.markets.some((market) => market.venue === venue)
				? 'ready'
				: venueLoadState[venue]
		])
	) as Record<Venue, VenueLoadState | 'ready'>;

	$: filteredMarkets = data.markets.filter((market) => {
		const venueMatch = activeVenue === 'All' || market.venue === activeVenue;

		return venueMatch && chipMatch(market, activeChip);
	});

	$: {
		const activeSort = sortColumn;
		displayMarkets = activeSort
			? [...filteredMarkets].sort((a, b) => compareMarkets(a, b, activeSort, sortDirection))
			: filteredMarkets;
	}

	$: selectedMarket =
		displayMarkets.find((market) => market.id === selectedMarketId) ?? displayMarkets[0] ?? null;

	const selectMarket = (market: MarketRow) => {
		selectedMarketId = market.id;
	};

	const selectFilter = (chip: ChipFilter) => {
		activeChip = chip;
	};

	const selectVenue = (venue: VenueFilter) => {
		activeVenue = venue;
	};

	const toggleSort = (column: SortColumn) => {
		if (sortColumn === column) {
			sortDirection = sortDirection === 'desc' ? 'asc' : 'desc';
			return;
		}
		sortColumn = column;
		sortDirection = 'desc';
	};

</script>

<svelte:head>
	<title>Aperture Terminal | Markets</title>
</svelte:head>

<div class="flex h-[100dvh] max-h-[100dvh] flex-col overflow-hidden bg-bg text-textPrimary">
	<Header timestamp={data.dashboardTimestamp} feedMode={data.feedMode} />
	<MarketDataErrorBanner message={marketDataError} />

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
								{marketDataError ? '⚠️' : data.marketsIndexed} indexed markets / {marketDataError ? '⚠️' : data.activeVenueCount} active venues / {data.feedMode.toLowerCase()} multi-venue feed
							</p>
						</div>
						<div class="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-wide">
							{#if data.venues.length === 0}
								<span class="rounded-sm border border-border bg-panelAlt px-2 py-0.5 text-textMuted">NO LIVE VENUES</span>
							{:else}
								{#each venueOrder as venue}
									<span
										class={`rounded-sm border px-2 py-0.5 ${
											venueBadgeStateMap[venue] === 'loading'
												? 'border-border bg-panelAlt text-textMuted animate-pulse'
												: venueBadgeStateMap[venue] === 'error'
													? 'border-danger/45 bg-danger/10 text-danger'
													: venueBadgeClass(venue)
										}`}
									>
										{venue}
									</span>
								{/each}
							{/if}
							<span
								class={`rounded-sm border px-2 py-0.5 ${
									isMarketsLoading
										? 'animate-pulse border-border bg-panelAlt text-textMuted'
										: 'border-mutedGold/35 bg-mutedGold/10 text-mutedGold'
								}`}
							>
								{isMarketsLoading ? 'LOADING' : data.feedMode}
							</span>
							<span class="rounded-sm border border-border bg-panelAlt px-2 py-0.5 text-textMuted">READ ONLY</span>
						</div>
					</div>
				</section>

				<section class="space-y-2 border border-border bg-panel p-2.5">
					<div class="flex flex-wrap gap-1.5">
						<span class="self-center font-mono text-[10px] uppercase tracking-wide text-textMuted">VENUE:</span>
						<button
							type="button"
							class={`rounded-sm border px-2 py-1 font-mono text-[10px] uppercase tracking-wide transition-colors ${
								activeVenue === 'All'
									? 'border-terminalGreen/60 bg-terminalGreen/10 text-terminalGreen'
									: 'border-border bg-panelAlt text-textSecondary hover:text-textPrimary'
							}`}
							on:click={() => selectVenue('All')}
						>
							All
						</button>
						{#each venueFilters as venue}
							<button
								type="button"
								class={`rounded-sm border px-2 py-1 font-mono text-[10px] uppercase tracking-wide transition-colors ${
									venue === activeVenue
										? 'border-terminalGreen/60 bg-terminalGreen/10 text-terminalGreen'
										: 'border-border bg-panelAlt text-textSecondary hover:text-textPrimary'
								}`}
								on:click={() => selectVenue(venue)}
							>
								{venue}
							</button>
						{/each}
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
										{#each sortableColumns as column}
											<th
												class={`px-2 py-2 font-normal ${column.align === 'right' ? 'text-right' : column.align === 'center' ? 'text-center' : 'text-left'}`}
												aria-sort={sortColumn === column.key ? (sortDirection === 'asc' ? 'ascending' : 'descending') : 'none'}
											>
												<button
													type="button"
													class={`flex w-full items-center gap-1 font-normal transition-colors hover:text-textPrimary ${headerAlignClass(column.align)} ${
														sortColumn === column.key ? 'text-terminalGreen' : ''
													}`}
													on:click|stopPropagation={() => toggleSort(column.key)}
												>
													<span>{column.label}</span>
													<span class="tabular-nums text-[9px]">{sortIndicator(column.key)}</span>
												</button>
											</th>
										{/each}
									</tr>
								</thead>
								<tbody>
									{#if displayMarkets.length === 0}
										<tr>
											<td colspan="12" class="px-3 py-6 text-center font-mono text-xs text-textMuted">
												{#if marketDataError || data.markets.length === 0}
													⚠️ NO MARKET DATA AVAILABLE
												{:else}
													NO MARKETS MATCH CURRENT FILTER
												{/if}
											</td>
										</tr>
									{:else}
										{#each displayMarkets as market (market.id)}
											<tr
												class={`border-b border-border/80 transition-colors ${
													selectedMarket && market.id === selectedMarket.id
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

						{#if selectedMarket}
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

						<div class="space-y-1 border-t border-border pt-2 opacity-50">
							<p class="text-[10px] uppercase tracking-wide text-textMuted">Probability drift</p>
							<p class="rounded-sm border border-border bg-panelAlt px-2 py-1.5 text-center text-xs tabular-nums text-textMuted">
								⚠️ Historical data not available
							</p>
						</div>

						<div class="space-y-1 border-t border-border pt-2 opacity-50">
							<p class="text-[10px] uppercase tracking-wide text-textMuted">Venue comparison</p>
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
						{:else}
							<p class="py-8 text-center text-xs text-textMuted">
								{marketDataError || data.markets.length === 0
									? '⚠️ No market data'
									: '⚠️ Select a market'}
							</p>
						{/if}
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
