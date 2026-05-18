<script lang="ts">
	import { onMount } from 'svelte';

	export let timestamp: string;
	export let feedMode: 'LIVE' | 'PARTIAL' | 'STATIC' = 'STATIC';

	const formatUtcTimestamp = (date: Date) => `${date.toISOString().slice(0, 19).replace('T', ' ')} UTC`;

	let currentTimestamp = timestamp;

	$: modeClass =
		feedMode === 'LIVE'
			? 'border-terminalGreen/40 bg-terminalGreen/10 text-terminalGreen'
			: feedMode === 'PARTIAL'
				? 'border-amber/40 bg-amber/10 text-amber'
				: 'border-border bg-panelAlt text-textMuted';

	onMount(() => {
		const updateClock = () => {
			currentTimestamp = formatUtcTimestamp(new Date());
		};

		updateClock();
		const intervalId = setInterval(updateClock, 1000);

		return () => {
			clearInterval(intervalId);
		};
	});
</script>

<header class="flex items-center justify-between gap-3 border-b border-border bg-panel px-4 py-2">
	<div class="flex items-center gap-3">
		<img
			src="/aperture-icon.png"
			alt="Aperture Terminal icon"
			class="h-5 w-5 "
		/>
		<span class="font-mono text-sm uppercase tracking-[0.16em] text-textPrimary">Aperture Terminal</span>
		
	</div>
	<div class="flex items-center gap-4 font-mono text-[11px] text-textSecondary">
		<span>{currentTimestamp}</span>
	</div>
</header>
