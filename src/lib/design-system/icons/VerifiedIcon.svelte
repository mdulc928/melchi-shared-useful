<script lang="ts">
	import type { SVGAttributes } from 'svelte/elements';
	import { cc } from '$lib/utils';

	let { class: className = '', ...rest }: SVGAttributes<SVGElement> = $props();
</script>

<svg
	class={cc('h-4 w-4', className)}
	viewBox="0 0 20 20"
	fill="currentColor"
	aria-hidden="true"
	{...rest}
>
	<path
		fill-rule="evenodd"
		d="M16.704 5.29a1 1 0 0 1 .006 1.414l-7.07 7.182a1 1 0 0 1-1.44.01L3.29 9.976a1 1 0 1 1 1.42-1.406l3.157 3.19 6.364-6.467a1 1 0 0 1 1.473-.003z"
		clip-rule="evenodd"
	/>
</svg>
