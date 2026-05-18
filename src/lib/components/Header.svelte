<script lang="ts">
	export let timestamp: string;
</script>

<header class="flex items-center justify-between gap-3 border-b border-border bg-panel px-4 py-2">
	<div class="flex items-center gap-3">
		<img
			src="/aperture-icon.png"
			alt="Aperture Terminal icon"
			class="h-5 w-5 "
		/>
		<span class="font-mono text-sm uppercase tracking-[0.16em] text-textPrimary">Aperture Terminal</span>
		<span
			class="rounded-sm border border-terminalGreen/40 bg-terminalGreen/10 px-2 py-0.5 font-mono text-[11px] uppercase text-terminalGreen"
		>
			ALPHA FEED: STATIC
		</span>
	</div>
	<div class="flex items-center gap-4 font-mono text-[11px] text-textSecondary">
		<span>{timestamp}</span>
		<span class="text-mutedGold">/ scan markets</span>
	</div>
</header>
