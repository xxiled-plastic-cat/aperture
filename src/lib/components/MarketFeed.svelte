<script lang="ts">
	export let events: string[] = [];
</script>

<ul class="h-36 space-y-1 overflow-y-auto rounded-sm border border-border bg-panelAlt p-2 font-mono text-[11px]">
	{#each events as event}
		<li class="border-b border-border/60 pb-1 text-textSecondary last:border-b-0">
			{event}
		</li>
	{/each}
</ul>
