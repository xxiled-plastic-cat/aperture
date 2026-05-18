<script lang="ts">
	let value = '';
	const promptPrefix = 'aperture@terminal:~$';
</script>

<div class="rounded-sm border border-border bg-panel p-3">
	<p class="mb-2 font-mono text-[11px] uppercase tracking-wide text-textMuted">Query Terminal</p>
	<div class="flex items-center rounded-sm border border-border bg-panelAlt px-3 py-2">
		<span class="mr-2 shrink-0 font-mono text-xs text-textMuted">{promptPrefix}</span>
		<input
			id="terminal-command"
			class="min-w-0 flex-1 bg-transparent font-mono text-xs text-textPrimary outline-none"
			bind:value
			placeholder=""
			spellcheck="false"
			autocomplete="off"
		/>
	</div>
</div>
