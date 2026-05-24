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
		d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16Zm-1.707-5.707a1 1 0 1 0 1.414 1.414L10 11.414l.293.293a1 1 0 1 0 1.414-1.414L11.414 10l.293-.293a1 1 0 1 0-1.414-1.414L10 8.586l-.293-.293a1 1 0 1 0-1.414 1.414L8.586 10l-.293.293Z"
		clip-rule="evenodd"
	/>
</svg>
