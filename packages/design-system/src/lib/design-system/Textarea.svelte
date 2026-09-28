<script lang="ts">
	import type { HTMLTextareaAttributes } from 'svelte/elements';
	import { cc } from '$lib/utils';

	let {
		class: className = '',
		value = $bindable(),
		textareaRef = $bindable<HTMLTextAreaElement>(),
		...rest
	}: HTMLTextareaAttributes & {
		textareaRef?: HTMLTextAreaElement;
	} = $props();
</script>

<textarea
	class={cc('w-full rounded-xl border-0 bg-transparent ring-0 outline-none', className)}
	bind:value
	bind:this={textareaRef}
	{...rest}
></textarea>
