<script lang="ts">
	import type { SVGAttributes } from 'svelte/elements';
	import { cc } from '$lib/utils';

	let { class: customClass = '', ...rest }: SVGAttributes<SVGElement> = $props();
</script>

<svg
	class={cc('h-8 w-auto', customClass)}
	xmlns="http://www.w3.org/2000/svg"
	viewBox="-20 0 200 60"
	fill="currentColor"
	{...rest}
>
	<!-- G -->
	<path
		d="M8 30 C8 16 17 8 30 8 C38 8 44 11 48 16 L42 24 C39 21 35 18 30 18 C22 18 18 24 18 30 C18 36 22 42 30 42 C34 42 37 41 37 41 V34 H30 V26 H47 V46 C47 46 40 52 30 52 C17 52 8 44 8 30 Z"
	/>
	<!-- T -->
	<path d="M52 10 H82 V20 H72 V50 H62 V20 H52 V10 Z" />
	<!-- t (lowercase) -->
	<path
		d="M88 18 H94 V24 H102 V32 H94 V40 C94 43 95 44 98 44 C99.5 44 101 43.5 102 43 V51 C100 52 97 53 93 53 C86 53 84 49 84 42 V32 H80 V24 H84 V18 H88 V18 Z"
	/>
	<!-- R -->
	<path
		d="M108 10 H130 C142 10 150 17 150 28 C150 35 146 40 140 43 L152 50 H140 L130 44 H118 V50 H108 V10 Z M128 34 C134 34 138 31 138 28 C138 24 134 22 128 22 H118 V34 H128 Z"
	/>
</svg>
