<script lang="ts">
	import type { SVGAttributes } from 'svelte/elements';
	import { cc } from '$lib/utils';

	let { class: className = '', ...rest }: SVGAttributes<SVGElement> = $props();
</script>

<svg
	class={cc('h-5 w-5', className)}
	xmlns="http://www.w3.org/2000/svg"
	viewBox="0 0 20 20"
	fill="currentColor"
	aria-hidden="true"
	{...rest}
>
	<path
		fill-rule="evenodd"
		d="M14.77 12.79a.75.75 0 01-1.06-.02L10 9.06l-3.71 3.75a.75.75 0 01-1.06-1.06l4.25-4.25a.75.75 0 011.06 0l4.25 4.25a.75.75 0 01-.02 1.06z"
		clip-rule="evenodd"
	/>
</svg>
