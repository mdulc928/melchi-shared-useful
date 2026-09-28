<script lang="ts">
	import type { HTMLInputAttributes } from 'svelte/elements';
	import { cc } from '$lib/utils';
	import { focusClasses } from './constants';

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
		'border-border bg-bg text-fg w-full rounded-xl border p-2 placeholder:text-gray-500/90',
		focusClasses,
		className
	)}
	bind:value
	bind:this={inputRef}
	{...rest}
/>
