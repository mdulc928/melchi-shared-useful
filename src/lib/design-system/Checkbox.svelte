<script lang="ts">
	import type { HTMLInputAttributes } from 'svelte/elements';
	import { cc } from '$lib/utils';

	let { class: className = '', checked = $bindable(), ...rest }: HTMLInputAttributes = $props();
</script>

<input
	type="checkbox"
	class={cc(
		'focus:ring-opacity-50 rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200',
		className
	)}
	bind:checked
	{...rest}
/>
