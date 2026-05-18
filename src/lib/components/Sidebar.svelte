<script lang="ts">
	export let items: string[] = [];
	export let active = 'Overview';
</script>

<aside class="min-h-0 border-r border-border bg-panel px-2 py-3">
	<nav>
		<ul class="space-y-1">
			{#each items as item}
				<li>
					<button
						type="button"
						class={`w-full rounded-sm border px-2 py-1.5 text-left font-mono text-[11px] uppercase tracking-wide transition-colors ${
							item === active
								? 'border-terminalGreen/60 bg-terminalGreen/10 text-terminalGreen'
								: 'border-transparent text-textSecondary hover:border-border hover:bg-panelAlt hover:text-textPrimary'
						}`}
						aria-current={item === active ? 'page' : undefined}
					>
						{item}
					</button>
				</li>
			{/each}
		</ul>
	</nav>
</aside>
