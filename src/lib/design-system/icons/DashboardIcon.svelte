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
	fill="currentColor"
	stroke="currentColor"
	stroke-width="2"
	stroke-linecap="round"
	stroke-linejoin="round"
	{...rest}
>
	<rect width="7" height="9" x="3" y="3" rx="1" />
	<rect width="7" height="5" x="14" y="3" rx="1" />
	<rect width="7" height="9" x="14" y="12" rx="1" />
	<rect width="7" height="5" x="3" y="16" rx="1" />
</svg>
