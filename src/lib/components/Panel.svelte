<script lang="ts">
	export let title: string;
	export let subtitle = '';
	export let fill = false;
</script>

<section
	class="rounded-sm border border-border bg-panel p-3"
	class:flex={fill}
	class:h-full={fill}
	class:min-h-0={fill}
	class:flex-col={fill}
>
	<div class="mb-3 flex items-center justify-between gap-3 border-b border-border pb-2">
		<h2 class="font-mono text-xs uppercase tracking-wide text-textPrimary">{title}</h2>
		<div class="flex items-center gap-2">
			{#if subtitle}
				<span class="font-mono text-[11px] text-textMuted">{subtitle}</span>
			{/if}
			<button
				type="button"
				class="inline-flex h-5 w-5 items-center justify-center rounded-sm border border-border bg-panelAlt font-mono text-[12px] leading-none text-textMuted hover:border-mutedGold hover:text-mutedGold"
				aria-label={`Configure ${title} panel`}
			>
				<span aria-hidden="true">⋮</span>
			</button>
		</div>
	</div>
	{#if fill}
		<div class="min-h-0 flex-1">
			<slot />
		</div>
	{:else}
		<slot />
	{/if}
</section>
