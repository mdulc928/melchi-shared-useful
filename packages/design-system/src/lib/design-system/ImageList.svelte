<script lang="ts">
	import { cc } from '$lib/utils';
	import TrashIcon from './icons/TrashIcon.svelte';
	import ChevronLeftIcon from './icons/ChevronLeftIcon.svelte';
	import ChevronRightIcon from './icons/ChevronRightIcon.svelte';

	let {
		images = $bindable([]),
		isEditing,
		class: customClasses
	}: { images: string[]; isEditing?: boolean; class?: string } = $props();

	let currentIndex = $state(0);
	let touchStartX = 0;
	let touchEndX = 0;

	function handleTouchStart(e: TouchEvent) {
		touchStartX = e.changedTouches[0].screenX;
	}

	function handleTouchEnd(e: TouchEvent) {
		touchEndX = e.changedTouches[0].screenX;
		handleSwipe();
	}

	function handleSwipe() {
		if (touchStartX - touchEndX > 50) {
			// Swipe Left -> Next
			nextImage();
		}

		if (touchEndX - touchStartX > 50) {
			// Swipe Right -> Previous
			prevImage();
		}
	}

	function nextImage() {
		if (currentIndex < images.length - 1) {
			currentIndex++;
		}
	}

	function prevImage() {
		if (currentIndex > 0) {
			currentIndex--;
		}
	}

	function deleteImage() {
		images.splice(currentIndex, 1);
		// Adjust index if we deleted the last image or the only image
		if (currentIndex >= images.length && currentIndex > 0) {
			currentIndex--;
		}
	}
</script>

<div
	class={cc('relative grid w-full auto-rows-min grid-cols-1 justify-items-center', customClasses)}
>
	<!-- Image Container -->
	<div
		class="relative col-start-1 col-end-1 row-start-1 row-end-1 grid w-full grid-cols-1 transition-all duration-300 ease-in-out"
		ontouchstart={handleTouchStart}
		ontouchend={handleTouchEnd}
	>
		{#each images as image, i (image)}
			<div
				class={cc(
					'col-start-1 col-end-1 row-start-1 row-end-1 flex h-full max-h-[300px] w-full max-w-full items-center justify-center overflow-hidden  rounded-md bg-gray-100 dark:bg-gray-800',
					i === currentIndex ? '' : 'invisible'
				)}
			>
				<enhanced:img
					src={image}
					alt="Image {i + 1}"
					class="h-auto max-h-full w-full max-w-full object-scale-down"
				/>
			</div>
		{/each}
	</div>

	<!-- Index Indicator (Top Right) -->
	{#if images.length > 1}
		<div
			class="col-start-1 col-end-1 row-start-1 row-end-1 m-2 h-fit w-fit justify-self-end rounded-full bg-black/50 px-2 py-1 text-xs font-medium text-white backdrop-blur-sm"
		>
			{currentIndex + 1}/{images.length}
		</div>
	{/if}

	<!-- Delete Button (Edit Mode) -->
	{#if isEditing && images.length > 0}
		<button
			class="col-start-1 col-end-1 row-start-1 row-end-1 flex h-fit w-fit scale-80 items-center gap-1 justify-self-start rounded-2xl bg-red-500/80 p-1.5 text-white backdrop-blur-sm transition-colors hover:bg-red-600"
			onclick={deleteImage}
			aria-label="Delete image"
		>
			<TrashIcon class="h-4 w-4" /> Delete
		</button>
	{/if}

	<!-- Pagination Dots (Bottom) -->
	{#if images.length > 1}
		<div
			class="col-start-1 col-end-1 row-start-2 row-end-2 flex h-fit w-fit items-center justify-center gap-1.5 py-2"
		>
			<button
				class="text-muted-foreground/75 hover:text-foreground transition-colors disabled:opacity-50"
				onclick={prevImage}
				disabled={currentIndex === 0}
				aria-label="Previous image"
			>
				<ChevronLeftIcon class="h-4 w-4" />
			</button>

			{#each images, i (i)}
				<div
					class={cc(
						'h-1.5 w-1.5 rounded-full shadow-sm transition-colors',
						i === currentIndex ? 'bg-blue-500' : 'bg-muted/75'
					)}
				></div>
			{/each}

			<button
				class="text-muted-foreground/75 hover:text-foreground transition-colors disabled:opacity-50"
				onclick={nextImage}
				disabled={currentIndex === images.length - 1}
				aria-label="Next image"
			>
				<ChevronRightIcon class="h-4 w-4" />
			</button>
		</div>
	{/if}

	{#if images.length === 0}
		<div class="flex h-full w-full items-center justify-center bg-gray-100 text-gray-400">
			No images
		</div>
	{/if}
</div>
