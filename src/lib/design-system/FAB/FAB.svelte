<script lang="ts">
	import { Portal, Popover, Tooltip } from 'bits-ui';
	import Button from '../Button.svelte';
	import List from '../List.svelte';
	import Drawer from '../Drawer/Drawer.svelte';
	import { getPortedElements, addToDockPort, clearDockElements } from './portable.svelte';
	import DotsThree from '../icons/DotsThree.svelte';
	import { fly } from 'svelte/transition';
	import { getDrawerState } from '../Drawer/drawer-state.svelte';

	const drawerState = getDrawerState();

	let portedElements = $derived(getPortedElements());
	// Convert to array
	let items = $derived(
		Array.from(portedElements.entries()).map(([key, value]) => ({ key, ...value }))
	);

	let activeElementDock = $state<HTMLElement | null>(null);
	let openDrawer = $state(false);

	// Logic for single item
	let singleItem = $derived(items.length === 1 ? items[0] : null);
	let currentKey = $state<string | null>(null);

	function openItem(key: string) {
		currentKey = key;
		openDrawer = true;
	}

	$effect(() => {
		if (openDrawer && activeElementDock && currentKey) {
			clearDockElements();
			addToDockPort(currentKey, activeElementDock);
		} else if (!openDrawer) {
			clearDockElements();
			currentKey = null;
		}
	});
</script>

{#if items.length > 0}
	{#if drawerState.activeDrawers === 0}
		<!-- FAB Container -->
		<Portal>
			<Tooltip.Provider>
				<div
					class="fixed right-6 bottom-6 z-50 flex flex-col items-end gap-2"
					transition:fly={{ y: 20 }}
				>
					{#if items.length > 1}
						<Popover.Root>
							<Tooltip.Root>
								<Popover.Trigger>
									{#snippet child({ props: popoverProps })}
										<Tooltip.Trigger>
											{#snippet child({ props: tooltipProps })}
												<Button
													{...tooltipProps}
													{...popoverProps}
													size="icon"
													class="bg-tan-100/80 text-fg hover:bg-tan-100/95 dark:bg-bg/80 dark:hover:bg-bg/95 h-14 w-14 rounded-2xl border border-border/40 shadow-lg transition-all"
												>
													<DotsThree class="h-6 w-6" />
												</Button>
											{/snippet}
										</Tooltip.Trigger>
									{/snippet}
								</Popover.Trigger>
								<Tooltip.Content side="left" sideOffset={8}>
									<div
										class="bg-bg text-fg rounded border border-border px-2 py-1 text-xs shadow-sm"
									>
										Options
									</div>
								</Tooltip.Content>
							</Tooltip.Root>
							<Popover.Content
								class="z-50 w-56 rounded-lg border border-border bg-card/70 p-0 shadow-xl"
								sideOffset={8}
								collisionPadding={{
									right: 8
								}}
							>
								<List {items} getItemValue={(i) => i.key} class="gap-0 p-1">
									{#snippet renderItem(item)}
										<button
											class="flex w-full items-center gap-3 rounded-md p-2 text-left text-sm transition-colors hover:bg-gray-200/70 dark:hover:bg-gray-600/70"
											onclick={() => openItem(item.key)}
										>
											<div
												class="flex h-8 w-8 items-center justify-center rounded-full bg-muted/20"
											>
												<item.metadata.icon class="h-4 w-4" />
											</div>
											<span class="font-medium">{item.metadata.label}</span>
										</button>
									{/snippet}
								</List>
							</Popover.Content>
						</Popover.Root>
					{:else if singleItem}
						<Tooltip.Root>
							<Tooltip.Trigger>
								{#snippet child({ props })}
									<Button
										{...props}
										size="icon"
										onclick={() => openItem(singleItem!.key)}
										class="bg-tan-100/80 text-fg hover:bg-tan-100/95 dark:bg-bg/80 dark:hover:bg-bg/95 h-14 w-14 rounded-2xl border border-border/40 shadow-lg transition-all"
									>
										<singleItem.metadata.icon class="h-6 w-6" />
									</Button>
								{/snippet}
							</Tooltip.Trigger>
							<Tooltip.Content side="left" align="center" sideOffset={8}>
								<div
									class="bg-tan-100/80 text-fg dark:bg-bg/80 rounded border border-border px-2 py-1 text-xs shadow-sm"
								>
									{singleItem?.metadata.label}
								</div>
							</Tooltip.Content>
						</Tooltip.Root>
					{/if}
				</div>
			</Tooltip.Provider>
		</Portal>
	{/if}

	<Drawer bind:open={openDrawer}>
		<div bind:this={activeElementDock} class="h-full w-full"></div>
	</Drawer>
{/if}
