<script lang="ts">
	import type { SVGAttributes } from 'svelte/elements';
	import { cc } from '$lib/utils';

	let { class: className = '', ...rest }: SVGAttributes<SVGElement> = $props();
</script>

<svg
	class={cc('h-4 w-4', className)}
	xmlns="http://www.w3.org/2000/svg"
	width="18"
	height="18"
	viewBox="0 0 24 24"
	fill="none"
	stroke="currentColor"
	stroke-width="2"
	stroke-linecap="round"
	stroke-linejoin="round"
	{...rest}
>
	<path d="M12 10c-2 0-3-1-3-3 0-2 1.5-4 3-5 1.5 1 3 3 3 5 0 2-1 3-3 3z" />
	<path d="M8.5 14c-1.5-1-2.5-2.5-2.5-5 0 4 3 7 6 9 3-2 6-5 6-9 0 2.5-1 4-2.5 5" />
	<path d="M12 10v12" />
</svg>
