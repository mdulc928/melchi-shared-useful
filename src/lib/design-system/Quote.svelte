<script lang="ts">
	import type { Snippet } from 'svelte';
	import { cc } from '$lib/utils';

	let { children, class: className = '' }: { children: Snippet; class?: string } = $props();
</script>

<div class={cc('my-8 border-l-2 border-black pl-6 dark:border-white', className)}>
	<p class="text-xl font-medium text-black italic dark:text-white">
		{@render children()}
	</p>
</div>
