<script lang="ts">
	import { onDestroy, onMount } from 'svelte';

	export let label = 'QUERY CONSOLE';
	export let placeholders = [
		'show markets with spread above 3%',
		'find reward lanes on polymarket',
		'show stale prices expiring this week'
	];

	let value = '';
	let placeholderIdx = 0;
	const promptPrefix = 'aperture@terminal:~$';
	let rotationTimer: ReturnType<typeof setInterval> | null = null;

	onMount(() => {
		if (!placeholders.length) return;
		rotationTimer = setInterval(() => {
			placeholderIdx = (placeholderIdx + 1) % placeholders.length;
		}, 3200);
	});

	onDestroy(() => {
		if (rotationTimer) clearInterval(rotationTimer);
	});
</script>

<div class="w-full rounded-sm border border-border bg-panel p-3">
	<p class="mb-2 font-mono text-[11px] uppercase tracking-wide text-textMuted">{label}</p>
	<div class="flex items-center rounded-sm border border-border bg-panelAlt px-3 py-2">
		<span class="mr-2 shrink-0 font-mono text-xs text-textMuted">{promptPrefix}</span>
		<input
			id="terminal-command"
			class="min-w-0 flex-1 bg-transparent font-mono text-xs text-textPrimary outline-none"
			bind:value
			placeholder={placeholders[placeholderIdx] ?? ''}
			spellcheck="false"
			autocomplete="off"
		/>
	</div>
</div>
