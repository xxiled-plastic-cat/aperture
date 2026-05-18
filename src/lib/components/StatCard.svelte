<script lang="ts">
	export let label: string;
	export let value: string;
</script>

<article class="rounded-sm border border-border bg-panelAlt p-2">
	<p class="font-mono text-[11px] uppercase text-textMuted">{label}</p>
	<p class="mt-1 font-mono text-sm tabular-nums text-textPrimary">{value}</p>
</article>
