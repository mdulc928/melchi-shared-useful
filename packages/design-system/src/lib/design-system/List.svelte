<script lang="ts" generics="T, V">
	import { cc, isDefined } from '$lib/utils/ubi';
	import type { Snippet } from 'svelte';
	import type { ClassValue } from 'svelte/elements';

	let {
		class: customClasses,
		itemLabelClass,
		renderItem,
		items,
		getItemValue,
		getItemLabel
	}: {
		items: T[];
		/* params: item, index, original arr */
		renderItem?: Snippet<[T, number, T[]]>;
		getItemValue: (item: T) => V;
		getItemLabel?: (item: T) => string;
		class?: string;
		itemLabelClass?: ClassValue;
	} = $props();
</script>

<div class={cc('flex flex-col gap-2', customClasses)}>
	{#each items as item, i (isDefined(getItemValue) ? getItemValue(item) : i)}
		{#if renderItem}
			{@render renderItem(item, i, items)}
		{:else}
			<div class={cc('bg-bg flex rounded p-2', itemLabelClass)}>
				{#if getItemLabel}
					{getItemLabel(item)}
				{:else}
					{getItemValue(item)}
				{/if}
			</div>
		{/if}
	{/each}
</div>
