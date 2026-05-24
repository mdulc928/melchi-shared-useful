<script lang="ts">
	import type { HTMLInputAttributes } from 'svelte/elements';
	import { cc } from '$lib/utils';
	import { focusClasses } from '../dashboard/things/constants';

	let {
		class: className = '',
		value = $bindable(),
		inputRef = $bindable<HTMLInputElement>(),
		...rest
	}: HTMLInputAttributes & {
		inputRef?: HTMLInputElement;
	} = $props();
</script>

<input
	class={cc(
		'w-full rounded-xl border border-border bg-bg p-2 text-fg placeholder:text-gray-500/90',
		focusClasses,
		className
	)}
	bind:value
	bind:this={inputRef}
	{...rest}
/>
