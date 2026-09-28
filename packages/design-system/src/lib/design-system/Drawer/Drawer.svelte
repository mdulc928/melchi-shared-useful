<script lang="ts">
	import { Dialog } from 'bits-ui';
	import { fade, fly } from 'svelte/transition';
	import { untrack, type Snippet } from 'svelte';
	import CloseIcon from '../icons/CloseIcon.svelte';
	import { getDrawerState } from './drawer-state.svelte.ts';

	type Placement =
		| 'center'
		| 'center-right'
		| 'center-left'
		| 'top-center'
		| 'top-right'
		| 'top-left'
		| 'bottom-center'
		| 'bottom-right'
		| 'bottom-left';

	const placementClasses: Record<Placement, string> = {
		center:
			'min-[650px]:top-0 min-[650px]:bottom-0 min-[650px]:left-0 min-[650px]:right-0 min-[650px]:m-auto',
		'center-right':
			'min-[650px]:top-0 min-[650px]:bottom-0 min-[650px]:right-4 min-[650px]:left-auto min-[650px]:my-auto min-[650px]:mx-0',
		'center-left':
			'min-[650px]:top-0 min-[650px]:bottom-0 min-[650px]:left-4 min-[650px]:right-auto min-[650px]:my-auto min-[650px]:mx-0',
		'top-center':
			'min-[650px]:top-4 min-[650px]:bottom-auto min-[650px]:left-0 min-[650px]:right-0 min-[650px]:mx-auto min-[650px]:my-0',
		'top-right':
			'min-[650px]:top-4 min-[650px]:bottom-auto min-[650px]:right-4 min-[650px]:left-auto min-[650px]:m-0',
		'top-left':
			'min-[650px]:top-4 min-[650px]:bottom-auto min-[650px]:left-4 min-[650px]:right-auto min-[650px]:m-0',
		'bottom-center':
			'min-[650px]:bottom-4 min-[650px]:top-auto min-[650px]:left-0 min-[650px]:right-0 min-[650px]:mx-auto min-[650px]:my-0',
		'bottom-right':
			'min-[650px]:bottom-4 min-[650px]:top-auto min-[650px]:right-4 min-[650px]:left-auto min-[650px]:m-0',
		'bottom-left':
			'min-[650px]:bottom-4 min-[650px]:top-auto min-[650px]:left-4 min-[650px]:right-auto min-[650px]:m-0'
	};

	let {
		open: isOpen = $bindable(false),
		placement = 'center',
		children
	}: { open?: boolean; placement?: Placement; children: Snippet } = $props();

	let isDesktop = $state(false);
	let currentY = $state(0);
	let startY = 0;
	let isDragging = $state(false);
	let hasDragged = false;
	let scrollTop = $state(0);
	let contentRef: HTMLDivElement | undefined = $state();
	const appState = getDrawerState();

	$effect(() => {
		if (isOpen) {
			untrack(() => appState.activeDrawers++);
			return () => {
				untrack(() => appState.activeDrawers--);
			};
		}
	});

	$effect(() => {
		const mq = window.matchMedia('(min-width: 650px)');
		isDesktop = mq.matches;

		const handler = (e: MediaQueryListEvent) => {
			isDesktop = e.matches;
		};

		mq.addEventListener('change', handler);
		return () => mq.removeEventListener('change', handler);
	});

	function handleTouchStart(e: TouchEvent) {
		if (isDesktop) return;
		startY = e.touches[0].clientY;
		hasDragged = false;
	}

	function handleTouchMove(e: TouchEvent) {
		if (isDesktop) return;

		const y = e.touches[0].clientY;
		const delta = y - startY;

		if (!isDragging) {
			if (delta > 10 && scrollTop === 0) {
				isDragging = true;
				hasDragged = true;
			}
		}

		if (isDragging) {
			if (delta > 0) {
				currentY = delta;
			}
		}
	}

	function handleTouchEnd() {
		if (isDesktop) return;

		if (isDragging) {
			isDragging = false;
			if (currentY > 150) {
				isOpen = false;
			}
			currentY = 0;
		}
	}
</script>

<Dialog.Root bind:open={isOpen}>
	<Dialog.Portal>
		<Dialog.Overlay forceMount>
			{#snippet child({ props, open })}
				{#if open}
					<div
						{...props}
						transition:fade={{ duration: 150 }}
						class="fixed inset-0 z-50 bg-stone-200/50 dark:bg-black/80"
					></div>
				{/if}
			{/snippet}
		</Dialog.Overlay>
		<Dialog.Content forceMount>
			{#snippet child({ props, open })}
				{#if open}
					<div
						{...props}
						bind:this={contentRef}
						transition:fly={{
							y: !isDesktop || placement.startsWith('bottom') ? '100%' : 50,
							duration: 300,
							opacity: 1
						}}
						class="bg-tan-100 dark:bg-bg fixed inset-x-0 bottom-0 z-50 flex h-auto max-h-[90%] flex-col rounded-t-[10px] border border-gray-200 outline-none min-[650px]:h-fit min-[650px]:max-h-[calc(100vh-2rem)] min-[650px]:w-full min-[650px]:max-w-md min-[650px]:rounded-[10px] min-[650px]:shadow-lg dark:border-gray-800 {placementClasses[
							placement
						]}"
						ontouchstart={handleTouchStart}
						ontouchmove={handleTouchMove}
						ontouchend={handleTouchEnd}
						style:transform={!isDesktop && currentY > 0 ? `translateY(${currentY}px)` : undefined}
					>
						<div
							class="flex w-full cursor-pointer justify-center pt-4 pb-2 min-[650px]:hidden"
							onclick={() => {
								if (!hasDragged) {
									isOpen = false;
								}
							}}
							onkeydown={(e) => {
								if (e.key === 'Enter' || e.key === ' ') {
									e.preventDefault();
									isOpen = false;
								}
							}}
							role="button"
							tabindex="0"
							aria-label="Close drawer"
						>
							<div class="h-1.5 w-[100px] shrink-0 rounded-full bg-gray-400 dark:bg-gray-600"></div>
						</div>
						<div class="flex justify-end px-4 py-2">
							<Dialog.Close
								class="ring-offset-background focus:ring-ring data-[state=open]:text-muted-foreground rounded-sm opacity-70 transition-opacity hover:opacity-100 hover:ring-2 hover:ring-offset-2 focus:outline-none disabled:pointer-events-none"
							>
								<CloseIcon class="h-8 w-8" />
								<span class="sr-only">Close</span>
							</Dialog.Close>
						</div>
						<div
							class="hide-scrollbar flex-1 overflow-y-auto overscroll-contain px-4 pb-4"
							onscroll={(e) => (scrollTop = e.currentTarget.scrollTop)}
						>
							{@render children()}
						</div>
					</div>
				{/if}
			{/snippet}
		</Dialog.Content>
	</Dialog.Portal>
</Dialog.Root>
