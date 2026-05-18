<script lang="ts">
	import type { SignalRow } from '$lib/mock/markets';

	export let rows: SignalRow[] = [];

	const confidenceClass: Record<SignalRow['confidence'], string> = {
		HIGH: 'border-terminalGreen/50 bg-terminalGreen/10 text-terminalGreen',
		MED: 'border-amber/40 bg-amber/10 text-amber',
		LOW: 'border-border bg-panelAlt text-textMuted'
	};
</script>

<div class="overflow-auto">
	<table class="w-full border-collapse font-mono text-[11px] text-textSecondary">
		<thead>
			<tr class="border-b border-border text-textMuted">
				<th class="px-2 py-1 text-left font-normal">Signal</th>
				<th class="px-2 py-1 text-left font-normal">Market</th>
				<th class="px-2 py-1 text-left font-normal">Venue</th>
				<th class="px-2 py-1 text-left font-normal">Side</th>
				<th class="px-2 py-1 text-right font-normal">Price</th>
				<th class="px-2 py-1 text-right font-normal">Fair</th>
				<th class="px-2 py-1 text-right font-normal">Edge</th>
				<th class="px-2 py-1 text-right font-normal">Liquidity</th>
				<th class="px-2 py-1 text-left font-normal">Confidence</th>
			</tr>
		</thead>
		<tbody>
			{#each rows as row}
				<tr class="border-b border-border/60 hover:bg-panelAlt/70">
					<td class="px-2 py-1 text-textPrimary">{row.signal}</td>
					<td class="max-w-60 truncate px-2 py-1 text-textSecondary">{row.market}</td>
					<td class="px-2 py-1">{row.venue}</td>
					<td class={`px-2 py-1 ${row.side === 'YES' ? 'text-terminalGreen' : 'text-danger'}`}>{row.side}</td>
					<td class="px-2 py-1 text-right tabular-nums text-textPrimary">{row.price}</td>
					<td class="px-2 py-1 text-right tabular-nums">{row.fair}</td>
					<td class="px-2 py-1 text-right tabular-nums text-terminalGreen">{row.edge}</td>
					<td class="px-2 py-1 text-right tabular-nums">{row.liquidity}</td>
					<td class="px-2 py-1">
						<span class={`inline-flex rounded-sm border px-1.5 py-0.5 text-[10px] ${confidenceClass[row.confidence]}`}>
							{row.confidence}
						</span>
					</td>
				</tr>
			{/each}
		</tbody>
	</table>
</div>
