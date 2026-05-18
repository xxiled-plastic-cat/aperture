<script lang="ts">
	export let title: string;
	export let subtitle = '';
</script>

<section class="rounded-sm border border-border bg-panel p-3">
	<div class="mb-3 flex items-center justify-between gap-3 border-b border-border pb-2">
		<h2 class="font-mono text-xs uppercase tracking-wide text-textPrimary">{title}</h2>
		{#if subtitle}
			<span class="font-mono text-[11px] text-textMuted">{subtitle}</span>
		{/if}
	</div>
	<slot />
</section>
