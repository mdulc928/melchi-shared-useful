<script lang="ts" generics="T extends { id: string }">
	import { Collapsible } from 'bits-ui';
	import type { Snippet } from 'svelte';
	import { cc } from '$lib/utils/ubi';
	import ChevronDownIcon from './icons/ChevronDownIcon.svelte';

	let {
		title,
		groupItems,
		children,
		triggerClass
	}: {
		title: string;
		groupItems: T[];
		children: Snippet<[T]>;
		triggerClass?: string;
	} = $props();
	let open = $state(true);
</script>

<Collapsible.Root bind:open class="mb-6">
	<Collapsible.Trigger
		class={cc(
			'group sticky top-14 z-10 mb-2 flex w-full items-center justify-between gap-2 text-base font-medium text-amber-800 backdrop-blur-sm transition-colors hover:text-amber-400 dark:text-amber-400/60',
			{ 'py-2': open },
			triggerClass
		)}
	>
		<div class="flex min-w-0 items-center gap-2">
			<span class="truncate">{title}</span>
			<span class="text-muted-foreground/50 shrink-0 text-sm font-normal"
				>({groupItems.length})</span
			>
		</div>
		<ChevronDownIcon class="shrink-0 group-data-[state=open]:rotate-180" />
	</Collapsible.Trigger>
	<Collapsible.Content>
		<ul class="divide-border border-border divide-y rounded-xl border">
			{#each groupItems as item (item.id)}
				{@render children(item)}
			{/each}
		</ul>
	</Collapsible.Content>
</Collapsible.Root>
