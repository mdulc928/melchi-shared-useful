<script lang="ts" generics="T">
	import { DropdownMenu } from 'bits-ui';
	import ChevronDownIcon from '$lib/components/ui/icons/ChevronDownIcon.svelte';
	import type { Snippet } from 'svelte';

	type DropdownProps = {
		items?: T[];
		defaultText?: string;
		selected: T | undefined;
		onSelect?: (item: T) => void;
		disabled?: boolean;
		triggerClass?: string;
		contentClass?: string;
		itemClass?: string;
		children?: Snippet;
		renderTrigger?: Snippet<[T | undefined, string]>;
		renderOption?: Snippet<[T, number]>;
		getOptionLabel?: (item: T) => string;
		getOptionValue?: (item: T) => string;
		getOptionIsDisabled?: (item: T) => boolean;
	};

	let {
		items = [] as T[],
		defaultText = 'Select an option',
		selected = $bindable<T>(),
		onSelect = () => {},
		disabled = false,
		triggerClass = '',
		contentClass = '',
		itemClass = '',
		children,
		renderTrigger = undefined as Snippet<[T | undefined, string]> | undefined,
		renderOption = undefined as Snippet<[T, number]> | undefined,
		getOptionLabel,
		getOptionValue,
		getOptionIsDisabled = () => false
	}: DropdownProps = $props();

	function handleSelect(item: T) {
		selected = item;
		onSelect(item);
	}
</script>

<div class="relative inline-block text-left">
	<DropdownMenu.Root>
		<DropdownMenu.Trigger
			class="inline-flex w-40 justify-between rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:ring-2 focus:ring-blue-500 focus:outline-none dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700 {triggerClass}"
			{disabled}
		>
			{#if children}
				{@render children()}
			{:else if renderTrigger}
				{@render renderTrigger(selected, defaultText)}
			{:else}
				{getOptionLabel?.(selected) || defaultText}
				<ChevronDownIcon class="-mr-1 ml-2" />
			{/if}
		</DropdownMenu.Trigger>

		<DropdownMenu.Content
			class="ring-opacity-5 absolute mt-2 w-40 rounded-md bg-white shadow-lg ring-1 ring-black focus:outline-none dark:bg-gray-800 dark:ring-gray-700 {contentClass}"
			align="start"
		>
			{#each items as item, index (getOptionValue ? getOptionValue(item) : index)}
				<DropdownMenu.Item
					disabled={getOptionIsDisabled(item)}
					onSelect={() => handleSelect(item)}
					class="block cursor-pointer px-4 py-2 text-sm text-gray-700 hover:bg-blue-100 hover:text-blue-900 dark:text-gray-200 dark:hover:bg-blue-900 dark:hover:text-white {getOptionIsDisabled(
						item
					)
						? 'cursor-not-allowed opacity-50'
						: ''} {itemClass}"
				>
					{#if renderOption}
						{@render renderOption(item, index)}
					{:else}
						{getOptionLabel ? getOptionLabel(item) : getOptionValue?.(item)}
					{/if}
				</DropdownMenu.Item>
			{/each}
		</DropdownMenu.Content>
	</DropdownMenu.Root>
</div>
