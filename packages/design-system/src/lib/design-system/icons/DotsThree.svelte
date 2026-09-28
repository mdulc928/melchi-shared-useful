<script lang="ts">
	import type { SVGAttributes } from 'svelte/elements';
	import { cc } from '$lib/utils';

	let { class: customClasses, ...rest }: SVGAttributes<SVGElement> = $props();
</script>

<svg
	xmlns="http://www.w3.org/2000/svg"
	fill="currentColor"
	viewBox="0 0 256 256"
	class={cc('h-6 w-6', customClasses)}
	{...rest}
>
	<path
		d="M140,128a12,12,0,1,1-12-12A12,12,0,0,1,140,128ZM84,116a12,12,0,1,0,12,12A12,12,0,0,0,84,116Zm88,0a12,12,0,1,0,12,12A12,12,0,0,0,172,116Z"
	></path>
</svg>
