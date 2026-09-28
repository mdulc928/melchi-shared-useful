<script lang="ts">
	import { getToastConfig, dismissToast } from './toaster.svelte';
	import { fly, fade } from 'svelte/transition';
	import { quintOut } from 'svelte/easing';
	import { Portal } from 'bits-ui';
	import { cc } from '$lib/utils/ubi';
	import CloseIcon from '../icons/CloseIcon.svelte';
	import CheckIcon from '../icons/CheckIcon.svelte';

	let toastConfig = $derived(getToastConfig());

	// Map toast types to appropriate Tailwind classes
	const typeStyles = {
		success: {
			bg: 'bg-green-50 dark:bg-green-600/20',
			border: 'border-green-200 dark:border-green-800',
			text: 'text-fg',
			iconBg: 'bg-green-100 text-green-600 dark:bg-green-600/20 dark:text-green-400'
		},
		error: {
			bg: 'bg-red-50 dark:bg-red-600/20',
			border: 'border-red-200 dark:border-red-900/20',
			text: 'text-fg',
			iconBg: 'bg-red-100 text-red-600 dark:bg-red-600/20 dark:text-red-400'
		},
		info: {
			bg: 'bg-blue-50 dark:bg-blue-600/20',
			border: 'border-blue-200 dark:border-blue-800',
			text: 'text-fg',
			iconBg: 'bg-blue-100 text-blue-600 dark:bg-blue-600/20 dark:text-blue-400'
		},
		warning: {
			bg: 'bg-amber-50 dark:bg-amber-600/20',
			border: 'border-amber-200 dark:border-amber-800',
			text: 'text-fg',
			iconBg: 'bg-amber-100 text-amber-600 dark:bg-amber-900/50 dark:text-amber-400'
		}
	};
</script>

{#if toastConfig !== undefined}
	<Portal>
		<div
			class="fixed top-4 right-4 left-4 z-100 flex flex-col gap-2 md:top-4 md:right-4 md:bottom-auto md:left-auto md:w-full md:max-w-[420px]"
		>
			<div
				class={cc(
					'relative flex w-full items-center gap-4 overflow-hidden rounded-xl border p-4 shadow-lg backdrop-blur-md',
					typeStyles[toastConfig.type].bg,
					typeStyles[toastConfig.type].border,
					typeStyles[toastConfig.type].text
				)}
				in:fly={{ y: -20, duration: 300, easing: quintOut }}
				out:fade={{ duration: 200 }}
			>
				<div
					class={cc(
						'flex h-10 w-10 shrink-0 items-center justify-center rounded-full',
						typeStyles[toastConfig.type].iconBg
					)}
				>
					{#if toastConfig.type === 'success'}
						<CheckIcon class="h-5 w-5" />
					{:else if toastConfig.type === 'error'}
						<CloseIcon class="h-5 w-5" />
					{:else if toastConfig.type === 'info'}
						<span class="text-xl font-bold">i</span>
					{:else if toastConfig.type === 'warning'}
						<span class="text-xl font-bold">!</span>
					{/if}
				</div>

				<div class="flex-1">
					{#if toastConfig.message}
						<p class="text-sm font-semibold">{toastConfig.message}</p>
					{/if}
					{#if toastConfig.content}
						{@render toastConfig.content()}
					{/if}
				</div>

				<button
					onclick={() => dismissToast()}
					class="text-muted hover:text-fg rounded-lg p-1 transition-colors hover:bg-black/5 dark:hover:bg-white/10"
					aria-label="Dismiss"
				>
					<CloseIcon class="h-4 w-4" />
				</button>
			</div>
		</div>
	</Portal>
{/if}
