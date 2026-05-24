<script lang="ts">
	import type { Snippet } from 'svelte';
	import { cc } from '$lib/utils';

	let {
		children,
		class: className = '',
		subtitleClass
	}: { children: Snippet; class?: string; subtitleClass?: string } = $props();
</script>

<div class="flex w-full flex-col items-start gap-2">
	<a
		href="/auth"
		class={cc(
			'group/btn relative inline-flex h-14 w-auto items-center justify-center rounded-md border border-black bg-black px-8 text-left text-lg font-bold text-white transition-all hover:bg-transparent hover:text-black dark:border-white dark:bg-white dark:text-black dark:hover:text-white',
			className
		)}
	>
		{@render children()}
	</a>
	<p
		class={cc(
			'w-full text-left text-[10px] tracking-widest text-gray-400 uppercase dark:text-gray-500',
			subtitleClass
		)}
	>
		Cancel anytime
	</p>
</div>
