<script lang="ts">
	import { onMount } from 'svelte';

	import '../app.css';
	import { setMarketDataContext } from '$lib/context/marketData';

	const marketData = setMarketDataContext();

	onMount(() => {
		void marketData.refresh();
	});
</script>

<svelte:head>
	<link rel="icon" href="/aperture-icon.png" type="image/png" />
</svelte:head>

<slot />
