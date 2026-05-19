<script lang="ts">
	export let message: string | null = null;
</script>

{#if message}
	<div
		class="border-b border-amber/40 bg-amber/10 px-4 py-2 font-mono text-[11px] text-amber"
		role="status"
	>
		<span aria-hidden="true">⚠️</span>
		{message}
	</div>
{/if}
