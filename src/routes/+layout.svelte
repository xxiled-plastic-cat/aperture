<script lang="ts">
	import { onMount } from 'svelte';

	import '../app.css';
	import { setMarketDataContext } from '$lib/context/marketData';

	const marketData = setMarketDataContext();

	const MARKET_DATA_REFRESH_MS = 3 * 60 * 1000;

	onMount(() => {
		void marketData.refresh();

		const intervalId = setInterval(() => {
			void marketData.refresh({ background: true });
		}, MARKET_DATA_REFRESH_MS);

		return () => {
			clearInterval(intervalId);
		};
	});
</script>

<svelte:head>
	<link rel="icon" href="/aperture-icon.png" type="image/png" />
</svelte:head>

<slot />
