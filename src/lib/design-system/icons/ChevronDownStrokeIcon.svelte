<script lang="ts">
	import type { SVGAttributes } from 'svelte/elements';
	import { cc } from '$lib/utils';

	let { class: className = '', ...rest }: SVGAttributes<SVGElement> = $props();
</script>

<svg
	class={cc('text-muted-foreground h-5 w-5', className)}
	xmlns="http://www.w3.org/2000/svg"
	width="24"
	height="24"
	viewBox="0 0 24 24"
	fill="currentColor"
	stroke="currentColor"
	stroke-width="2"
	stroke-linecap="round"
	stroke-linejoin="round"
	{...rest}
>
	<path d="m6 9 6 6 6-6" />
</svg>
