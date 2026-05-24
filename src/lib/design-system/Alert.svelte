<script lang="ts">
	import { type Snippet } from 'svelte';
	let {
		children
	}: {
		children: Snippet<[]>;
	} = $props();
</script>

<div class="mb-6 border-l-4 border-yellow-500 bg-yellow-100 p-4 text-yellow-700" role="alert">
	{@render children()}
</div>
