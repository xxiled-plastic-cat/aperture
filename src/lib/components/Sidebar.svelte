<script lang="ts">
	export let items: string[] = [];
	export let active = 'Overview';

	const routeByItem: Record<string, string> = {
		Overview: '/',
		Markets: '/markets'
	};

	const groupedNavItems = [
		['Overview'],
		['Markets', 'Scanner', 'Signals'],
		['Venues', 'Portfolio', 'Alerts'],
		['Workspace']
	];
</script>

<aside class="min-h-0 border-r border-border bg-panel px-2 py-3">
	<nav>
		<div class="space-y-3">
			{#each groupedNavItems as group}
				<ul class="space-y-1">
					{#each group as item}
						{#if items.includes(item)}
							<li>
								<a
									href={routeByItem[item] ?? '#'}
									class={`block w-full rounded-sm border px-2 py-1.5 text-left font-mono text-[11px] uppercase tracking-wide transition-colors ${
										item === active
											? 'border-terminalGreen/60 bg-terminalGreen/10 text-terminalGreen'
											: 'border-transparent text-textSecondary hover:border-border hover:bg-panelAlt hover:text-textPrimary'
									}`}
									aria-current={item === active ? 'page' : undefined}
								>
									{item}
								</a>
							</li>
						{/if}
					{/each}
				</ul>
			{/each}
		</div>
	</nav>
</aside>
